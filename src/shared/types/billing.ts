/**
 * Billing-related types for Stripe checkout and entitlements
 */

/**
 * Entitlement levels available for purchase
 */
export type EntitlementLevel = "FREE" | "TRIAL" | "PRO";

/**
 * Checkout session domain entity
 * Represents a payment session created for a user to purchase entitlements
 */
export interface CheckoutSession {
	/** Stripe checkout session ID */
	id: string;
	/** User identifier (UUID) */
	userId: string;
	/** Entitlement level being purchased */
	entitlementLevel: EntitlementLevel;
	/** Stripe checkout URL for redirect */
	url: string;
	/** Session status */
	status: "open" | "complete" | "expired";
	/** Session creation timestamp */
	createdAt: Date;
	/** Session expiration timestamp (optional) */
	expiresAt?: Date;
}

/**
 * Entitlement domain entity
 * Represents a user's access level and permissions
 */
export interface Entitlement {
	/** UUID primary key */
	id: string;
	/** User identifier (UUID, foreign key) */
	userId: string;
	/** Access level */
	entitlementLevel: EntitlementLevel;
	/** Entitlement expiration timestamp */
	expiresAt: Date;
	/** Creation timestamp */
	createdAt: Date;
	/** Last update timestamp */
	updatedAt: Date;
	/** Stripe event ID that granted this entitlement (for idempotency) */
	stripeEventId?: string;
}

/**
 * Webhook event domain entity
 * Represents a payment confirmation notification from Stripe
 */
export interface WebhookEvent {
	/** Stripe event ID (used for idempotency) */
	id: string;
	/** Event type (e.g., "checkout.session.completed") */
	type: string;
	/** User ID extracted from session metadata */
	userId?: string;
	/** Entitlement level from metadata */
	entitlementLevel?: EntitlementLevel;
	/** Whether event has been processed */
	processed: boolean;
	/** When event was processed */
	processedAt?: Date;
	/** Event creation timestamp */
	createdAt: Date;
	/** Stripe webhook signature (for verification) */
	signature: string;
}

/**
 * Request DTO for creating a checkout session
 */
export interface CreateCheckoutSessionRequest {
	/** Entitlement level being purchased */
	entitlementLevel: EntitlementLevel;
}

/**
 * Response DTO for checkout session creation
 */
export interface CreateCheckoutSessionResponse {
	/** Stripe checkout session ID */
	sessionId: string;
	/** Redirect URL */
	url: string;
	/** ISO 8601 timestamp */
	expiresAt: string;
}
