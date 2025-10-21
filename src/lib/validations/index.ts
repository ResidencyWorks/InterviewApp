/**
 * Validation schemas export
 * Centralizes all Zod validation schemas for easy importing
 */

// API validations
export * from "./api";
// Authentication validations
export * from "./auth";

// Content validations
export * from "./content";
// Evaluation validations
export * from "./evaluation";

// Common validation utilities
import { z } from "zod";

/**
 * Common validation patterns
 */
export const commonSchemas = {
	datetime: z.string().datetime("Invalid datetime format"),
	email: z.string().email("Invalid email format"),
	nonNegativeNumber: z.number().min(0, "Must be non-negative"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	percentage: z.number().min(0).max(100, "Must be between 0 and 100"),
	phoneNumber: z
		.string()
		.regex(/^\+?[1-9]\d{1,14}$/, "Must be a valid phone number"),
	positiveNumber: z.number().positive("Must be a positive number"),
	slug: z
		.string()
		.regex(
			/^[a-z0-9-]+$/,
			"Must be a valid slug (lowercase letters, numbers, and hyphens only)",
		),
	strongPassword: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.regex(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
			"Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
		),
	url: z.string().url("Invalid URL format"),
	uuid: z.string().uuid("Invalid UUID format"),
};

/**
 * Validation helper functions
 */
export const validationHelpers = {
	/**
	 * Creates a safe parser that returns a result object instead of throwing
	 */
	safeParse: <T>(
		schema: z.ZodSchema<T>,
		data: unknown,
	): { success: boolean; data?: T; error?: z.ZodError } => {
		const result = schema.safeParse(data);
		if (result.success) {
			return { data: result.data, success: true };
		}
		return { error: result.error, success: false };
	},
	/**
	 * Validates a form field value against a schema
	 */
	validateField: <T>(
		schema: z.ZodSchema<T>,
		value: unknown,
	): { success: boolean; data?: T; error?: string } => {
		try {
			const data = schema.parse(value);
			return { data, success: true };
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					error: error.issues[0]?.message || "Validation failed",
					success: false,
				};
			}
			return { error: "Unknown validation error", success: false };
		}
	},

	/**
	 * Validates multiple form fields
	 */
	validateForm: <T>(
		schema: z.ZodSchema<T>,
		data: unknown,
	): { success: boolean; data?: T; errors?: Record<string, string> } => {
		try {
			const validatedData = schema.parse(data);
			return { data: validatedData, success: true };
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errors: Record<string, string> = {};
				for (const err of error.issues) {
					const path = err.path.join(".");
					errors[path] = err.message;
				}
				return { errors, success: false };
			}
			return {
				errors: { general: "Unknown validation error" },
				success: false,
			};
		}
	},
};
