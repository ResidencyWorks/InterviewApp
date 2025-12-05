import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { stripeIdempotencyStore } from "@/features/billing/infrastructure/stripe/StripeIdempotencyStore";
import { getPostHogClient } from "@/infrastructure/config/clients";
import { env } from "@/infrastructure/config/environment";
import { serverDatabaseService } from "@/infrastructure/db/database-service";
import { userEntitlementCache } from "@/infrastructure/redis";
import { captureException } from "@/shared/error/ErrorTrackingService";
import type { UserEntitlementLevel } from "@/types";

export interface StripeWebhookResponse {
	status: number;
	body: Record<string, unknown>;
}

/**
 * Main entry point for processing Stripe webhook requests.
 * Handles idempotency, signature verification, and event dispatch.
 */
/**
 * Main entry point for processing Stripe webhook requests.
 * Handles idempotency using Stripe event.id, signature verification, and event dispatch.
 * @param request - Next.js request object with raw body
 * @returns Promise resolving to StripeWebhookResponse
 */
export async function handleStripeWebhookRequest(
	request: NextRequest,
): Promise<StripeWebhookResponse> {
	try {
		// Get raw body for signature verification (must be raw, not parsed JSON)
		const body = await request.text();
		const signature = request.headers.get("stripe-signature");

		if (!signature) {
			return { body: { error: "Missing stripe signature" }, status: 400 };
		}

		const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "", {
			apiVersion: "2025-11-17.clover",
		});

		const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
		if (!webhookSecret) {
			console.error("STRIPE_WEBHOOK_SECRET not configured");
			return { body: { error: "Webhook secret not configured" }, status: 500 };
		}

		// Verify webhook signature
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch (err) {
			console.error("Webhook signature verification failed:", err);

			// Track signature verification failure in Sentry
			captureException(err as Error, {
				tags: {
					component: "stripe-webhook",
					action: "signature_verification",
					error_type: "invalid_signature",
				},
				extra: {
					errorMessage: err instanceof Error ? err.message : String(err),
				},
			});

			return { body: { error: "Invalid signature" }, status: 400 };
		}

		// Check idempotency using Stripe event.id (24-hour TTL)
		const eventId = event.id;
		const idempotent = await stripeIdempotencyStore.tryCreate(
			eventId,
			24 * 60 * 60 * 1000, // 24 hours
		);

		if (!idempotent) {
			// Event already processed - log and return success
			console.log(`Skipped replay: Stripe event ${eventId} already processed`);

			// Track analytics for skipped replay
			const posthog = getPostHogClient();
			if (posthog) {
				posthog.capture({
					distinctId: "system",
					event: "webhook_replay_skipped",
					properties: {
						eventId,
						eventType: event.type,
						timestamp: new Date().toISOString(),
					},
				});
			}

			return { body: { ok: true, idempotent: true }, status: 200 };
		}

		// Process the event
		const result = await processStripeEvent(event);

		// Track analytics for successful webhook processing
		const posthog = getPostHogClient();
		if (posthog && result.success) {
			posthog.capture({
				distinctId: "system",
				event: "webhook_processed",
				properties: {
					eventId: event.id,
					eventType: event.type,
					success: result.success,
					timestamp: new Date().toISOString(),
				},
			});
		}

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

		// Track error in Sentry
		captureException(error as Error, {
			tags: {
				component: "stripe-webhook",
				action: "handle_webhook_request",
			},
			extra: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});

		return { body: { error: "Internal server error" }, status: 500 };
	}
}

/**
 * Process a Stripe webhook event
 * @param event - Stripe event object
 * @returns Promise resolving to processing result
 */
async function processStripeEvent(event: Stripe.Event): Promise<{
	success: boolean;
	message: string;
}> {
	try {
		switch (event.type) {
			case "checkout.session.completed":
				return await handleCheckoutSessionCompleted(
					event.data.object as Stripe.Checkout.Session,
					event.id,
				);

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

		// Track event processing error in Sentry
		captureException(error as Error, {
			tags: {
				component: "stripe-webhook",
				action: "process_event",
				eventType: event.type,
			},
			extra: {
				eventId: event.id,
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});

		return {
			message: error instanceof Error ? error.message : "Unknown error",
			success: false,
		};
	}
}

/**
 * Handle checkout.session.completed event
 * Grants entitlements to user based on checkout session metadata
 * @param session - Stripe checkout session object
 * @param eventId - Stripe event ID for idempotency tracking
 * @returns Promise resolving to processing result
 */
async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
	eventId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		// Extract user ID and entitlement level from session metadata
		const userId = (session.client_reference_id ?? session.metadata?.userId) as
			| string
			| undefined;
		const entitlementLevel = (session.metadata?.entitlementLevel ??
			"PRO") as UserEntitlementLevel;

		if (!userId) {
			return {
				message: "Missing user ID in checkout session",
				success: false,
			};
		}

		// Calculate expiration date (default to 1 year from now for PRO)
		const expiresAt = new Date();
		expiresAt.setFullYear(expiresAt.getFullYear() + 1);

		// Write to database (primary operation)
		const insertResult = await serverDatabaseService.insert(
			"user_entitlements",
			{
				user_id: userId,
				entitlement_level: entitlementLevel,
				expires_at: expiresAt.toISOString(),
				stripe_event_id: eventId,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
		);

		if (!insertResult.success) {
			// Check if it's a duplicate (stripe_event_id unique constraint violation)
			if (
				insertResult.error?.includes("unique") ||
				insertResult.error?.includes("duplicate")
			) {
				console.log(
					`Skipped duplicate entitlement: Stripe event ${eventId} already processed`,
				);
				return {
					message: `Entitlement already granted for event ${eventId}`,
					success: true, // Return success for idempotent duplicate
				};
			}

			// Track database write failure in Sentry
			const errorMessage = insertResult.error ?? "Unknown database error";
			captureException(new Error(errorMessage), {
				tags: {
					component: "stripe-webhook",
					action: "create_entitlement",
					error_type: "database_write_failure",
				},
				extra: {
					userId,
					entitlementLevel,
					eventId,
					error: insertResult.error,
				},
			});

			return {
				message: `Failed to create entitlement: ${errorMessage}`,
				success: false,
			};
		}

		// Write to cache (secondary operation - retry asynchronously on failure)
		// Pass expiresAt to cache so it can check expiration
		try {
			await userEntitlementCache.set(
				userId,
				entitlementLevel,
				expiresAt.toISOString(),
			);
		} catch (cacheError) {
			// Log error but don't fail the request - cache write is secondary
			console.error(
				`Cache write failed for user ${userId}, will retry asynchronously:`,
				cacheError,
			);
			// Retry cache write asynchronously (fire and forget)
			userEntitlementCache
				.set(userId, entitlementLevel, expiresAt.toISOString())
				.catch((retryError) => {
					console.error(
						`Async cache retry failed for user ${userId}:`,
						retryError,
					);
				});
		}

		return {
			message: `Entitlement granted: ${entitlementLevel} for user ${userId}`,
			success: true,
		};
	} catch (error) {
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
