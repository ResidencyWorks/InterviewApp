/**
 * PHI Scrubber utility for sanitizing Protected Health Information from user input.
 *
 * This utility removes email addresses and phone numbers from text before storage
 * or transmission, ensuring compliance with healthcare privacy regulations.
 *
 * @module shared/security/phi-scrubber
 */

/**
 * Email pattern matching RFC 5322 compliant email addresses.
 * Matches: user@domain.com, user.name@subdomain.domain.co.uk
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * US phone number pattern with optional country code.
 * Matches: (555) 123-4567, 555-123-4567, 555.123.4567, +1-555-123-4567
 */
const PHONE_PATTERN =
	/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;

/**
 * Placeholder text for redacted email addresses.
 */
const EMAIL_PLACEHOLDER = "[EMAIL_REDACTED]";

/**
 * Placeholder text for redacted phone numbers.
 */
const PHONE_PLACEHOLDER = "[PHONE_REDACTED]";

/**
 * Utility class for scrubbing Protected Health Information (PHI) from user input.
 *
 * Provides methods to detect and remove email addresses and phone numbers,
 * replacing them with placeholder text to maintain text readability while
 * ensuring compliance with healthcare privacy regulations.
 */
export class PhiScrubber {
	/**
	 * Scrubs user input text by removing email addresses and phone numbers,
	 * replacing them with appropriate placeholders.
	 *
	 * @param text - The user input text that may contain PHI
	 * @returns The scrubbed text with PHI replaced by placeholders
	 *
	 * @example
	 * ```typescript
	 * const input = "Contact me at john@example.com or call 555-123-4567";
	 * const scrubbed = PhiScrubber.scrubUserInput(input);
	 * // Returns: "Contact me at [EMAIL_REDACTED] or call [PHONE_REDACTED]"
	 * ```
	 */
	static scrubUserInput(text: string): string {
		if (!text || typeof text !== "string") {
			return text;
		}

		let scrubbed = text;

		// Remove email addresses
		scrubbed = scrubbed.replace(EMAIL_PATTERN, EMAIL_PLACEHOLDER);

		// Remove phone numbers
		scrubbed = scrubbed.replace(PHONE_PATTERN, PHONE_PLACEHOLDER);

		return scrubbed;
	}

	/**
	 * Checks if the input text contains any Protected Health Information.
	 *
	 * @param text - The text to check for PHI
	 * @returns `true` if PHI is detected, `false` otherwise
	 *
	 * @example
	 * ```typescript
	 * PhiScrubber.isPhiPresent("Contact john@example.com"); // true
	 * PhiScrubber.isPhiPresent("Normal text"); // false
	 * ```
	 */
	static isPhiPresent(text: string): boolean {
		if (!text || typeof text !== "string") {
			return false;
		}

		return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text);
	}
}
