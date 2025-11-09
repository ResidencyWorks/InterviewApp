/**
 * Feedback service for managing feedback operations
 */

import type { EvaluationRequest } from "../entities/EvaluationRequest";
import {
	canRetry,
	createEvaluationRequest,
	updateEvaluationStatus,
} from "../entities/EvaluationRequest";
import type { Feedback } from "../entities/Feedback";
import {
	createFeedback,
	getQualityLevel,
	validateFeedback,
} from "../entities/Feedback";
import type { Submission } from "../entities/Submission";
import { ValidationError } from "../errors/LLMErrors";

/**
 * Constants for Feedback Service
 */
const CONSTANTS = {
	VALIDATION: {
		MIN_SCORE: 0,
		MAX_SCORE: 100,
		MIN_FEEDBACK_LENGTH: 10,
		MIN_STRENGTHS_COUNT: 1,
		MIN_IMPROVEMENTS_COUNT: 1,
	} as const,
	ERROR_MESSAGES: {
		INVALID_SCORE: "Score must be between 0 and 100",
		INVALID_FEEDBACK: "Feedback must be at least 10 characters",
		INVALID_STRENGTHS: "At least one strength must be provided",
		INVALID_IMPROVEMENTS: "At least one improvement must be provided",
	} as const,
} as const;

/**
 * Feedback service interface
 */
export interface IFeedbackService {
	/**
	 * Create feedback for a submission
	 */
	createFeedback(
		submission: Submission,
		analysisResult: {
			score: number;
			feedback: string;
			strengths: string[];
			improvements: string[];
			model: string;
			processingTimeMs: number;
		},
	): Feedback;

	/**
	 * Create evaluation request for a submission
	 */
	createEvaluationRequest(submission: Submission): EvaluationRequest;

	/**
	 * Update evaluation request status
	 */
	updateEvaluationStatus(
		request: EvaluationRequest,
		status: "pending" | "processing" | "completed" | "failed" | "retrying",
		errorMessage?: string,
	): EvaluationRequest;

	/**
	 * Check if evaluation can be retried
	 */
	canRetryEvaluation(request: EvaluationRequest, maxRetries: number): boolean;

	/**
	 * Get feedback quality metrics
	 */
	getFeedbackMetrics(feedback: Feedback): {
		qualityLevel: string;
		hasStrengths: boolean;
		hasImprovements: boolean;
		processingEfficiency: "fast" | "normal" | "slow";
	};
}

/**
 * Feedback service implementation
 */
export class FeedbackService implements IFeedbackService {
	/**
	 * Create feedback for a submission
	 */
	createFeedback(
		submission: Submission,
		analysisResult: {
			score: number;
			feedback: string;
			strengths: string[];
			improvements: string[];
			model: string;
			processingTimeMs: number;
		},
	): Feedback {
		// Validate analysis result
		this.validateAnalysisResult(analysisResult);

		// Generate unique feedback ID
		const feedbackId = this.generateId();

		return createFeedback({
			id: feedbackId,
			submissionId: submission.id,
			score: analysisResult.score,
			feedback: analysisResult.feedback,
			strengths: analysisResult.strengths,
			improvements: analysisResult.improvements,
			model: analysisResult.model,
			processingTimeMs: analysisResult.processingTimeMs,
		});
	}

	/**
	 * Create evaluation request for a submission
	 */
	createEvaluationRequest(submission: Submission): EvaluationRequest {
		// Generate unique evaluation request ID
		const requestId = this.generateId();

		return createEvaluationRequest({
			id: requestId,
			submissionId: submission.id,
		});
	}

	/**
	 * Update evaluation request status
	 */
	updateEvaluationStatus(
		request: EvaluationRequest,
		status: "pending" | "processing" | "completed" | "failed" | "retrying",
		errorMessage?: string,
	): EvaluationRequest {
		return updateEvaluationStatus(request, status, errorMessage);
	}

	/**
	 * Check if evaluation can be retried
	 */
	canRetryEvaluation(request: EvaluationRequest, maxRetries: number): boolean {
		return canRetry(request, maxRetries);
	}

	/**
	 * Get feedback quality metrics
	 */
	getFeedbackMetrics(feedback: Feedback): {
		qualityLevel: string;
		hasStrengths: boolean;
		hasImprovements: boolean;
		processingEfficiency: "fast" | "normal" | "slow";
	} {
		const qualityLevel = getQualityLevel(feedback);

		// Determine processing efficiency based on processing time
		let processingEfficiency: "fast" | "normal" | "slow";
		if (feedback.processingTimeMs < 2000) {
			processingEfficiency = "fast";
		} else if (feedback.processingTimeMs < 5000) {
			processingEfficiency = "normal";
		} else {
			processingEfficiency = "slow";
		}

		return {
			qualityLevel,
			hasStrengths: feedback.strengths.length > 0,
			hasImprovements: feedback.improvements.length > 0,
			processingEfficiency,
		};
	}

	/**
	 * Validate feedback data
	 */
	validateFeedback(feedback: unknown): Feedback {
		return validateFeedback(feedback);
	}

	/**
	 * Validate analysis result
	 */
	private validateAnalysisResult(analysisResult: {
		score: number;
		feedback: string;
		strengths: string[];
		improvements: string[];
		model: string;
		processingTimeMs: number;
	}): void {
		if (
			analysisResult.score < CONSTANTS.VALIDATION.MIN_SCORE ||
			analysisResult.score > CONSTANTS.VALIDATION.MAX_SCORE
		) {
			throw new ValidationError("Invalid score", {
				score: [CONSTANTS.ERROR_MESSAGES.INVALID_SCORE],
			});
		}

		if (
			analysisResult.feedback.length < CONSTANTS.VALIDATION.MIN_FEEDBACK_LENGTH
		) {
			throw new ValidationError("Invalid feedback", {
				feedback: [CONSTANTS.ERROR_MESSAGES.INVALID_FEEDBACK],
			});
		}

		if (
			analysisResult.strengths.length < CONSTANTS.VALIDATION.MIN_STRENGTHS_COUNT
		) {
			throw new ValidationError("Invalid strengths", {
				strengths: [CONSTANTS.ERROR_MESSAGES.INVALID_STRENGTHS],
			});
		}

		if (
			analysisResult.improvements.length <
			CONSTANTS.VALIDATION.MIN_IMPROVEMENTS_COUNT
		) {
			throw new ValidationError("Invalid improvements", {
				improvements: [CONSTANTS.ERROR_MESSAGES.INVALID_IMPROVEMENTS],
			});
		}
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		// Use crypto.randomUUID() if available, otherwise fallback to timestamp + random
		if (typeof crypto !== "undefined" && crypto.randomUUID) {
			return crypto.randomUUID();
		}

		// Fallback for environments without crypto.randomUUID
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 11);
		return `${timestamp}-${random}`;
	}
}

/**
 * Create feedback service instance
 */
export function createFeedbackService(): IFeedbackService {
	return new FeedbackService();
}
