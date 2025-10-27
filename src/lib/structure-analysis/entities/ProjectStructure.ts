/**
 * ProjectStructure entity
 * @fileoverview Represents the overall organization of directories, files, and their relationships
 */

import type { CleanupRecommendation } from "./CleanupRecommendation.js";
import type { Directory } from "./Directory.js";
import type { ServiceDuplication } from "./ServiceDuplication.js";
import type { StructuralInconsistency } from "./StructuralInconsistency.js";

/**
 * Overall project structure analysis result
 */
export interface ProjectStructure {
	/**
	 * Unique identifier for the structure analysis
	 */
	id: string;

	/**
	 * List of analyzed directories
	 */
	directories: Directory[];

	/**
	 * Total number of files analyzed
	 */
	totalFiles: number;

	/**
	 * Total number of directories analyzed
	 */
	totalDirectories: number;

	/**
	 * When the analysis was performed
	 */
	analysisTimestamp: Date;

	/**
	 * List of identified duplications
	 */
	duplications: ServiceDuplication[];

	/**
	 * List of structural issues
	 */
	inconsistencies: StructuralInconsistency[];

	/**
	 * List of improvement recommendations
	 */
	recommendations: CleanupRecommendation[];
}

/**
 * Create a new ProjectStructure instance
 * @param options - Project structure options
 * @returns New ProjectStructure instance
 */
export function createProjectStructure(
	options: Partial<Omit<ProjectStructure, "id" | "analysisTimestamp">> & {
		directories: Directory[];
	},
): ProjectStructure {
	return {
		id: crypto.randomUUID(),
		directories: options.directories,
		totalFiles: options.totalFiles ?? 0,
		totalDirectories: options.totalDirectories ?? options.directories.length,
		analysisTimestamp: new Date(),
		duplications: options.duplications ?? [],
		inconsistencies: options.inconsistencies ?? [],
		recommendations: options.recommendations ?? [],
	};
}

/**
 * Validate project structure instance
 * @param structure - ProjectStructure to validate
 * @returns True if valid
 */
export function validateProjectStructure(
	structure: unknown,
): structure is ProjectStructure {
	return (
		typeof structure === "object" &&
		structure !== null &&
		"id" in structure &&
		"directories" in structure &&
		"totalFiles" in structure &&
		"totalDirectories" in structure &&
		"analysisTimestamp" in structure &&
		"duplications" in structure &&
		"inconsistencies" in structure &&
		"recommendations" in structure
	);
}
