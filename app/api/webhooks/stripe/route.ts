import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { serverDatabaseService } from "@/lib/db/database-service";
import { entitlementsService } from "@/lib/entitlements/EntitlementsService";
import { userEntitlementCache } from "@/lib/redis";
import { idempotencyStore } from "@/lib/webhooks/IdempotencyStore";
import type { UserEntitlementLevel } from "@/types";

/**
 * Stripe webhook handler
 * Processes Stripe events for subscription management and entitlement updates
 * @param request - Next.js request object containing Stripe webhook payload and signature
 * @returns Promise resolving to NextResponse with webhook processing result or error
 */
export async function POST(request: NextRequest) {
	try {
		// Basic idempotency guard (header or derived)
		const eventId =
			request.headers.get("stripe-event-id") ??
			request.headers.get("stripe-signature") ??
			"unknown";
		if (!idempotencyStore.tryCreate(eventId, 5 * 60 * 1000)) {
			return NextResponse.json({ ok: true, idempotent: true });
		}

		const body = await request.text();
		const signature = request.headers.get("stripe-signature");

		if (!signature) {
			return NextResponse.json(
				{ error: "Missing stripe signature" },
				{ status: 400 },
			);
		}

		// Initialize Stripe with webhook secret
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
			apiVersion: "2025-09-30.clover",
		});

		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
		if (!webhookSecret) {
			console.error("STRIPE_WEBHOOK_SECRET not configured");
			return NextResponse.json(
				{ error: "Webhook secret not configured" },
				{ status: 500 },
			);
		}

		// Verify webhook signature
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch (err) {
			console.error("Webhook signature verification failed:", err);
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		// Minimal M0 grant on checkout.session.completed
		if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;
			const userId = (session.client_reference_id ??
				session.metadata?.userId) as string | undefined;
			if (userId) {
				entitlementsService.grantPractice(userId);
			}
		}

		// Process the event (extended handlers)
		const result = await processStripeEvent(event);

		return NextResponse.json({
			eventId: event.id,
			eventType: event.type,
			message: result.message,
			processed: result.success,
			received: true,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Stripe webhook error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * Process different types of Stripe events
 * @param event - Stripe webhook event
 * @returns Promise resolving to processing result
 */
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

/**
 * Handle subscription created event
 * @param subscription - Stripe subscription object
 * @returns Promise resolving to processing result
 */
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

		// Update user entitlement in database
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

		// Cache entitlement in Redis
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

/**
 * Handle subscription updated event
 * @param subscription - Stripe subscription object
 * @returns Promise resolving to processing result
 */
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

		// Update user entitlement in database
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

		// Update entitlement cache in Redis
		await userEntitlementCache.set(customerId, entitlementLevel);

		return {
			message: `Subscription updated for customer ${customerId} to ${entitlementLevel} access`,
			success: true,
		};
	} catch (error) {
		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

/**
 * Handle subscription deleted event
 * @param subscription - Stripe subscription object
 * @returns Promise resolving to processing result
 */
async function handleSubscriptionDeleted(
	subscription: Stripe.Subscription,
): Promise<{ success: boolean; message: string }> {
	try {
		const customerId = subscription.customer as string;

		// Downgrade user to FREE tier
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

		// Update entitlement cache in Redis
		await userEntitlementCache.set(customerId, "FREE");

		return {
			message: `Subscription cancelled for customer ${customerId}, downgraded to FREE access`,
			success: true,
		};
	} catch (error) {
		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

/**
 * Handle successful payment event
 * @param invoice - Stripe invoice object
 * @returns Promise resolving to processing result
 */
async function handlePaymentSucceeded(
	invoice: Stripe.Invoice,
): Promise<{ success: boolean; message: string }> {
	try {
		const customerId = invoice.customer as string;

		// Log successful payment for analytics
		console.log(
			`Payment succeeded for customer ${customerId}, amount: ${invoice.amount_paid}`,
		);

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

/**
 * Handle failed payment event
 * @param invoice - Stripe invoice object
 * @returns Promise resolving to processing result
 */
async function handlePaymentFailed(
	invoice: Stripe.Invoice,
): Promise<{ success: boolean; message: string }> {
	try {
		const customerId = invoice.customer as string;

		// Log failed payment for monitoring
		console.error(
			`Payment failed for customer ${customerId}, amount: ${invoice.amount_due}`,
		);

		// Optionally downgrade user or send notification
		// For now, just log the failure

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

/**
 * Map Stripe price ID to user entitlement level
 * @param priceId - Stripe price ID
 * @returns User entitlement level or null if unknown
 */
function mapPriceToEntitlement(priceId?: string): UserEntitlementLevel | null {
	if (!priceId) return null;

	// Map your Stripe price IDs to entitlement levels
	// These should match your actual Stripe price IDs
	const priceMapping: Record<string, UserEntitlementLevel> = {
		price_pro: "PRO",
		// Add your actual Stripe price IDs here
		price_trial: "TRIAL",
		// Add more mappings as needed
	};

	return priceMapping[priceId] || null;
}
