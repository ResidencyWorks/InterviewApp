/**
 * Main LLM Feedback Service orchestrating the evaluation process
 */

import {
	CircuitBreakerError,
	LLMServiceError,
	RetryExhaustedError,
} from "../../domain/errors/LLMErrors.js";
import type { ISpeechAdapter } from "../../domain/interfaces/ISpeechAdapter.js";
import type { ITextAdapter } from "../../domain/interfaces/ITextAdapter.js";
import type { IFeedbackService } from "../../domain/services/FeedbackService.js";
import type { IStatusTrackingService } from "../../domain/services/StatusTrackingService.js";
import { PostHogAnalytics } from "../../infrastructure/analytics/PostHogAnalytics.js";
import { SentryMonitoring } from "../../infrastructure/monitoring/SentryMonitoring.js";
import {
	CircuitBreaker,
	type CircuitBreakerState,
} from "../../infrastructure/retry/CircuitBreaker.js";
import { RetryService } from "../../infrastructure/retry/RetryService.js";
import type { LLMServiceConfig } from "../../types/config.js";
import {
	EvaluateSubmissionUseCase,
	type EvaluationRequestInput,
	type EvaluationResult,
} from "../use-cases/EvaluateSubmissionUseCase.js";

/**
 * LLM Feedback Service configuration
 */
export interface LLMFeedbackServiceConfig {
	speechAdapter: ISpeechAdapter;
	textAdapter: ITextAdapter;
	retryConfig: {
		maxAttempts: number;
		baseDelay: number;
		maxDelay: number;
		jitter: boolean;
	};
	circuitBreakerConfig: {
		threshold: number;
		timeout: number;
	};
	fallbackConfig: {
		enabled: boolean;
		defaultScore: number;
		defaultFeedback: string;
	};
	analyticsConfig: {
		posthogApiKey?: string;
		posthogHost?: string;
		sentryDsn?: string;
	};
	debug?: boolean;
}

/**
 * Main LLM Feedback Service
 */
export class LLMFeedbackService {
	private evaluateUseCase: EvaluateSubmissionUseCase;
	private retryService: RetryService;
	private circuitBreaker: CircuitBreaker;
	private analytics: PostHogAnalytics;
	private monitoring: SentryMonitoring;
	private feedbackService: IFeedbackService;
	private statusTrackingService: IStatusTrackingService;
	private config: LLMFeedbackServiceConfig;

	constructor(config: LLMFeedbackServiceConfig) {
		this.config = config;
		this.feedbackService = this.createFeedbackService();
		this.statusTrackingService = this.createStatusTrackingService();
		this.evaluateUseCase = new EvaluateSubmissionUseCase(
			config.speechAdapter,
			config.textAdapter,
			this.feedbackService,
			this.statusTrackingService,
			config.retryConfig.maxAttempts,
		);

		// Initialize infrastructure services
		this.retryService = new RetryService(config.retryConfig);
		this.circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig);
		this.analytics = new PostHogAnalytics(config.analyticsConfig);
		this.monitoring = new SentryMonitoring(config.analyticsConfig);
	}

	/**
	 * Evaluate a submission with comprehensive error handling and monitoring
	 */
	async evaluateSubmission(
		input: EvaluationRequestInput,
	): Promise<EvaluationResult> {
		const startTime = Date.now();
		const submissionId = this.generateId();

		// Track request start
		this.analytics.trackLLMRequestStarted({
			submissionId,
			userId: input.userId,
			questionId: input.questionId,
			contentType: input.audioUrl ? "audio" : "text",
			model: this.config.textAdapter.getModelName(),
		});

		// Track audio processing start if applicable
		if (input.audioUrl) {
			this.analytics.trackAudioProcessing({
				submissionId,
				userId: input.userId,
				event: "transcription_started",
				audioUrl: input.audioUrl,
			});
		}

		this.monitoring.addBreadcrumb("LLM evaluation started", "evaluation", {
			submissionId,
			userId: input.userId,
			questionId: input.questionId,
		});

		try {
			// Execute through circuit breaker
			const result = await this.circuitBreaker.execute(async () => {
				// Execute with retry logic
				const retryResult = await this.retryService.execute(
					() => this.evaluateUseCase.execute(input),
					{
						shouldRetry: (error) => this.shouldRetry(error),
					},
				);

				return retryResult.result;
			});

			// Track audio processing completion if applicable
			if (input.audioUrl) {
				this.analytics.trackAudioProcessing({
					submissionId,
					userId: input.userId,
					event: "transcription_completed",
					audioUrl: input.audioUrl,
					processingTimeMs: result.processingTimeMs,
				});
			}

			// Track successful completion
			this.analytics.trackLLMRequestCompleted({
				submissionId,
				userId: input.userId,
				questionId: input.questionId,
				score: result.feedback.score,
				processingTimeMs: result.processingTimeMs,
				model: result.feedback.model,
				contentType: input.audioUrl ? "audio" : "text",
			});

			this.analytics.trackScoreReturned({
				submissionId,
				userId: input.userId,
				questionId: input.questionId,
				score: result.feedback.score,
				qualityLevel: this.getQualityLevel(result.feedback.score),
				processingTimeMs: result.processingTimeMs,
			});

			if (this.config.debug) {
				console.log(
					`LLM evaluation completed for submission ${submissionId}:`,
					{
						score: result.feedback.score,
						processingTimeMs: result.processingTimeMs,
					},
				);
			}

			return result;
		} catch (error) {
			// Handle different types of errors
			if (error instanceof CircuitBreakerError) {
				this.analytics.trackCircuitBreakerOpened({
					service: "llm-feedback-service",
					failureCount: this.circuitBreaker.getStats().failureCount,
					threshold: this.config.circuitBreakerConfig.threshold,
				});

				this.monitoring.captureCircuitBreakerEvent({
					action: "opened",
					service: "llm-feedback-service",
					failureCount: this.circuitBreaker.getStats().failureCount,
					threshold: this.config.circuitBreakerConfig.threshold,
				});
			}

			// Track audio processing failure if applicable
			if (input.audioUrl) {
				this.analytics.trackAudioProcessing({
					submissionId,
					userId: input.userId,
					event: "transcription_failed",
					audioUrl: input.audioUrl,
					errorCode: this.getErrorCode(error),
				});
			}

			// Track failure
			this.analytics.trackLLMRequestFailed({
				submissionId,
				userId: input.userId,
				questionId: input.questionId,
				errorCode: this.getErrorCode(error),
				errorMessage: error instanceof Error ? error.message : "Unknown error",
				attempts: this.retryService.getConfig().maxAttempts,
				model: this.config.textAdapter.getModelName(),
				contentType: input.audioUrl ? "audio" : "text",
			});

			// Capture error in monitoring
			this.monitoring.captureLLMError(error, {
				submissionId,
				userId: input.userId,
				questionId: input.questionId,
				operation: "evaluate_submission",
				model: this.config.textAdapter.getModelName(),
				processingTimeMs: Date.now() - startTime,
			});

			// Use fallback if enabled
			if (this.config.fallbackConfig.enabled) {
				return this.createFallbackResult(input, submissionId, error);
			}

			throw error;
		}
	}

	/**
	 * Create fallback result when evaluation fails
	 */
	private createFallbackResult(
		input: EvaluationRequestInput,
		submissionId: string,
		originalError: unknown,
	): EvaluationResult {
		const fallbackFeedback = this.feedbackService.createFeedback(
			{
				id: submissionId,
				userId: input.userId,
				content: input.content,
				audioUrl: input.audioUrl,
				questionId: input.questionId,
				submittedAt: new Date(),
				metadata: input.metadata,
			},
			{
				score: this.config.fallbackConfig.defaultScore,
				feedback: this.config.fallbackConfig.defaultFeedback,
				strengths: ["Your submission was received successfully"],
				improvements: ["Please try again later for detailed feedback"],
				model: "fallback",
				processingTimeMs: 0,
			},
		);

		// Track fallback usage
		this.analytics.trackFallbackUsed({
			submissionId,
			userId: input.userId,
			reason:
				originalError instanceof Error
					? originalError.message
					: "Unknown error",
			fallbackScore: this.config.fallbackConfig.defaultScore,
		});

		return {
			submission: {
				id: submissionId,
				userId: input.userId,
				content: input.content,
				audioUrl: input.audioUrl,
				questionId: input.questionId,
				submittedAt: new Date(),
				metadata: input.metadata,
			},
			feedback: fallbackFeedback,
			evaluationRequest: this.feedbackService.createEvaluationRequest({
				id: submissionId,
				userId: input.userId,
				content: input.content,
				audioUrl: input.audioUrl,
				questionId: input.questionId,
				submittedAt: new Date(),
				metadata: input.metadata,
			}),
			status: {
				id: this.generateId(),
				submissionId,
				status: "failed",
				progress: 0,
				startedAt: new Date(),
				updatedAt: new Date(),
				errorMessage:
					originalError instanceof Error
						? originalError.message
						: "Unknown error",
			},
			processingTimeMs: 0,
		};
	}

	/**
	 * Determine if an error should trigger a retry
	 */
	private shouldRetry(error: unknown): boolean {
		if (error instanceof LLMServiceError) {
			// Don't retry validation errors or authentication errors
			return (
				!error.message.includes("validation") &&
				!error.message.includes("authentication") &&
				!error.message.includes("authorization")
			);
		}

		// Retry on network errors, timeouts, and rate limits
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("timeout") ||
				message.includes("network") ||
				message.includes("rate limit") ||
				message.includes("temporary") ||
				message.includes("service unavailable")
			);
		}

		return false;
	}

	/**
	 * Handle retry attempts
	 */
	private handleRetry(
		attempt: number,
		error: unknown,
		submissionId: string,
		userId: string,
	): void {
		this.analytics.trackRetryAttempt({
			submissionId,
			userId,
			attempt,
			errorCode: this.getErrorCode(error),
			delayMs: this.calculateRetryDelay(attempt),
		});

		this.monitoring.addBreadcrumb(`Retry attempt ${attempt}`, "retry", {
			submissionId,
			userId,
			attempt,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}

	/**
	 * Calculate retry delay
	 */
	private calculateRetryDelay(attempt: number): number {
		const baseDelay = this.config.retryConfig.baseDelay;
		const maxDelay = this.config.retryConfig.maxDelay;
		const delay = baseDelay * 2 ** (attempt - 1);
		return Math.min(delay, maxDelay);
	}

	/**
	 * Get error code from error
	 */
	private getErrorCode(error: unknown): string {
		if (error instanceof LLMServiceError) {
			return error.code;
		}
		if (error instanceof Error) {
			return "UNKNOWN_ERROR";
		}
		return "UNKNOWN_ERROR";
	}

	/**
	 * Get quality level from score
	 */
	private getQualityLevel(
		score: number,
	): "excellent" | "good" | "fair" | "poor" {
		if (score >= 90) return "excellent";
		if (score >= 75) return "good";
		if (score >= 60) return "fair";
		return "poor";
	}

	/**
	 * Create feedback service
	 */
	private createFeedbackService(): IFeedbackService {
		// Import here to avoid circular dependencies
		const {
			createFeedbackService,
		} = require("../../domain/services/FeedbackService.js");
		return createFeedbackService();
	}

	/**
	 * Create status tracking service
	 */
	private createStatusTrackingService(): IStatusTrackingService {
		// Import here to avoid circular dependencies
		const {
			createStatusTrackingService,
		} = require("../../domain/services/StatusTrackingService.js");
		return createStatusTrackingService();
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

	/**
	 * Get service health status
	 */
	async getHealthStatus(): Promise<{
		status: "healthy" | "degraded" | "unhealthy";
		circuitBreaker: CircuitBreakerState;
		adapters: {
			speech: boolean;
			text: boolean;
		};
		analytics: boolean;
		monitoring: boolean;
	}> {
		const circuitBreakerStats = this.circuitBreaker.getStats();
		const speechAvailable = true; // Speech adapter is always available
		const textAvailable = await this.config.textAdapter.isAvailable();

		let status: "healthy" | "degraded" | "unhealthy" = "healthy";

		if (circuitBreakerStats.state === "open" || !textAvailable) {
			status = "unhealthy";
		} else if (circuitBreakerStats.state === "half-open" || !speechAvailable) {
			status = "degraded";
		}

		return {
			status,
			circuitBreaker: circuitBreakerStats.state,
			adapters: {
				speech: speechAvailable,
				text: textAvailable,
			},
			analytics: this.analytics.isEnabled(),
			monitoring: this.monitoring.isEnabled(),
		};
	}

	/**
	 * Update service configuration
	 */
	updateConfig(config: Partial<LLMFeedbackServiceConfig>): void {
		this.config = { ...this.config, ...config };

		// Update infrastructure services
		this.retryService.updateConfig(config.retryConfig || {});
		this.circuitBreaker.updateConfig(config.circuitBreakerConfig || {});
		this.analytics.updateConfig(config.analyticsConfig || {});
		this.monitoring.updateConfig(config.analyticsConfig || {});
	}

	/**
	 * Shutdown the service
	 */
	async shutdown(): Promise<void> {
		await this.analytics.flush();
		await this.analytics.shutdown();
	}
}

/**
 * Create LLM Feedback Service instance
 */
export function createLLMFeedbackService(
	config: LLMFeedbackServiceConfig,
): LLMFeedbackService {
	return new LLMFeedbackService(config);
}
