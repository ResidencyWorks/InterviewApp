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
			apiVersion: "2025-09-30.clover",
		});
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

			const session = await this.stripe.checkout.sessions.create({
				mode: "payment",
				client_reference_id: params.userId,
				metadata: {
					userId: params.userId,
					entitlementLevel: params.entitlementLevel,
				},
				success_url: params.successUrl,
				cancel_url: params.cancelUrl,
				// Note: In a real implementation, you would specify line_items or price_id
				// For now, this is a placeholder that will need to be configured
				// based on your Stripe product/price setup
			});

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
