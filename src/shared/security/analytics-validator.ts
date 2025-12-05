/**
 * Analytics Validator utility for ensuring analytics events contain no PII.
 *
 * This utility validates analytics events before transmission to ensure
 * they comply with privacy regulations by checking for PII patterns.
 *
 * @module shared/security/analytics-validator
 */

/**
 * Email pattern for detecting email addresses in event properties.
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/**
 * Phone pattern for detecting phone numbers in event properties.
 */
const PHONE_PATTERN =
	/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/;

/**
 * PII field names that should not appear in analytics events.
 */
const PII_FIELDS = ["email", "name", "phone", "address", "ssn", "creditCard"];

/**
 * Utility class for validating analytics events to ensure no PII is present.
 *
 * Provides validation methods that check event properties for PII patterns
 * and throw errors in development or log warnings in production.
 */
export class AnalyticsValidator {
	/**
	 * Validates an analytics event to ensure it contains no PII.
	 *
	 * In development, throws errors if PII is detected.
	 * In production, logs warnings if PII is detected.
	 *
	 * @param eventName - The name of the analytics event
	 * @param properties - The event properties to validate (optional)
	 * @throws {Error} In development if PII is detected
	 *
	 * @example
	 * ```typescript
	 * // Valid event
	 * AnalyticsValidator.validateEvent("button_click", {
	 *   distinctId: "550e8400-e29b-41d4-a716-446655440000",
	 *   timestamp: "2025-01-27T12:00:00Z"
	 * });
	 *
	 * // Invalid event (throws in development)
	 * AnalyticsValidator.validateEvent("user_signup", {
	 *   distinctId: "user@example.com" // Error: distinctId cannot be an email
	 * });
	 * ```
	 */
	static validateEvent(
		eventName: string,
		properties?: Record<string, unknown>,
	): void {
		if (!properties || typeof properties !== "object") {
			return;
		}

		// Check distinctId is not an email
		if (properties.distinctId && typeof properties.distinctId === "string") {
			if (EMAIL_PATTERN.test(properties.distinctId)) {
				const error = new Error("distinctId cannot be an email address");
				if (process.env.NODE_ENV === "development") {
					throw error;
				}
				console.warn(
					`Analytics validation warning for event "${eventName}":`,
					error.message,
				);
			}
		}

		// Check for PII in properties
		if (AnalyticsValidator.containsPII(properties)) {
			const error = new Error("Analytics event contains PII");
			if (process.env.NODE_ENV === "development") {
				throw error;
			}
			console.warn(
				`Analytics event "${eventName}" may contain PII. Please review event properties.`,
			);
		}
	}

	/**
	 * Recursively checks if an object contains PII patterns.
	 *
	 * @param obj - The object to check
	 * @returns `true` if PII is detected, `false` otherwise
	 */
	private static containsPII(obj: Record<string, unknown>): boolean {
		for (const [key, value] of Object.entries(obj)) {
			// Check field name
			const lowerKey = key.toLowerCase();
			if (PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
				return true;
			}

			// Check string values for email/phone patterns
			if (typeof value === "string") {
				if (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value)) {
					return true;
				}
			}
			// Recursively check nested objects
			else if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value)
			) {
				if (AnalyticsValidator.containsPII(value as Record<string, unknown>)) {
					return true;
				}
			}
			// Recursively check arrays
			else if (Array.isArray(value)) {
				for (const item of value) {
					if (
						typeof item === "object" &&
						item !== null &&
						!Array.isArray(item)
					) {
						if (
							AnalyticsValidator.containsPII(item as Record<string, unknown>)
						) {
							return true;
						}
					}
				}
			}
		}

		return false;
	}
}
