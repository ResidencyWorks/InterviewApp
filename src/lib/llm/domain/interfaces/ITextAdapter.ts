/**
 * Interface for text analysis adapters
 */

import type { Feedback } from "../entities/Feedback.js";
import type { Submission } from "../entities/Submission.js";

/**
 * Text analysis result
 */
export interface TextAnalysisResult {
	score: number;
	feedback: string;
	strengths: string[];
	improvements: string[];
	reasoning?: string;
}

/**
 * Text adapter interface for analyzing text content
 */
export interface ITextAdapter {
	/**
	 * Analyze text content and generate feedback
	 * @param text - Text content to analyze
	 * @param options - Analysis options
	 * @returns Promise resolving to analysis result
	 */
	analyze(
		text: string,
		options?: TextAnalysisOptions,
	): Promise<TextAnalysisResult>;

	/**
	 * Get the model name used by this adapter
	 * @returns Model name
	 */
	getModelName(): string;

	/**
	 * Get maximum text length supported by the adapter
	 * @returns Maximum text length in characters
	 */
	getMaxTextLength(): number;

	/**
	 * Check if the adapter is available
	 * @returns True if adapter is ready to use
	 */
	isAvailable(): Promise<boolean>;
}

/**
 * Text analysis options
 */
export interface TextAnalysisOptions {
	/**
	 * Question ID or context for the analysis
	 */
	questionId?: string;

	/**
	 * User ID for personalization
	 */
	userId?: string;

	/**
	 * Additional context or instructions
	 */
	context?: string;

	/**
	 * Temperature for text generation (0.0 to 1.0)
	 */
	temperature?: number;

	/**
	 * Maximum tokens for response
	 */
	maxTokens?: number;

	/**
	 * Custom prompt template
	 */
	promptTemplate?: string;
}

/**
 * Text adapter configuration
 */
export interface TextAdapterConfig {
	/**
	 * API key for the text service
	 */
	apiKey: string;

	/**
	 * Model to use for text analysis
	 */
	model?: string;

	/**
	 * Base URL for the API (if different from default)
	 */
	baseURL?: string;

	/**
	 * Request timeout in milliseconds
	 */
	timeout?: number;

	/**
	 * Maximum retry attempts
	 */
	maxRetries?: number;

	/**
	 * Default prompt template
	 */
	defaultPromptTemplate?: string;
}
