/**
 * Main LLM Feedback Service orchestrating the evaluation process
 */

import {
	CircuitBreakerError,
	LLMServiceError,
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
import {
	EvaluateSubmissionUseCase,
	type EvaluationRequestInput,
	type EvaluationResult,
} from "../use-cases/EvaluateSubmissionUseCase.js";

/**
 * Constants for LLM Feedback Service
 */
const CONSTANTS = {
	QUALITY_THRESHOLDS: {
		EXCELLENT: 90,
		GOOD: 75,
		FAIR: 60,
	} as const,
	ERROR_MESSAGES: {
		VALIDATION: "validation",
		AUTHENTICATION: "authentication",
		AUTHORIZATION: "authorization",
		TIMEOUT: "timeout",
		NETWORK: "network",
		RATE_LIMIT: "rate limit",
		TEMPORARY: "temporary",
		SERVICE_UNAVAILABLE: "service unavailable",
	} as const,
	FALLBACK_MESSAGES: {
		STRENGTH: "Your submission was received successfully",
		IMPROVEMENT: "Please try again later for detailed feedback",
	} as const,
} as const;

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
			await this.handleEvaluationError(error, input, submissionId, startTime);

			// Use fallback if enabled
			if (this.config.fallbackConfig.enabled) {
				return this.createFallbackResult(input, submissionId, error);
			}

			throw error;
		}
	}

	/**
	 * Handle evaluation errors with comprehensive tracking
	 */
	private async handleEvaluationError(
		error: unknown,
		input: EvaluationRequestInput,
		submissionId: string,
		startTime: number,
	): Promise<void> {
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
				strengths: [CONSTANTS.FALLBACK_MESSAGES.STRENGTH],
				improvements: [CONSTANTS.FALLBACK_MESSAGES.IMPROVEMENT],
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
			const message = error.message.toLowerCase();
			return (
				!message.includes(CONSTANTS.ERROR_MESSAGES.VALIDATION) &&
				!message.includes(CONSTANTS.ERROR_MESSAGES.AUTHENTICATION) &&
				!message.includes(CONSTANTS.ERROR_MESSAGES.AUTHORIZATION)
			);
		}

		// Retry on network errors, timeouts, and rate limits
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes(CONSTANTS.ERROR_MESSAGES.TIMEOUT) ||
				message.includes(CONSTANTS.ERROR_MESSAGES.NETWORK) ||
				message.includes(CONSTANTS.ERROR_MESSAGES.RATE_LIMIT) ||
				message.includes(CONSTANTS.ERROR_MESSAGES.TEMPORARY) ||
				message.includes(CONSTANTS.ERROR_MESSAGES.SERVICE_UNAVAILABLE)
			);
		}

		return false;
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
		if (score >= CONSTANTS.QUALITY_THRESHOLDS.EXCELLENT) return "excellent";
		if (score >= CONSTANTS.QUALITY_THRESHOLDS.GOOD) return "good";
		if (score >= CONSTANTS.QUALITY_THRESHOLDS.FAIR) return "fair";
		return "poor";
	}

	/**
	 * Create feedback service
	 */
	private createFeedbackService(): IFeedbackService {
		// Import here to avoid circular dependencies
		const {
			FeedbackService,
		} = require("../../domain/services/FeedbackService");
		return new FeedbackService();
	}

	/**
	 * Create status tracking service
	 */
	private createStatusTrackingService(): IStatusTrackingService {
		// Import here to avoid circular dependencies
		const {
			StatusTrackingService,
		} = require("../../domain/services/StatusTrackingService");
		return new StatusTrackingService();
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
	 * Get service configuration
	 */
	getConfig() {
		return this.config;
	}

	/**
	 * Get fallback configuration
	 */
	getFallbackConfig() {
		return this.config.fallbackConfig;
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
