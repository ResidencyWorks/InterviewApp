/**
 * Stripe checkout adapter
 * Infrastructure adapter implementing ICheckoutRepository using Stripe SDK
 */

import Stripe from "stripe";
import { CheckoutSession } from "@/features/billing/domain/checkout/CheckoutSession";
import type {
	CreateCheckoutSessionParams,
	ICheckoutRepository,
} from "@/features/billing/domain/checkout/interfaces/ICheckoutRepository";
import { env, getAppUrl } from "@/infrastructure/config/environment";

/**
 * Stripe checkout adapter
 * Implements ICheckoutRepository using Stripe SDK
 */
export class StripeCheckoutAdapter implements ICheckoutRepository {
	private readonly stripe: Stripe;

	constructor() {
		const secretKey = env.STRIPE_SECRET_KEY;
		if (!secretKey) {
			throw new Error("STRIPE_SECRET_KEY is not configured");
		}

		this.stripe = new Stripe(secretKey, {
			apiVersion: "2025-11-17.clover",
		});
	}

	/**
	 * Get Stripe price ID for entitlement level from environment
	 * @param entitlementLevel - Entitlement level
	 * @returns Price ID or null if not configured
	 */
	private getPriceIdForEntitlement(entitlementLevel: string): string | null {
		// Check for environment-specific price IDs
		if (entitlementLevel === "PRO") {
			return env.STRIPE_PRO_PRICE_ID || null;
		}
		if (entitlementLevel === "TRIAL") {
			return env.STRIPE_TRIAL_PRICE_ID || null;
		}
		return null;
	}

	/**
	 * Create a checkout session with Stripe
	 * @param params - Parameters for creating the checkout session
	 * @returns Promise resolving to CheckoutSession domain entity
	 * @throws Error if session creation fails
	 */
	async createSession(
		params: CreateCheckoutSessionParams,
	): Promise<CheckoutSession> {
		try {
			const baseUrl = getAppUrl();

			// Get price ID from environment or use default test price
			// For TRIAL, we'll use a $0 price or allow_quantity: 0
			// For PRO, we'll use the configured price ID or a test price
			const priceId = this.getPriceIdForEntitlement(params.entitlementLevel);

			// For TRIAL, use payment mode with $0
			// For PRO, use subscription mode for recurring billing
			const isTrial = params.entitlementLevel === "TRIAL";

			const sessionConfig: Stripe.Checkout.SessionCreateParams = {
				mode: isTrial ? "payment" : "subscription",
				client_reference_id: params.userId,
				metadata: {
					userId: params.userId,
					entitlementLevel: params.entitlementLevel,
				},
				success_url: params.successUrl,
				cancel_url: params.cancelUrl,
			};

			// For TRIAL, create a $0 one-time payment
			if (isTrial) {
				sessionConfig.line_items = [
					{
						price_data: {
							currency: "usd",
							product_data: {
								name: "Pro Trial",
								description: "7-day free trial of Pro features",
							},
							unit_amount: 0, // Free trial
						},
						quantity: 1,
					},
				];
			} else if (priceId) {
				// Use configured price ID for subscription
				sessionConfig.line_items = [
					{
						price: priceId,
						quantity: 1,
					},
				];
			} else {
				// Fallback: create a subscription price on the fly for PRO
				sessionConfig.line_items = [
					{
						price_data: {
							currency: "usd",
							product_data: {
								name: "Pro Plan",
								description: "Monthly subscription to Pro features",
							},
							recurring: {
								interval: "month",
							},
							unit_amount: 2900, // $29.00
						},
						quantity: 1,
					},
				];
			}

			const session = await this.stripe.checkout.sessions.create(sessionConfig);

			if (!session.url) {
				throw new Error("Stripe checkout session created but no URL returned");
			}

			return new CheckoutSession({
				id: session.id,
				userId: params.userId,
				entitlementLevel: params.entitlementLevel,
				url: session.url,
				status: session.status === "complete" ? "complete" : "open",
				createdAt: new Date(session.created * 1000),
				expiresAt: session.expires_at
					? new Date(session.expires_at * 1000)
					: undefined,
			});
		} catch (error) {
			console.error("Stripe checkout session creation error:", error);
			throw new Error(
				`Failed to create checkout session: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
		}
	}
}
