import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { entitlementsService } from "@/features/auth/domain/entitlements/EntitlementsService";
import { serverDatabaseService } from "@/infrastructure/db/database-service";
import { userEntitlementCache } from "@/infrastructure/redis";
import { idempotencyStore } from "@/infrastructure/webhooks/IdempotencyStore";
import type { UserEntitlementLevel } from "@/types";

export interface StripeWebhookResponse {
	status: number;
	body: Record<string, unknown>;
}

/**
 * Main entry point for processing Stripe webhook requests.
 * Handles idempotency, signature verification, and event dispatch.
 */
export async function handleStripeWebhookRequest(
	request: NextRequest,
): Promise<StripeWebhookResponse> {
	try {
		const eventId =
			request.headers.get("stripe-event-id") ??
			request.headers.get("stripe-signature") ??
			"unknown";
		if (!idempotencyStore.tryCreate(eventId, 5 * 60 * 1000)) {
			return { body: { ok: true, idempotent: true }, status: 200 };
		}

		const body = await request.text();
		const signature = request.headers.get("stripe-signature");

		if (!signature) {
			return { body: { error: "Missing stripe signature" }, status: 400 };
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
			apiVersion: "2025-09-30.clover",
		});

		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
		if (!webhookSecret) {
			console.error("STRIPE_WEBHOOK_SECRET not configured");
			return { body: { error: "Webhook secret not configured" }, status: 500 };
		}

		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch (err) {
			console.error("Webhook signature verification failed:", err);
			return { body: { error: "Invalid signature" }, status: 400 };
		}

		if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;
			const userId = (session.client_reference_id ??
				session.metadata?.userId) as string | undefined;
			if (userId) {
				entitlementsService.grantPractice(userId);
			}
		}

		const result = await processStripeEvent(event);

		return {
			body: {
				eventId: event.id,
				eventType: event.type,
				message: result.message,
				processed: result.success,
				received: true,
				timestamp: new Date().toISOString(),
			},
			status: result.success ? 200 : 500,
		};
	} catch (error) {
		console.error("Stripe webhook error:", error);
		return { body: { error: "Internal server error" }, status: 500 };
	}
}

async function processStripeEvent(event: Stripe.Event): Promise<{
	success: boolean;
	message: string;
}> {
	try {
		switch (event.type) {
			case "customer.subscription.created":
				return await handleSubscriptionCreated(
					event.data.object as Stripe.Subscription,
				);

			case "customer.subscription.updated":
				return await handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription,
				);

			case "customer.subscription.deleted":
				return await handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
				);

			case "invoice.payment_succeeded":
				return await handlePaymentSucceeded(
					event.data.object as Stripe.Invoice,
				);

			case "invoice.payment_failed":
				return await handlePaymentFailed(event.data.object as Stripe.Invoice);

			default:
				console.log(`Unhandled event type: ${event.type}`);
				return {
					message: `Event type ${event.type} not handled`,
					success: true,
				};
		}
	} catch (error) {
		console.error("Error processing Stripe event:", error);
		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

async function handleSubscriptionCreated(
	subscription: Stripe.Subscription,
): Promise<{ success: boolean; message: string }> {
	try {
		const customerId = subscription.customer as string;
		const entitlementLevel = mapPriceToEntitlement(
			subscription.items.data[0]?.price.id,
		);

		if (!entitlementLevel) {
			return {
				message: "Unknown subscription plan",
				success: false,
			};
		}

		const updateResult = await serverDatabaseService.update(
			"users",
			customerId,
			{
				entitlement_level: entitlementLevel,
				stripe_customer_id: customerId,
				updated_at: new Date().toISOString(),
			},
		);

		if (!updateResult.success) {
			return {
				message: `Failed to update user entitlement: ${updateResult.error}`,
				success: false,
			};
		}

		await userEntitlementCache.set(customerId, entitlementLevel);

		return {
			message: `Subscription created for customer ${customerId} with ${entitlementLevel} access`,
			success: true,
		};
	} catch (error) {
		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

async function handleSubscriptionUpdated(
	subscription: Stripe.Subscription,
): Promise<{ success: boolean; message: string }> {
	try {
		const customerId = subscription.customer as string;
		const entitlementLevel = mapPriceToEntitlement(
			subscription.items.data[0]?.price.id,
		);

		if (!entitlementLevel) {
			return {
				message: "Unknown subscription plan",
				success: false,
			};
		}

		const updateResult = await serverDatabaseService.update(
			"users",
			customerId,
			{
				entitlement_level: entitlementLevel,
				updated_at: new Date().toISOString(),
			},
		);

		if (!updateResult.success) {
			return {
				message: `Failed to update user entitlement: ${updateResult.error}`,
				success: false,
			};
		}

		await userEntitlementCache.set(customerId, entitlementLevel);

		return {
			message: `Subscription updated for customer ${customerId} with ${entitlementLevel} access`,
			success: true,
		};
	} catch (error) {
		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

async function handleSubscriptionDeleted(
	subscription: Stripe.Subscription,
): Promise<{ success: boolean; message: string }> {
	try {
		const customerId = subscription.customer as string;

		const updateResult = await serverDatabaseService.update(
			"users",
			customerId,
			{
				entitlement_level: "FREE",
				updated_at: new Date().toISOString(),
			},
		);

		if (!updateResult.success) {
			return {
				message: `Failed to update user entitlement: ${updateResult.error}`,
				success: false,
			};
		}

		await userEntitlementCache.set(customerId, "FREE");

		return {
			message: `Subscription cancelled for customer ${customerId}`,
			success: true,
		};
	} catch (error) {
		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

async function handlePaymentSucceeded(
	invoice: Stripe.Invoice,
): Promise<{ success: boolean; message: string }> {
	try {
		const customerId = invoice.customer as string;
		const amountPaid = (invoice.amount_paid || 0) / 100;

		await serverDatabaseService.update("users", customerId, {
			last_payment_at: new Date().toISOString(),
			last_payment_amount: amountPaid,
		});

		return {
			message: `Payment succeeded for customer ${customerId}`,
			success: true,
		};
	} catch (error) {
		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

async function handlePaymentFailed(
	invoice: Stripe.Invoice,
): Promise<{ success: boolean; message: string }> {
	try {
		const customerId = invoice.customer as string;

		await serverDatabaseService.update("users", customerId, {
			last_payment_failed_at: new Date().toISOString(),
		});

		return {
			message: `Payment failed for customer ${customerId}`,
			success: true,
		};
	} catch (error) {
		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

function mapPriceToEntitlement(priceId?: string): UserEntitlementLevel {
	switch (priceId) {
		case process.env.STRIPE_PRICE_PRO_MONTHLY:
			return "PRO";
		case process.env.STRIPE_PRICE_TEAM_MONTHLY:
			return "PRO";
		default:
			return "PRO";
	}
}
