/**
 * CheckoutSession domain entity
 * Represents a payment session created for a user to purchase entitlements
 */

import type { EntitlementLevel } from "@/shared/types/billing";

/**
 * Checkout session domain entity
 */
export class CheckoutSession {
	/** Stripe checkout session ID */
	readonly id: string;
	/** User identifier (UUID) */
	readonly userId: string;
	/** Entitlement level being purchased */
	readonly entitlementLevel: EntitlementLevel;
	/** Stripe checkout URL for redirect */
	readonly url: string;
	/** Session status */
	readonly status: "open" | "complete" | "expired";
	/** Session creation timestamp */
	readonly createdAt: Date;
	/** Session expiration timestamp (optional) */
	readonly expiresAt?: Date;

	constructor(params: {
		id: string;
		userId: string;
		entitlementLevel: EntitlementLevel;
		url: string;
		status: "open" | "complete" | "expired";
		createdAt: Date;
		expiresAt?: Date;
	}) {
		this.id = params.id;
		this.userId = params.userId;
		this.entitlementLevel = params.entitlementLevel;
		this.url = params.url;
		this.status = params.status;
		this.createdAt = params.createdAt;
		this.expiresAt = params.expiresAt;
	}

	/**
	 * Check if the session is expired
	 * @returns true if session has expired, false otherwise
	 */
	isExpired(): boolean {
		if (!this.expiresAt) {
			return false;
		}
		return new Date() > this.expiresAt;
	}

	/**
	 * Check if the session is complete
	 * @returns true if session status is complete, false otherwise
	 */
	isComplete(): boolean {
		return this.status === "complete";
	}
}
