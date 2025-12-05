/**
 * ContentPackSchema Entity
 *
 * Represents the Zod schema definition for content pack structure validation
 * with versioning support and schema management.
 */

import { z } from "zod";

export interface ContentPackSchema {
	version: string; // Schema version
	name: string; // Schema name
	description?: string; // Schema description
	schema: z.ZodSchema<unknown>; // The actual Zod schema
	createdAt: Date; // When schema was created
	isActive: boolean; // Whether this schema is currently active
	supportedVersions: string[]; // Content pack versions this schema supports
}

/**
 * Creates a new ContentPackSchema instance
 */
export function createContentPackSchema(
	version: string,
	name: string,
	schema: z.ZodSchema<unknown>,
	supportedVersions: string[],
	description?: string,
): ContentPackSchema {
	return {
		version,
		name,
		description,
		schema,
		createdAt: new Date(),
		isActive: true,
		supportedVersions,
	};
}

/**
 * Schema version 1.0.0 for content packs
 * This is the initial schema version for the InterviewApp content pack format
 */
export const ContentPackSchemaV1 = z.object({
	version: z
		.string()
		.regex(
			/^\d+\.\d+\.\d+$/,
			"Version must be in semantic version format (e.g., 1.2.3)",
		),
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be 100 characters or less"),
	description: z.string().optional(),
	content: z.object({
		evaluations: z
			.array(
				z.object({
					id: z.string().min(1, "Evaluation ID is required"),
					title: z.string().min(1, "Evaluation title is required"),
					description: z.string().min(1, "Evaluation description is required"),
					criteria: z
						.array(
							z.object({
								id: z.string().min(1, "Criteria ID is required"),
								name: z.string().min(1, "Criteria name is required"),
								weight: z
									.number()
									.min(0, "Weight must be 0 or greater")
									.max(1, "Weight must be 1 or less"),
								description: z
									.string()
									.min(1, "Criteria description is required"),
							}),
						)
						.min(1, "At least one criteria is required"),
					questions: z
						.array(
							z.object({
								id: z.string().min(1, "Question ID is required"),
								text: z.string().min(1, "Question text is required"),
								type: z.enum(["multiple-choice", "text", "rating"]),
								options: z.array(z.string()).optional(),
							}),
						)
						.min(1, "At least one question is required"),
				}),
			)
			.min(1, "At least one evaluation is required"),
		categories: z
			.array(
				z.object({
					id: z.string().min(1, "Category ID is required"),
					name: z.string().min(1, "Category name is required"),
					description: z.string().min(1, "Category description is required"),
				}),
			)
			.min(1, "At least one category is required"),
	}),
	metadata: z
		.object({
			author: z.string().optional(),
			tags: z.array(z.string()).optional(),
			dependencies: z.array(z.string()).optional(),
			compatibility: z
				.object({
					minVersion: z.string().optional(),
					maxVersion: z.string().optional(),
					features: z.array(z.string()).optional(),
				})
				.optional(),
		})
		.optional(),
});

/**
 * Default schema registry with version 1.0.0
 */
export const DEFAULT_SCHEMA_REGISTRY: Record<string, ContentPackSchema> = {
	"1.0.0": createContentPackSchema(
		"1.0.0",
		"InterviewApp Content Pack Schema v1.0.0",
		ContentPackSchemaV1,
		["1.0.0"],
		"Initial schema version for InterviewApp content packs",
	),
};

/**
 * Gets the active schema for a given version
 */
export function getSchemaForVersion(version: string): ContentPackSchema | null {
	return DEFAULT_SCHEMA_REGISTRY[version] || null;
}

/**
 * Gets the latest active schema
 */
export function getLatestSchema(): ContentPackSchema | null {
	const schemas = Object.values(DEFAULT_SCHEMA_REGISTRY).filter(
		(s) => s.isActive,
	);
	if (schemas.length === 0) return null;

	// Sort by version and return the latest
	return schemas.sort((a, b) => {
		const aVersion = a.version.split(".").map(Number);
		const bVersion = b.version.split(".").map(Number);

		for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
			const aNum = aVersion[i] || 0;
			const bNum = bVersion[i] || 0;
			if (aNum !== bNum) return bNum - aNum;
		}
		return 0;
	})[0];
}

/**
 * Validates if a schema version is supported
 */
export function isSchemaVersionSupported(version: string): boolean {
	return version in DEFAULT_SCHEMA_REGISTRY;
}

/**
 * Gets all supported schema versions
 */
export function getSupportedSchemaVersions(): string[] {
	return Object.keys(DEFAULT_SCHEMA_REGISTRY);
}
