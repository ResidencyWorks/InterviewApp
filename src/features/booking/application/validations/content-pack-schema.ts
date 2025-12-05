import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const idSchema = z
	.union([
		uuidSchema,
		z
			.string()
			.regex(
				/^[A-Za-z0-9_-]+$/,
				"ID must be a UUID or a slug (letters, numbers, -, _)",
			),
	])
	.refine((v) => typeof v === "string" && v.length > 0, "ID cannot be empty");
const semanticVersionSchema = z
	.string()
	.regex(
		/^\d+\.\d+\.\d+$/,
		"Version must be in semantic version format (e.g., 1.2.3)",
	);
const nonEmptyStringSchema = z.string().min(1, "Field cannot be empty");
const optionalStringSchema = z.string().optional();
const questionTypeSchema = z.enum(["multiple-choice", "text", "rating"]);

const criteriaSchema = z.object({
	id: idSchema,
	name: nonEmptyStringSchema.max(
		100,
		"Criteria name must be 100 characters or less",
	),
	weight: z
		.number()
		.min(0, "Weight must be 0 or greater")
		.max(1, "Weight must be 1 or less")
		.refine((val) => Number.isFinite(val), "Weight must be a valid number"),
	description: nonEmptyStringSchema.max(
		500,
		"Criteria description must be 500 characters or less",
	),
});

const questionSchema = z.object({
	id: idSchema,
	text: nonEmptyStringSchema.max(
		1000,
		"Question text must be 1000 characters or less",
	),
	type: questionTypeSchema,
	options: z.array(z.string().min(1, "Option cannot be empty")).optional(),
});

const evaluationSchema = z.object({
	id: idSchema,
	title: nonEmptyStringSchema.max(
		200,
		"Evaluation title must be 200 characters or less",
	),
	description: nonEmptyStringSchema.max(
		1000,
		"Evaluation description must be 1000 characters or less",
	),
	criteria: z
		.array(criteriaSchema)
		.min(1, "At least one criteria is required")
		.max(20, "Maximum 20 criteria allowed per evaluation")
		.refine((criteria) => {
			const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
			return Math.abs(totalWeight - 1.0) < 0.001;
		}, "Criteria weights must sum to 1.0"),
	questions: z
		.array(questionSchema)
		.min(1, "At least one question is required")
		.max(50, "Maximum 50 questions allowed per evaluation"),
});

const categorySchema = z.object({
	id: idSchema,
	name: nonEmptyStringSchema.max(
		100,
		"Category name must be 100 characters or less",
	),
	description: nonEmptyStringSchema.max(
		500,
		"Category description must be 500 characters or less",
	),
});

const compatibilitySchema = z.object({
	minVersion: optionalStringSchema,
	maxVersion: optionalStringSchema,
	features: z
		.array(z.string().min(1, "Feature name cannot be empty"))
		.optional(),
});

const metadataSchema = z.object({
	author: optionalStringSchema,
	tags: z
		.array(
			z
				.string()
				.min(1, "Tag cannot be empty")
				.max(50, "Tag must be 50 characters or less"),
		)
		.optional()
		.refine((tags) => !tags || tags.length <= 20, "Maximum 20 tags allowed"),
	dependencies: z
		.array(z.string().min(1, "Dependency cannot be empty"))
		.optional()
		.refine(
			(deps) => !deps || deps.length <= 10,
			"Maximum 10 dependencies allowed",
		),
	compatibility: compatibilitySchema.optional(),
	customFields: z.record(z.string(), z.unknown()).optional(),
});

const contentSchema = z.object({
	evaluations: z
		.array(evaluationSchema)
		.min(1, "At least one evaluation is required")
		.max(100, "Maximum 100 evaluations allowed")
		.refine((evaluations) => {
			const ids = evaluations.map((e) => e.id);
			return ids.length === new Set(ids).size;
		}, "Evaluation IDs must be unique"),
	categories: z
		.array(categorySchema)
		.min(1, "At least one category is required")
		.max(50, "Maximum 50 categories allowed")
		.refine((categories) => {
			const ids = categories.map((c) => c.id);
			return ids.length === new Set(ids).size;
		}, "Category IDs must be unique"),
});

export const ContentPackSchemaV1 = z.object({
	version: semanticVersionSchema,
	name: nonEmptyStringSchema.max(
		100,
		"Content pack name must be 100 characters or less",
	),
	description: optionalStringSchema,
	content: contentSchema,
	metadata: metadataSchema.optional(),
});

export const SCHEMA_REGISTRY = {
	"1.0.0": ContentPackSchemaV1,
} as const;

export type ContentPackV1 = z.infer<typeof ContentPackSchemaV1>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export type Criteria = z.infer<typeof criteriaSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Category = z.infer<typeof categorySchema>;
export type ContentPackMetadata = z.infer<typeof metadataSchema>;

export function getSchemaForVersion(
	version: string,
): z.ZodSchema<unknown> | null {
	return SCHEMA_REGISTRY[version as keyof typeof SCHEMA_REGISTRY] || null;
}

export function getSupportedVersions(): string[] {
	return Object.keys(SCHEMA_REGISTRY);
}

export function isVersionSupported(version: string): boolean {
	return version in SCHEMA_REGISTRY;
}

export function validateUniqueIds<T extends { id: string }>(
	items: T[],
): boolean {
	const ids = items.map((item) => item.id);
	return ids.length === new Set(ids).size;
}

export function validateWeightSum(criteria: Criteria[]): boolean {
	const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
	return Math.abs(totalWeight - 1.0) < 0.001;
}

export function validateContentPack(data: unknown, version = "1.0.0") {
	const schema = getSchemaForVersion(version);
	if (!schema) {
		throw new Error(`Unsupported schema version: ${version}`);
	}

	return schema.safeParse(data);
}

export async function validateContentPackAsync(
	data: unknown,
	version = "1.0.0",
) {
	const schema = getSchemaForVersion(version);
	if (!schema) {
		throw new Error(`Unsupported schema version: ${version}`);
	}

	return schema.safeParseAsync(data);
}
