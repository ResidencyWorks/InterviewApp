/**
 * PostHog analytics integration for LLM service
 */

import { PostHog } from "posthog-node";
import type { AnalyticsConfig } from "../../types/config";

/**
 * PostHog analytics service for LLM operations
 */
export class PostHogAnalytics {
	private posthog: PostHog | null = null;
	private config: AnalyticsConfig;

	constructor(config: AnalyticsConfig) {
		this.config = config;
		this.initialize();
	}

	/**
	 * Initialize PostHog client
	 */
	private initialize(): void {
		if (this.config.posthogApiKey) {
			this.posthog = new PostHog(this.config.posthogApiKey, {
				host: this.config.posthogHost,
				flushAt: 1, // Flush immediately for real-time analytics
				flushInterval: 1000,
			});
		}
	}

	/**
	 * Track LLM request started
	 */
	trackLLMRequestStarted(data: {
		submissionId: string;
		userId: string;
		questionId: string;
		contentType: "text" | "audio";
		model?: string;
	}): void {
		this.track("llm_request_started", {
			submission_id: data.submissionId,
			user_id: data.userId,
			question_id: data.questionId,
			content_type: data.contentType,
			model: data.model,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track LLM request completed
	 */
	trackLLMRequestCompleted(data: {
		submissionId: string;
		userId: string;
		questionId: string;
		score: number;
		processingTimeMs: number;
		model: string;
		contentType: "text" | "audio";
	}): void {
		this.track("llm_request_completed", {
			submission_id: data.submissionId,
			user_id: data.userId,
			question_id: data.questionId,
			score: data.score,
			processing_time_ms: data.processingTimeMs,
			model: data.model,
			content_type: data.contentType,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track LLM request failed
	 */
	trackLLMRequestFailed(data: {
		submissionId: string;
		userId: string;
		questionId: string;
		errorCode: string;
		errorMessage: string;
		attempts: number;
		model?: string;
		contentType: "text" | "audio";
	}): void {
		this.track("llm_request_failed", {
			submission_id: data.submissionId,
			user_id: data.userId,
			question_id: data.questionId,
			error_code: data.errorCode,
			error_message: data.errorMessage,
			attempts: data.attempts,
			model: data.model,
			content_type: data.contentType,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track retry attempt
	 */
	trackRetryAttempt(data: {
		submissionId: string;
		userId: string;
		attempt: number;
		errorCode: string;
		delayMs: number;
	}): void {
		this.track("llm_retry_attempted", {
			submission_id: data.submissionId,
			user_id: data.userId,
			attempt: data.attempt,
			error_code: data.errorCode,
			delay_ms: data.delayMs,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track circuit breaker opened
	 */
	trackCircuitBreakerOpened(data: {
		service: string;
		failureCount: number;
		threshold: number;
	}): void {
		this.track("llm_circuit_breaker_opened", {
			service: data.service,
			failure_count: data.failureCount,
			threshold: data.threshold,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track circuit breaker closed
	 */
	trackCircuitBreakerClosed(data: {
		service: string;
		successCount: number;
	}): void {
		this.track("llm_circuit_breaker_closed", {
			service: data.service,
			success_count: data.successCount,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track fallback used
	 */
	trackFallbackUsed(data: {
		submissionId: string;
		userId: string;
		reason: string;
		fallbackScore: number;
	}): void {
		this.track("llm_fallback_used", {
			submission_id: data.submissionId,
			user_id: data.userId,
			reason: data.reason,
			fallback_score: data.fallbackScore,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track score returned
	 */
	trackScoreReturned(data: {
		submissionId: string;
		userId: string;
		questionId: string;
		score: number;
		qualityLevel: "excellent" | "good" | "fair" | "poor";
		processingTimeMs: number;
	}): void {
		this.track("score_returned", {
			submission_id: data.submissionId,
			user_id: data.userId,
			question_id: data.questionId,
			score: data.score,
			quality_level: data.qualityLevel,
			processing_time_ms: data.processingTimeMs,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track audio processing events
	 */
	trackAudioProcessing(data: {
		submissionId: string;
		userId: string;
		event:
			| "transcription_started"
			| "transcription_completed"
			| "transcription_failed";
		audioUrl?: string;
		processingTimeMs?: number;
		errorCode?: string;
	}): void {
		this.track("llm_audio_processing", {
			submission_id: data.submissionId,
			user_id: data.userId,
			event: data.event,
			audio_url: data.audioUrl,
			processing_time_ms: data.processingTimeMs,
			error_code: data.errorCode,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Track status check events
	 */
	trackStatusCheck(data: {
		submissionId: string;
		userId: string;
		status: string;
		checkCount: number;
	}): void {
		this.track("llm_status_check", {
			submission_id: data.submissionId,
			user_id: data.userId,
			status: data.status,
			check_count: data.checkCount,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Generic track method
	 */
	private track(eventName: string, properties: Record<string, unknown>): void {
		if (!this.posthog) {
			return;
		}

		try {
			this.posthog.capture({
				distinctId: (properties.user_id as string) || "anonymous",
				event: eventName,
				properties: {
					...properties,
					service: "llm-feedback-engine",
				},
			});
		} catch (error) {
			// Don't throw errors from analytics - it shouldn't break the main flow
			console.error("PostHog tracking error:", error);
		}
	}

	/**
	 * Public wrapper to capture arbitrary events with properties
	 */
	public captureEvent(
		eventName: string,
		properties: Record<string, unknown>,
	): void {
		this.track(eventName, properties);
	}

	/**
	 * Set user properties
	 */
	setUserProperties(userId: string, properties: Record<string, unknown>): void {
		if (!this.posthog) {
			return;
		}

		try {
			this.posthog.identify({
				distinctId: userId,
				properties: {
					...properties,
					last_updated: new Date().toISOString(),
				},
			});
		} catch (error) {
			console.error("PostHog user properties error:", error);
		}
	}

	/**
	 * Flush pending events
	 */
	async flush(): Promise<void> {
		if (this.posthog) {
			await this.posthog.flush();
		}
	}

	/**
	 * Shutdown the analytics service
	 */
	async shutdown(): Promise<void> {
		if (this.posthog) {
			await this.posthog.shutdown();
		}
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<AnalyticsConfig>): void {
		this.config = { ...this.config, ...config };
		this.initialize();
	}

	/**
	 * Check if analytics is enabled
	 */
	isEnabled(): boolean {
		return Boolean(this.posthog);
	}
}
