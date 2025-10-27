/**
 * Analysis options and types
 * @fileoverview Type definitions for project structure analysis
 */

import type { AnalysisConfig } from "../config/schema.js";

/**
 * Analysis options for running structure analysis
 */
export interface AnalysisOptions
	extends Omit<AnalysisConfig, "includePatterns"> {
	/**
	 * Target directories for analysis
	 */
	targetDirectories?: string[];

	/**
	 * File patterns to include in analysis
	 */
	includePatterns?: string[];

	/**
	 * File patterns to exclude from analysis
	 */
	excludePatterns?: string[];

	/**
	 * Depth limit for directory traversal
	 */
	maxDepth?: number;

	/**
	 * Whether to follow symbolic links
	 */
	followSymlinks?: boolean;

	/**
	 * Output format for analysis results
	 */
	outputFormat?: "json" | "csv" | "markdown";

	/**
	 * Include file content analysis
	 */
	analyzeContent?: boolean;

	/**
	 * Include Git history analysis
	 */
	analyzeGitHistory?: boolean;
}

/**
 * Default analysis options
 */
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
	directories: [],
	includeUnusedFiles: true,
	includeDependencies: true,
	severityThreshold: "medium",
	enableCaching: true,
	cacheTtl: 3600000,
	maxConcurrency: 4,
	timeout: 30000,
	targetDirectories: [],
	excludePatterns: ["node_modules", ".git", "dist", "build"],
	includePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
	maxDepth: 10,
	followSymlinks: false,
	outputFormat: "json",
	analyzeContent: false,
	analyzeGitHistory: false,
};

/**
 * Analysis result status
 */
export type AnalysisStatus = "pending" | "running" | "completed" | "failed";

/**
 * Analysis progress information
 */
export interface AnalysisProgress {
	/**
	 * Current status
	 */
	status: AnalysisStatus;

	/**
	 * Progress percentage (0-100)
	 */
	progress: number;

	/**
	 * Current operation description
	 */
	currentOperation?: string;

	/**
	 * Estimated time remaining in milliseconds
	 */
	estimatedTimeRemaining?: number;

	/**
	 * Start timestamp
	 */
	startedAt?: Date;

	/**
	 * Completion timestamp
	 */
	completedAt?: Date;
}

/**
 * Analysis report metadata
 */
export interface AnalysisReportMetadata {
	/**
	 * Report ID
	 */
	id: string;

	/**
	 * Generation timestamp
	 */
	generatedAt: Date;

	/**
	 * Analysis duration in milliseconds
	 */
	durationMs: number;

	/**
	 * Total files analyzed
	 */
	totalFiles: number;

	/**
	 * Total directories analyzed
	 */
	totalDirectories: number;

	/**
	 * Total issues found
	 */
	totalIssues: number;
}
