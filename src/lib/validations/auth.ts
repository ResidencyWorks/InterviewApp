import { z } from "zod";

/**
 * Authentication validation schemas
 * Validates user authentication requests and responses
 */

export const emailSchema = z
	.string()
	.email("Invalid email format")
	.min(1, "Email is required")
	.max(255, "Email must be less than 255 characters");

export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(128, "Password must be less than 128 characters")
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
		"Password must contain at least one lowercase letter, one uppercase letter, and one number",
	);

export const magicLinkRequestSchema = z.object({
	action: z
		.enum(["magiclink", "signup", "recovery"])
		.optional()
		.default("magiclink"),
	email: emailSchema,
});

export const userProfileSchema = z.object({
	avatar_url: z.string().url("Invalid avatar URL").optional(),
	created_at: z.string().datetime(),
	email: emailSchema,
	entitlement_level: z.enum(["FREE", "TRIAL", "PRO"]).default("FREE"),
	full_name: z
		.string()
		.min(1, "Full name is required")
		.max(255, "Full name must be less than 255 characters")
		.optional(),
	id: z.string().uuid("Invalid user ID"),
	stripe_customer_id: z.string().optional(),
	updated_at: z.string().datetime(),
});

export const userUpdateSchema = z.object({
	avatar_url: z.string().url("Invalid avatar URL").optional(),
	full_name: z
		.string()
		.min(1, "Full name is required")
		.max(255, "Full name must be less than 255 characters")
		.optional(),
});

export const entitlementSchema = z.object({
	created_at: z.string().datetime(),
	entitlement_level: z.enum(["FREE", "TRIAL", "PRO"]),
	expires_at: z.string().datetime(),
	id: z.string().uuid("Invalid entitlement ID"),
	updated_at: z.string().datetime(),
	user_id: z.string().uuid("Invalid user ID"),
});

export const authErrorSchema = z.object({
	code: z.string().optional(),
	message: z.string().min(1, "Error message is required"),
	status: z.number().int().min(100).max(599).optional(),
});

// Type exports
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type Entitlement = z.infer<typeof entitlementSchema>;
export type AuthError = z.infer<typeof authErrorSchema>;
