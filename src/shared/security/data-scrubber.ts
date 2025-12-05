/**
 * Data Scrubber utility for recursively removing PII from objects and nested structures.
 *
 * This utility scrubs personally identifiable information from objects before
 * transmission to analytics or error tracking services, ensuring compliance
 * with privacy regulations.
 *
 * @module shared/security/data-scrubber
 */

/**
 * Field names that indicate PII and should be redacted.
 * Case-insensitive matching is performed.
 */
const PHI_FIELDS = [
	"email",
	"emailAddress",
	"userEmail",
	"name",
	"fullName",
	"full_name",
	"userName",
	"phone",
	"phoneNumber",
	"phone_number",
	"address",
	"street",
	"zip",
	"postalCode",
];

/**
 * Placeholder text for redacted PII fields.
 */
const REDACTED_PLACEHOLDER = "[REDACTED]";

/**
 * Checks if a field name indicates PII.
 *
 * @param fieldName - The field name to check
 * @returns `true` if the field indicates PII, `false` otherwise
 */
function isPhiField(fieldName: string): boolean {
	const lowerName = fieldName.toLowerCase();
	return PHI_FIELDS.some((phiField) =>
		lowerName.includes(phiField.toLowerCase()),
	);
}

/**
 * Utility class for scrubbing PII from objects and nested data structures.
 *
 * Recursively traverses objects and arrays, replacing PII fields with
 * placeholder text while preserving the structure and non-PII data.
 */
export class DataScrubber {
	/**
	 * Recursively scrubs PII from an object or nested structure.
	 *
	 * @param obj - The object to scrub (may be nested)
	 * @returns A new object with PII fields replaced by placeholders
	 *
	 * @example
	 * ```typescript
	 * const input = {
	 *   user: { email: "user@example.com", name: "John Doe" },
	 *   other: "safe data"
	 * };
	 * const scrubbed = DataScrubber.scrubObject(input);
	 * // Returns: { user: { email: "[REDACTED]", name: "[REDACTED]" }, other: "safe data" }
	 * ```
	 */
	static scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
		if (!obj || typeof obj !== "object" || obj === null) {
			return obj;
		}

		// Handle arrays
		if (Array.isArray(obj)) {
			return obj.map((item) => {
				if (typeof item === "object" && item !== null && !Array.isArray(item)) {
					return DataScrubber.scrubObject(item as Record<string, unknown>);
				}
				return item;
			}) as unknown as Record<string, unknown>;
		}

		const scrubbed: Record<string, unknown> = { ...obj };

		for (const key of Object.keys(scrubbed)) {
			const value = scrubbed[key];

			// Scrub PII fields (but preserve null/undefined)
			if (isPhiField(key) && value !== null && value !== undefined) {
				scrubbed[key] = REDACTED_PLACEHOLDER;
			}
			// Recursively scrub nested objects
			else if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value)
			) {
				scrubbed[key] = DataScrubber.scrubObject(
					value as Record<string, unknown>,
				);
			}
			// Recursively scrub arrays of objects
			else if (Array.isArray(value)) {
				scrubbed[key] = value.map((item) => {
					if (
						typeof item === "object" &&
						item !== null &&
						!Array.isArray(item)
					) {
						return DataScrubber.scrubObject(item as Record<string, unknown>);
					}
					return item;
				});
			}
			// Preserve primitive values
		}

		return scrubbed;
	}
}
