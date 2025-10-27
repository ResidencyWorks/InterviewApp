/**
 * IAnalysisService interface
 * @fileoverview Defines the contract for project structure analysis services
 */

import type { ProjectStructure } from "../entities/ProjectStructure";
import type { AnalysisOptions } from "../types/analysis-options";

/**
 * Analysis result
 */
export interface AnalysisResult {
	/**
	 * Analysis ID
	 */
	id: string;

	/**
	 * Project structure analysis result
	 */
	structure: ProjectStructure;

	/**
	 * Analysis status
	 */
	status: "completed" | "failed";

	/**
	 * Error message if failed
	 */
	error?: string;

	/**
	 * Analysis duration in milliseconds
	 */
	durationMs: number;

	/**
	 * Analysis timestamp
	 */
	timestamp: Date;
}

/**
 * Analysis progress callback
 */
export type ProgressCallback = (progress: {
	status: "pending" | "running" | "completed" | "failed";
	progress: number;
	currentOperation?: string;
	estimatedTimeRemaining?: number;
}) => void;

/**
 * Analysis service interface
 */
export interface IAnalysisService {
	/**
	 * Analyze project structure
	 * @param options - Analysis options
	 * @param progressCallback - Optional progress callback
	 * @returns Promise resolving to analysis result
	 */
	analyze(
		options: AnalysisOptions,
		progressCallback?: ProgressCallback,
	): Promise<AnalysisResult>;

	/**
	 * Get analysis by ID
	 * @param analysisId - Analysis ID
	 * @returns Promise resolving to analysis result or null
	 */
	getAnalysis(analysisId: string): Promise<AnalysisResult | null>;

	/**
	 * Cancel ongoing analysis
	 * @param analysisId - Analysis ID
	 * @returns Promise resolving when cancelled
	 */
	cancelAnalysis(analysisId: string): Promise<void>;

	/**
	 * Get analysis status
	 * @param analysisId - Analysis ID
	 * @returns Promise resolving to status
	 */
	getAnalysisStatus(analysisId: string): Promise<{
		status: "pending" | "running" | "completed" | "failed";
		progress: number;
		estimatedTimeRemaining?: number;
	}>;
}
