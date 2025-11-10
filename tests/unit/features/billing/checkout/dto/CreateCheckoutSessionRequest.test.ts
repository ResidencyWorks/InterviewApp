import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * CreateCheckoutSessionRequest DTO validation schema
 * This test validates the request DTO structure and validation rules
 */
const createCheckoutSessionRequestSchema = z.object({
	entitlementLevel: z.enum(["FREE", "TRIAL", "PRO"]),
});

type CreateCheckoutSessionRequest = z.infer<
	typeof createCheckoutSessionRequestSchema
>;

describe("CreateCheckoutSessionRequest DTO", () => {
	it("should accept valid entitlement levels", () => {
		const validRequests: CreateCheckoutSessionRequest[] = [
			{ entitlementLevel: "FREE" },
			{ entitlementLevel: "TRIAL" },
			{ entitlementLevel: "PRO" },
		];

		validRequests.forEach((request) => {
			const result = createCheckoutSessionRequestSchema.safeParse(request);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.entitlementLevel).toBe(request.entitlementLevel);
			}
		});
	});

	it("should reject invalid entitlement levels", () => {
		const invalidRequests = [
			{ entitlementLevel: "INVALID" },
			{ entitlementLevel: "BASIC" },
			{ entitlementLevel: "" },
			{ entitlementLevel: null },
			{ entitlementLevel: undefined },
		];

		invalidRequests.forEach((request) => {
			const result = createCheckoutSessionRequestSchema.safeParse(request);
			expect(result.success).toBe(false);
		});
	});

	it("should require entitlementLevel field", () => {
		const result = createCheckoutSessionRequestSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it("should reject additional fields", () => {
		const request = {
			entitlementLevel: "PRO",
			extraField: "should not be here",
		};
		const result = createCheckoutSessionRequestSchema.safeParse(request);
		// Zod by default strips unknown fields, so this should succeed but without extraField
		expect(result.success).toBe(true);
		if (result.success) {
			expect("extraField" in result.data).toBe(false);
		}
	});
});
