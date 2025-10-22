/**
 * Feedback service for managing feedback operations
 */

import type { EvaluationRequest } from "../entities/EvaluationRequest.js";
import {
	canRetry,
	createEvaluationRequest,
	updateEvaluationStatus,
} from "../entities/EvaluationRequest.js";
import type { Feedback } from "../entities/Feedback.js";
import {
	createFeedback,
	getQualityLevel,
	validateFeedback,
} from "../entities/Feedback.js";
import type { Submission } from "../entities/Submission.js";
import { BusinessLogicError, ValidationError } from "../errors/LLMErrors.js";

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
		if (analysisResult.score < 0 || analysisResult.score > 100) {
			throw new ValidationError("Invalid score", {
				score: ["Score must be between 0 and 100"],
			});
		}

		if (analysisResult.feedback.length < 10) {
			throw new ValidationError("Invalid feedback", {
				feedback: ["Feedback must be at least 10 characters"],
			});
		}

		if (analysisResult.strengths.length === 0) {
			throw new ValidationError("Invalid strengths", {
				strengths: ["At least one strength must be provided"],
			});
		}

		if (analysisResult.improvements.length === 0) {
			throw new ValidationError("Invalid improvements", {
				improvements: ["At least one improvement must be provided"],
			});
		}

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
	 * Generate unique ID
	 */
	private generateId(): string {
		// Use crypto.randomUUID() if available, otherwise fallback to timestamp + random
		if (typeof crypto !== "undefined" && crypto.randomUUID) {
			return crypto.randomUUID();
		}

		// Fallback for environments without crypto.randomUUID
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}

/**
 * Create feedback service instance
 */
export function createFeedbackService(): IFeedbackService {
	return new FeedbackService();
}
