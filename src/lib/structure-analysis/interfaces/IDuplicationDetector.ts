/**
 * IDuplicationDetector interface
 * @fileoverview Defines the contract for duplication detection services
 */

import type { File } from "../entities/File";
import type { ServiceDuplication } from "../entities/ServiceDuplication";

/**
 * Duplication detection options
 */
export interface DuplicationDetectionOptions {
	/**
	 * Minimum overlap percentage to report
	 */
	minOverlapPercentage?: number;

	/**
	 * Maximum files to compare per group
	 */
	maxFilesPerGroup?: number;

	/**
	 * Enable similarity analysis
	 */
	enableSimilarityAnalysis?: boolean;

	/**
	 * Similarity threshold (0-1)
	 */
	similarityThreshold?: number;
}

/**
 * Duplication detection result
 */
export interface DuplicationDetectionResult {
	/**
	 * Detected duplications
	 */
	duplications: ServiceDuplication[];

	/**
	 * Total files analyzed
	 */
	totalFiles: number;

	/**
	 * Detection duration in milliseconds
	 */
	durationMs: number;
}

/**
 * Duplication detector interface
 */
export interface IDuplicationDetector {
	/**
	 * Detect duplications in files
	 * @param files - Files to analyze
	 * @param options - Detection options
	 * @returns Promise resolving to detection result
	 */
	detectDuplications(
		files: File[],
		options?: DuplicationDetectionOptions,
	): Promise<DuplicationDetectionResult>;

	/**
	 * Compare two files for duplication
	 * @param file1 - First file
	 * @param file2 - Second file
	 * @returns Duplication information or null if no duplication
	 */
	compareFiles(file1: File, file2: File): Promise<ServiceDuplication | null>;

	/**
	 * Group files by similarity
	 * @param files - Files to group
	 * @returns Grouped files
	 */
	groupBySimilarity(files: File[]): Promise<File[][]>;
}
