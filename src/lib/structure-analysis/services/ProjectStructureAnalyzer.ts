/**
 * ProjectStructureAnalyzer service
 * @fileoverview Main analysis service for project structure analysis using Onion Architecture pattern
 */

import type { Directory } from "../entities/Directory.js";
import type { ProjectStructure } from "../entities/ProjectStructure.js";
import { createProjectStructure } from "../entities/ProjectStructure.js";
import type {
	AnalysisResult,
	IAnalysisService,
	ProgressCallback,
} from "../interfaces/IAnalysisService.js";
import type { AnalysisOptions } from "../types/analysis-options.js";
import { FileSystemScanner } from "./FileSystemScanner.js";

/**
 * ProjectStructureAnalyzer implementing Onion Architecture
 *
 * Domain Layer (Core Logic):
 * - ProjectStructureAnalyzer: Orchestrates the analysis flow
 *
 * Application Services:
 * - FileSystemScanner: Scans file system (infrastructure)
 * - DependencyAnalyzer: Analyzes dependencies (infrastructure)
 * - PatternMatcher: Matches patterns (infrastructure)
 *
 * The analyzer remains independent of frameworks and infrastructure details
 */
export class ProjectStructureAnalyzer implements IAnalysisService {
	private ongoingAnalyses = new Map<string, { cancel: () => void }>();

	/**
	 * Analyze project structure
	 * @param options - Analysis options
	 * @param progressCallback - Optional progress callback
	 * @returns Promise resolving to analysis result
	 */
	async analyze(
		options: AnalysisOptions,
		progressCallback?: ProgressCallback,
	): Promise<AnalysisResult> {
		const analysisId = crypto.randomUUID();

		try {
			progressCallback?.({
				status: "running",
				progress: 0,
				currentOperation: "Initializing analysis...",
			});

			// Start with file system scanning (infrastructure layer)
			progressCallback?.({
				status: "running",
				progress: 20,
				currentOperation: "Scanning file system...",
			});

			const scanner = new FileSystemScanner();
			const scanResult = await scanner.scanFileSystem({
				directories: options.targetDirectories || options.directories,
				includePatterns: options.includePatterns,
				excludePatterns: options.excludePatterns,
				maxDepth: options.maxDepth,
				followSymlinks: options.followSymlinks,
			});

			// Analyze the structure (domain logic)
			progressCallback?.({
				status: "running",
				progress: 50,
				currentOperation: "Analyzing structure...",
			});

			const structure = await this.analyzeProjectStructure(
				scanResult.directories,
			);

			// Generate final result
			progressCallback?.({
				status: "completed",
				progress: 100,
				currentOperation: "Analysis complete",
			});

			const durationMs = scanResult.durationMs;

			return {
				id: analysisId,
				structure,
				status: "completed",
				durationMs,
				timestamp: new Date(),
			};
		} catch (error) {
			progressCallback?.({
				status: "failed",
				progress: 0,
				currentOperation: "Analysis failed",
			});

			return {
				id: analysisId,
				structure: this.createEmptyStructure(),
				status: "failed",
				error: error instanceof Error ? error.message : "Unknown error",
				durationMs: 0,
				timestamp: new Date(),
			};
		}
	}

	/**
	 * Get analysis by ID
	 * @param analysisId - Analysis ID
	 * @returns Promise resolving to analysis result or null
	 */
	async getAnalysis(_analysisId: string): Promise<AnalysisResult | null> {
		// In a real implementation, this would fetch from persistent storage
		// For now, return null
		return null;
	}

	/**
	 * Cancel ongoing analysis
	 * @param analysisId - Analysis ID
	 * @returns Promise resolving when cancelled
	 */
	async cancelAnalysis(analysisId: string): Promise<void> {
		const analysis = this.ongoingAnalyses.get(analysisId);
		if (analysis) {
			analysis.cancel();
			this.ongoingAnalyses.delete(analysisId);
		}
	}

	/**
	 * Get analysis status
	 * @param analysisId - Analysis ID
	 * @returns Promise resolving to status
	 */
	async getAnalysisStatus(_analysisId: string): Promise<{
		status: "pending" | "running" | "completed" | "failed";
		progress: number;
		estimatedTimeRemaining?: number;
	}> {
		// In a real implementation, this would check storage
		// For now, return a default status
		return {
			status: "completed",
			progress: 100,
		};
	}

	/**
	 * Analyze project structure from directories
	 * @param directories - Scanned directories
	 * @returns Promise resolving to project structure
	 */
	private async analyzeProjectStructure(
		directories: Directory[],
	): Promise<ProjectStructure> {
		// Calculate totals
		const totalFiles = directories.reduce(
			(sum, dir) => sum + (dir.totalFiles || 0),
			0,
		);
		const totalDirectories =
			directories.length +
			directories.reduce((sum, dir) => sum + (dir.totalDirectories || 0), 0);

		// Create structure (domain logic)
		return createProjectStructure({
			directories,
			totalFiles,
			totalDirectories,
			duplications: [],
			inconsistencies: [],
			recommendations: [],
		});
	}

	/**
	 * Create empty structure
	 * @returns Empty project structure
	 */
	private createEmptyStructure(): ProjectStructure {
		return createProjectStructure({
			directories: [],
			totalFiles: 0,
			totalDirectories: 0,
			duplications: [],
			inconsistencies: [],
			recommendations: [],
		});
	}
}
