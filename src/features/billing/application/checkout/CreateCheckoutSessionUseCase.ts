/**
 * CreateCheckoutSessionUseCase
 * Application use case for creating Stripe checkout sessions
 */

import type { CheckoutSession } from "@/features/billing/domain/checkout/CheckoutSession";
import type { ICheckoutRepository } from "@/features/billing/domain/checkout/interfaces/ICheckoutRepository";
import { getAppUrl } from "@/infrastructure/config/environment";
import type { EntitlementLevel } from "@/shared/types/billing";

/**
 * Parameters for creating a checkout session
 */
export interface CreateCheckoutSessionUseCaseParams {
	/** User identifier (UUID) */
	userId: string;
	/** Entitlement level being purchased */
	entitlementLevel: EntitlementLevel;
}

/**
 * Use case for creating checkout sessions
 * Orchestrates the creation of a Stripe checkout session
 */
export class CreateCheckoutSessionUseCase {
	constructor(private readonly checkoutRepository: ICheckoutRepository) {}

	/**
	 * Execute the use case to create a checkout session
	 * @param params - Parameters for creating the checkout session
	 * @returns Promise resolving to CheckoutSession domain entity
	 * @throws Error if session creation fails
	 */
	async execute(
		params: CreateCheckoutSessionUseCaseParams,
	): Promise<CheckoutSession> {
		const baseUrl = getAppUrl();

		const checkoutSession = await this.checkoutRepository.createSession({
			userId: params.userId,
			entitlementLevel: params.entitlementLevel,
			successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: `${baseUrl}/checkout/cancel`,
		});

		return checkoutSession;
	}
}
