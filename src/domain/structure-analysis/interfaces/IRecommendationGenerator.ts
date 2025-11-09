/**
 * IRecommendationGenerator interface
 * @fileoverview Defines the contract for recommendation generation services
 */

import type { CleanupRecommendation } from "../entities/CleanupRecommendation";
import type { ProjectStructure } from "../entities/ProjectStructure";

/**
 * Recommendation generation options
 */
export interface RecommendationGenerationOptions {
	/**
	 * Maximum recommendations to generate
	 */
	maxRecommendations?: number;

	/**
	 * Minimum priority to include
	 */
	minPriority?: "low" | "medium" | "high" | "critical";

	/**
	 * Include quick wins only
	 */
	quickWinsOnly?: boolean;

	/**
	 * Custom prioritization weights
	 */
	prioritizationWeights?: {
		impact?: number;
		effort?: number;
		severity?: number;
	};
}

/**
 * Recommendation generation result
 */
export interface RecommendationGenerationResult {
	/**
	 * Generated recommendations
	 */
	recommendations: CleanupRecommendation[];

	/**
	 * Generation duration in milliseconds
	 */
	durationMs: number;

	/**
	 * Summary statistics
	 */
	summary: {
		totalRecommendations: number;
		quickWins: number;
		critical: number;
		estimatedValue: number;
	};
}

/**
 * Recommendation generator interface
 */
export interface IRecommendationGenerator {
	/**
	 * Generate cleanup recommendations
	 * @param structure - Project structure to analyze
	 * @param options - Generation options
	 * @returns Promise resolving to generation result
	 */
	generateRecommendations(
		structure: ProjectStructure,
		options?: RecommendationGenerationOptions,
	): Promise<RecommendationGenerationResult>;

	/**
	 * Prioritize recommendations
	 * @param recommendations - Recommendations to prioritize
	 * @returns Sorted recommendations
	 */
	prioritizeRecommendations(
		recommendations: CleanupRecommendation[],
	): CleanupRecommendation[];

	/**
	 * Calculate recommendation value
	 * @param recommendation - Recommendation to evaluate
	 * @returns Value score
	 */
	calculateRecommendationValue(recommendation: CleanupRecommendation): number;

	/**
	 * Generate consolidation recommendations
	 * @param structure - Project structure to analyze
	 * @returns Consolidation recommendations
	 */
	generateConsolidationRecommendations(
		structure: ProjectStructure,
	): Promise<CleanupRecommendation[]>;

	/**
	 * Generate refactoring recommendations
	 * @param structure - Project structure to analyze
	 * @returns Refactoring recommendations
	 */
	generateRefactoringRecommendations(
		structure: ProjectStructure,
	): Promise<CleanupRecommendation[]>;

	/**
	 * Generate cleanup recommendations
	 * @param structure - Project structure to analyze
	 * @returns Cleanup recommendations
	 */
	generateCleanupRecommendations(
		structure: ProjectStructure,
	): Promise<CleanupRecommendation[]>;

	/**
	 * Generate optimization recommendations
	 * @param structure - Project structure to analyze
	 * @returns Optimization recommendations
	 */
	generateOptimizationRecommendations(
		structure: ProjectStructure,
	): Promise<CleanupRecommendation[]>;
}
