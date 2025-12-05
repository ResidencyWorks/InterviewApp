import { z } from "zod";

/**
 * API validation schemas
 * Validates API requests and responses
 */

export const apiResponseSchema = z.object({
	data: z.unknown().optional(),
	error: z.string().optional(),
	message: z.string().optional(),
	status: z.number().int().min(100).max(599),
});

export const apiErrorSchema = z.object({
	code: z.string().min(1, "Error code is required"),
	details: z.unknown().optional(),
	message: z.string().min(1, "Error message is required"),
	status: z.number().int().min(100).max(599),
});

export const paginationParamsSchema = z.object({
	limit: z
		.number()
		.int()
		.min(1, "Limit must be at least 1")
		.max(100, "Limit must be less than 100")
		.default(20),
	page: z.number().int().min(1, "Page must be at least 1").default(1),
	sort_by: z.string().min(1, "Sort by field is required").optional(),
	sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const searchParamsSchema = z.object({
	filters: z.record(z.string(), z.unknown()).optional(),
	pagination: paginationParamsSchema.optional(),
	query: z
		.string()
		.min(1, "Query is required")
		.max(255, "Query must be less than 255 characters")
		.optional(),
});

export const selectOptionSchema = z.object({
	disabled: z.boolean().optional().default(false),
	label: z.string().min(1, "Label is required"),
	value: z.string().min(1, "Value is required"),
});

export const formFieldSchema = z.object({
	label: z.string().min(1, "Field label is required"),
	name: z.string().min(1, "Field name is required"),
	options: z.array(selectOptionSchema).optional(),
	placeholder: z.string().optional(),
	required: z.boolean().optional().default(false),
	type: z.enum([
		"text",
		"email",
		"password",
		"textarea",
		"select",
		"checkbox",
		"radio",
	]),
	validation: z
		.object({
			max: z.number().optional(),
			message: z.string().optional(),
			min: z.number().optional(),
			pattern: z.string().optional(),
		})
		.optional(),
});

export const notificationSchema = z.object({
	action: z
		.object({
			label: z.string().min(1, "Action label is required"),
			onClick: z.function(),
		})
		.optional(),
	duration: z
		.number()
		.int()
		.min(1000, "Duration must be at least 1000ms")
		.max(30000, "Duration must be less than 30 seconds")
		.optional(),
	id: z.string().min(1, "Notification ID is required"),
	message: z
		.string()
		.min(1, "Message is required")
		.max(1000, "Message must be less than 1,000 characters"),
	title: z
		.string()
		.min(1, "Title is required")
		.max(255, "Title must be less than 255 characters"),
	type: z.enum(["success", "error", "warning", "info"]),
});

// Type exports
export type ApiResponse<T = unknown> = z.infer<typeof apiResponseSchema> & {
	data?: T;
};
export type ApiError = z.infer<typeof apiErrorSchema>;
export type PaginationParams = z.infer<typeof paginationParamsSchema>;
export type SearchParams = z.infer<typeof searchParamsSchema>;
export type SelectOption = z.infer<typeof selectOptionSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type Notification = z.infer<typeof notificationSchema>;
