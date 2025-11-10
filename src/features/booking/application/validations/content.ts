import { z } from "zod";

/**
 * Content pack validation schemas
 * Validates content pack data and uploads
 */

export const contentCategorySchema = z.object({
	criteria: z
		.array(z.string().min(1, "Criteria cannot be empty"))
		.min(1, "At least one criteria is required"),
	description: z
		.string()
		.min(1, "Description is required")
		.max(1000, "Description must be less than 1,000 characters"),
	id: z.string().min(1, "Category ID is required"),
	name: z
		.string()
		.min(1, "Category name is required")
		.max(255, "Category name must be less than 255 characters"),
	weight: z.number().min(0).max(1, "Weight must be between 0 and 1"),
});

export const contentQuestionSchema = z.object({
	category_id: z.string().min(1, "Category ID is required"),
	difficulty: z.enum(["easy", "medium", "hard"]),
	id: z.string().min(1, "Question ID is required"),
	text: z
		.string()
		.min(1, "Question text is required")
		.max(2000, "Question text must be less than 2,000 characters"),
	time_limit: z
		.number()
		.int()
		.min(30, "Time limit must be at least 30 seconds")
		.max(1800, "Time limit must be less than 30 minutes"),
	tips: z
		.array(z.string().min(1, "Tip cannot be empty"))
		.min(1, "At least one tip is required"),
	type: z.enum(["behavioral", "technical", "situational"]),
});

export const evaluationCriteriaSchema = z.object({
	clarity: z.object({
		description: z.string().min(1, "Description is required"),
		factors: z
			.array(z.string().min(1, "Factor cannot be empty"))
			.min(1, "At least one factor is required"),
		weight: z.number().min(0).max(1, "Weight must be between 0 and 1"),
	}),
	content: z.object({
		description: z.string().min(1, "Description is required"),
		factors: z
			.array(z.string().min(1, "Factor cannot be empty"))
			.min(1, "At least one factor is required"),
		weight: z.number().min(0).max(1, "Weight must be between 0 and 1"),
	}),
	delivery: z.object({
		description: z.string().min(1, "Description is required"),
		factors: z
			.array(z.string().min(1, "Factor cannot be empty"))
			.min(1, "At least one factor is required"),
		weight: z.number().min(0).max(1, "Weight must be between 0 and 1"),
	}),
	structure: z.object({
		description: z.string().min(1, "Description is required"),
		factors: z
			.array(z.string().min(1, "Factor cannot be empty"))
			.min(1, "At least one factor is required"),
		weight: z.number().min(0).max(1, "Weight must be between 0 and 1"),
	}),
});

export const contentPackMetadataSchema = z.object({
	author: z
		.string()
		.min(1, "Author is required")
		.max(255, "Author name must be less than 255 characters"),
	created_at: z.string().datetime("Invalid created_at format"),
	language: z
		.string()
		.min(2, "Language code must be at least 2 characters")
		.max(10, "Language code must be less than 10 characters"),
	tags: z
		.array(z.string().min(1, "Tag cannot be empty"))
		.min(1, "At least one tag is required"),
	target_audience: z
		.array(z.string().min(1, "Target audience cannot be empty"))
		.min(1, "At least one target audience is required"),
	updated_at: z.string().datetime("Invalid updated_at format"),
});

export const contentPackDataSchema = z.object({
	categories: z
		.array(contentCategorySchema)
		.min(1, "At least one category is required"),
	description: z
		.string()
		.min(1, "Description is required")
		.max(1000, "Description must be less than 1,000 characters"),
	evaluation_criteria: evaluationCriteriaSchema,
	metadata: contentPackMetadataSchema,
	name: z
		.string()
		.min(1, "Name is required")
		.max(255, "Name must be less than 255 characters"),
	questions: z
		.array(contentQuestionSchema)
		.min(1, "At least one question is required"),
	version: z
		.string()
		.min(1, "Version is required")
		.max(50, "Version must be less than 50 characters"),
});

export const contentPackSchema = z.object({
	content: contentPackDataSchema,
	created_at: z.string().datetime(),
	id: z.string().uuid("Invalid content pack ID"),
	is_active: z.boolean().default(false),
	name: z
		.string()
		.min(1, "Name is required")
		.max(255, "Name must be less than 255 characters"),
	updated_at: z.string().datetime(),
	version: z
		.string()
		.min(1, "Version is required")
		.max(50, "Version must be less than 50 characters"),
});

export const contentUploadSchema = z.object({
	file: z.instanceof(File),
	name: z
		.string()
		.min(1, "Name is required")
		.max(255, "Name must be less than 255 characters"),
	version: z
		.string()
		.min(1, "Version is required")
		.max(50, "Version must be less than 50 characters"),
});

export const contentValidationSchema = z.object({
	errors: z.array(z.string().min(1, "Error cannot be empty")).optional(),
	message: z.string().min(1, "Message is required"),
	timestamp: z.string().datetime("Invalid timestamp format"),
	valid: z.boolean(),
	version: z.string().min(1, "Version is required"),
});

// Type exports
export type ContentCategory = z.infer<typeof contentCategorySchema>;
export type ContentQuestion = z.infer<typeof contentQuestionSchema>;
export type EvaluationCriteria = z.infer<typeof evaluationCriteriaSchema>;
export type ContentPackMetadata = z.infer<typeof contentPackMetadataSchema>;
export type ContentPackData = z.infer<typeof contentPackDataSchema>;
export type ContentPack = z.infer<typeof contentPackSchema>;
export type ContentUpload = z.infer<typeof contentUploadSchema>;
export type ContentValidation = z.infer<typeof contentValidationSchema>;
