/**
 * CreateCheckoutSessionRequest DTO
 * Request data transfer object for creating a checkout session
 */

import { z } from "zod";

/**
 * Zod schema for validating checkout session creation requests
 */
export const createCheckoutSessionRequestSchema = z.object({
	entitlementLevel: z.enum(["FREE", "TRIAL", "PRO"]),
});

/**
 * Request DTO for creating a checkout session
 */
export type CreateCheckoutSessionRequest = z.infer<
	typeof createCheckoutSessionRequestSchema
>;

/**
 * Validate and parse a checkout session creation request
 * @param data - Raw request data
 * @returns Validated request DTO
 * @throws ZodError if validation fails
 */
export function validateCreateCheckoutSessionRequest(
	data: unknown,
): CreateCheckoutSessionRequest {
	return createCheckoutSessionRequestSchema.parse(data);
}
