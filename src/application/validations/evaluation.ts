import { z } from "zod";

/**
 * Evaluation validation schemas
 * Validates evaluation requests and responses
 */

export const evaluationCategoriesSchema = z.object({
	clarity: z
		.number()
		.min(0)
		.max(100, "Clarity score must be between 0 and 100"),
	content: z
		.number()
		.min(0)
		.max(100, "Content score must be between 0 and 100"),
	delivery: z
		.number()
		.min(0)
		.max(100, "Delivery score must be between 0 and 100"),
	structure: z
		.number()
		.min(0)
		.max(100, "Structure score must be between 0 and 100"),
});

export const evaluationRequestSchema = z.object({
	audio_url: z.string().url("Invalid audio URL").optional(),
	content_pack_id: z.string().uuid("Invalid content pack ID").optional(),
	response: z
		.string()
		.min(1, "Response is required")
		.max(10000, "Response must be less than 10,000 characters"),
	type: z.enum(["text", "audio"]),
});

export const evaluationResponseSchema = z.object({
	categories: evaluationCategoriesSchema,
	duration: z.number().min(0, "Duration must be positive"),
	feedback: z
		.string()
		.min(1, "Feedback is required")
		.max(5000, "Feedback must be less than 5,000 characters"),
	score: z.number().min(0).max(100, "Score must be between 0 and 100"),
	timestamp: z.string().datetime("Invalid timestamp format"),
	word_count: z.number().int().min(0, "Word count must be non-negative"),
	wpm: z
		.number()
		.min(0, "WPM must be non-negative")
		.max(1000, "WPM must be less than 1000"),
});

export const evaluationResultSchema = z.object({
	categories: evaluationCategoriesSchema,
	content_pack_id: z.string().uuid("Invalid content pack ID").optional(),
	created_at: z.string().datetime(),
	duration_seconds: z.number().int().min(0).optional(),
	feedback: z.string().optional(),
	id: z.string().uuid("Invalid evaluation ID"),
	response_audio_url: z.string().url("Invalid audio URL").optional(),
	response_text: z.string().optional(),
	response_type: z.enum(["text", "audio"]),
	score: z.number().min(0).max(100).optional(),
	status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
	updated_at: z.string().datetime(),
	user_id: z.string().uuid("Invalid user ID"),
	word_count: z.number().int().min(0).optional(),
	wpm: z.number().min(0).max(1000).optional(),
});

export const evaluationErrorSchema = z.object({
	code: z.string().min(1, "Error code is required"),
	message: z.string().min(1, "Error message is required"),
	status: z.number().int().min(100).max(599),
});

// Type exports
export type EvaluationCategories = z.infer<typeof evaluationCategoriesSchema>;
export type EvaluationRequest = z.infer<typeof evaluationRequestSchema>;
export type EvaluationResponse = z.infer<typeof evaluationResponseSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type EvaluationError = z.infer<typeof evaluationErrorSchema>;
