/**
 * Checkout repository interface
 * Defines the contract for creating checkout sessions with payment providers
 */

import type { EntitlementLevel } from "@/shared/types/billing";
import type { CheckoutSession } from "../CheckoutSession";

/**
 * Parameters for creating a checkout session
 */
export interface CreateCheckoutSessionParams {
	/** User identifier (UUID) */
	userId: string;
	/** Entitlement level being purchased */
	entitlementLevel: EntitlementLevel;
	/** Success URL to redirect to after payment */
	successUrl: string;
	/** Cancel URL to redirect to if payment is cancelled */
	cancelUrl: string;
}

/**
 * Repository interface for checkout session operations
 * Abstracts the payment provider (Stripe) implementation
 */
export interface ICheckoutRepository {
	/**
	 * Create a checkout session with the payment provider
	 * @param params - Parameters for creating the checkout session
	 * @returns Promise resolving to CheckoutSession domain entity
	 * @throws Error if session creation fails
	 */
	createSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession>;
}
