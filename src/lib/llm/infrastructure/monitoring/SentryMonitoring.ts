/**
 * Sentry monitoring integration for LLM service
 */

import * as Sentry from "@sentry/nextjs";
import { extractErrorInfo } from "../../domain/errors/LLMErrors.js";
import type { AnalyticsConfig } from "../../types/config.js";

/**
 * Sentry monitoring service for LLM operations
 */
export class SentryMonitoring {
	private config: AnalyticsConfig;
	private isInitialized = false;

	constructor(config: AnalyticsConfig) {
		this.config = config;
		this.initialize();
	}

	/**
	 * Initialize Sentry
	 */
	private initialize(): void {
		if (this.config.sentryDsn && !this.isInitialized) {
			Sentry.init({
				dsn: this.config.sentryDsn,
				environment: process.env.NODE_ENV || "development",
				integrations: [],
				tracesSampleRate: 0.1, // 10% of transactions
				beforeSend(event) {
					// Filter out non-LLM related errors
					if (event.tags?.service !== "llm-feedback-engine") {
						return null;
					}
					return event;
				},
			});
			this.isInitialized = true;
		}
	}

	/**
	 * Capture LLM service error
	 */
	captureLLMError(
		error: unknown,
		context: {
			submissionId?: string;
			userId?: string;
			questionId?: string;
			operation?: string;
			model?: string;
			attempts?: number;
			processingTimeMs?: number;
		},
	): void {
		if (!this.isInitialized) {
			return;
		}

		const errorInfo = extractErrorInfo(error);

		Sentry.withScope((scope) => {
			// Set service tag
			scope.setTag("service", "llm-feedback-engine");
			scope.setTag("component", "llm-service");

			// Set context data
			if (context.submissionId) {
				scope.setTag("submission_id", context.submissionId);
				scope.setContext("submission", {
					id: context.submissionId,
					userId: context.userId,
					questionId: context.questionId,
				});
			}

			if (context.operation) {
				scope.setTag("operation", context.operation);
			}

			if (context.model) {
				scope.setTag("model", context.model);
			}

			if (context.attempts) {
				scope.setContext("retry", {
					attempts: context.attempts,
				});
			}

			if (context.processingTimeMs) {
				scope.setContext("performance", {
					processingTimeMs: context.processingTimeMs,
				});
			}

			// Set error context
			scope.setContext("error", {
				name: errorInfo.name,
				code: errorInfo.code,
				statusCode: errorInfo.statusCode,
				context: errorInfo.context,
			});

			// Set user context
			if (context.userId) {
				scope.setUser({
					id: context.userId,
				});
			}

			// Capture the error
			Sentry.captureException(error);
		});
	}

	/**
	 * Capture LLM service performance issue
	 */
	capturePerformanceIssue(data: {
		operation: string;
		duration: number;
		threshold: number;
		submissionId?: string;
		userId?: string;
		model?: string;
	}): void {
		if (!this.isInitialized) {
			return;
		}

		Sentry.withScope((scope) => {
			scope.setTag("service", "llm-feedback-engine");
			scope.setTag("component", "performance");
			scope.setTag("operation", data.operation);
			scope.setLevel("warning");

			scope.setContext("performance", {
				duration: data.duration,
				threshold: data.threshold,
				exceededBy: data.duration - data.threshold,
			});

			if (data.submissionId) {
				scope.setTag("submission_id", data.submissionId);
			}

			if (data.userId) {
				scope.setUser({ id: data.userId });
			}

			if (data.model) {
				scope.setTag("model", data.model);
			}

			Sentry.captureMessage(
				`LLM operation ${data.operation} exceeded performance threshold`,
				"warning",
			);
		});
	}

	/**
	 * Capture circuit breaker events
	 */
	captureCircuitBreakerEvent(event: {
		action: "opened" | "closed" | "half-open";
		service: string;
		failureCount?: number;
		successCount?: number;
		threshold?: number;
	}): void {
		if (!this.isInitialized) {
			return;
		}

		Sentry.withScope((scope) => {
			scope.setTag("service", "llm-feedback-engine");
			scope.setTag("component", "circuit-breaker");
			scope.setTag("action", event.action);
			scope.setTag("target_service", event.service);

			scope.setContext("circuit_breaker", {
				action: event.action,
				service: event.service,
				failureCount: event.failureCount,
				successCount: event.successCount,
				threshold: event.threshold,
			});

			const level = event.action === "opened" ? "error" : "info";
			const message = `Circuit breaker ${event.action} for service ${event.service}`;

			Sentry.captureMessage(message, level);
		});
	}

	/**
	 * Capture retry exhaustion
	 */
	captureRetryExhaustion(data: {
		operation: string;
		attempts: number;
		lastError: string;
		submissionId?: string;
		userId?: string;
	}): void {
		if (!this.isInitialized) {
			return;
		}

		Sentry.withScope((scope) => {
			scope.setTag("service", "llm-feedback-engine");
			scope.setTag("component", "retry");
			scope.setTag("operation", data.operation);
			scope.setLevel("error");

			scope.setContext("retry", {
				operation: data.operation,
				attempts: data.attempts,
				lastError: data.lastError,
			});

			if (data.submissionId) {
				scope.setTag("submission_id", data.submissionId);
			}

			if (data.userId) {
				scope.setUser({ id: data.userId });
			}

			Sentry.captureMessage(
				`Retry exhausted for operation ${data.operation} after ${data.attempts} attempts`,
				"error",
			);
		});
	}

	/**
	 * Capture API rate limiting
	 */
	captureRateLimit(data: {
		service: string;
		retryAfter: number;
		submissionId?: string;
		userId?: string;
	}): void {
		if (!this.isInitialized) {
			return;
		}

		Sentry.withScope((scope) => {
			scope.setTag("service", "llm-feedback-engine");
			scope.setTag("component", "rate-limit");
			scope.setTag("target_service", data.service);
			scope.setLevel("warning");

			scope.setContext("rate_limit", {
				service: data.service,
				retryAfter: data.retryAfter,
			});

			if (data.submissionId) {
				scope.setTag("submission_id", data.submissionId);
			}

			if (data.userId) {
				scope.setUser({ id: data.userId });
			}

			Sentry.captureMessage(
				`Rate limit hit for service ${data.service}, retry after ${data.retryAfter}s`,
				"warning",
			);
		});
	}

	/**
	 * Start a transaction for LLM operations
	 */
	startLLMTransaction(
		operation: string,
		data: {
			submissionId?: string;
			userId?: string;
			questionId?: string;
			model?: string;
		},
	): any | null {
		if (!this.isInitialized) {
			return null;
		}

		// Set tags and user context
		Sentry.setTag("service", "llm-feedback-engine");
		Sentry.setTag("operation", operation);

		if (data.submissionId) {
			Sentry.setTag("submission_id", data.submissionId);
		}

		if (data.userId) {
			Sentry.setUser({ id: data.userId });
		}

		if (data.questionId) {
			Sentry.setTag("question_id", data.questionId);
		}

		if (data.model) {
			Sentry.setTag("model", data.model);
		}

		return null;
	}

	/**
	 * Add breadcrumb for LLM operations
	 */
	addBreadcrumb(
		message: string,
		category: string,
		data?: Record<string, unknown>,
	): void {
		if (!this.isInitialized) {
			return;
		}

		Sentry.addBreadcrumb({
			message,
			category,
			level: "info",
			data: {
				...data,
				service: "llm-feedback-engine",
			},
		});
	}

	/**
	 * Set user context
	 */
	setUser(userId: string, additionalData?: Record<string, unknown>): void {
		if (!this.isInitialized) {
			return;
		}

		Sentry.setUser({
			id: userId,
			...additionalData,
		});
	}

	/**
	 * Set additional context
	 */
	setContext(key: string, context: Record<string, unknown>): void {
		if (!this.isInitialized) {
			return;
		}

		Sentry.setContext(key, context);
	}

	/**
	 * Check if monitoring is enabled
	 */
	isEnabled(): boolean {
		return this.isInitialized;
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<AnalyticsConfig>): void {
		this.config = { ...this.config, ...config };
		this.initialize();
	}
}
