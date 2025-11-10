/**
 * Configuration schema for project structure analysis
 * @fileoverview Defines configuration types and validation for structure analysis
 */

import { z } from "zod";

/**
 * Analysis configuration options
 */
export const AnalysisConfigSchema = z.object({
	/**
	 * Directories to analyze
	 */
	directories: z.array(z.string()).min(1),

	/**
	 * Include unused files in analysis
	 */
	includeUnusedFiles: z.boolean().default(true),

	/**
	 * Include dependency analysis
	 */
	includeDependencies: z.boolean().default(true),

	/**
	 * Include pattern detection
	 */
	includePatterns: z.boolean().default(true),

	/**
	 * Minimum severity threshold for reporting issues
	 */
	severityThreshold: z
		.enum(["low", "medium", "high", "critical"])
		.default("medium"),

	/**
	 * Enable caching of analysis results
	 */
	enableCaching: z.boolean().default(true),

	/**
	 * Cache TTL in milliseconds
	 */
	cacheTtl: z.number().int().positive().default(3600000), // 1 hour

	/**
	 * Maximum concurrent analysis tasks
	 */
	maxConcurrency: z.number().int().positive().default(4),

	/**
	 * Timeout for analysis operations in milliseconds
	 */
	timeout: z.number().int().positive().default(30000), // 30 seconds
});

/**
 * Type inference for analysis configuration
 */
export type AnalysisConfig = z.infer<typeof AnalysisConfigSchema>;

/**
 * Default analysis configuration
 */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
	directories: ["src/", "app/", "supabase/", "scripts/"],
	includeUnusedFiles: true,
	includeDependencies: true,
	includePatterns: true,
	severityThreshold: "medium",
	enableCaching: true,
	cacheTtl: 3600000,
	maxConcurrency: 4,
	timeout: 30000,
};

/**
 * Validate analysis configuration
 * @param config - Configuration to validate
 * @returns Validated configuration or throws error
 */
export function validateAnalysisConfig(config: unknown): AnalysisConfig {
	return AnalysisConfigSchema.parse(config);
}

/**
 * Create analysis configuration from partial options
 * @param options - Partial configuration options
 * @returns Complete configuration with defaults
 */
export function createAnalysisConfig(
	options: Partial<AnalysisConfig>,
): AnalysisConfig {
	return {
		...DEFAULT_ANALYSIS_CONFIG,
		...options,
	};
}
