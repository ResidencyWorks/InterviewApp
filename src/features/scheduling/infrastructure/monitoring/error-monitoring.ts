import {
	addBreadcrumb,
	captureException,
	captureMessage,
	setContext,
	setTag,
	setUser,
} from "@sentry/nextjs";
import { analytics } from "@/features/notifications/application/analytics";
import { DataScrubber } from "@/shared/security/data-scrubber";

/**
 * Error monitoring utilities
 * Centralizes error handling and reporting
 */

export interface ErrorContext {
	userId?: string;
	userEmail?: string;
	component?: string;
	action?: string;
	metadata?: Record<string, unknown>;
}

export interface ErrorReport {
	message: string;
	error: Error;
	context?: ErrorContext;
	level?: "error" | "warning" | "info" | "debug";
}

/**
 * Error monitoring service
 * Centralizes error handling and reporting to Sentry with analytics integration
 */
export class ErrorMonitoringService {
	/**
	 * Report an error to Sentry and analytics
	 * @param report - Error report containing error details and context
	 * @returns void
	 */
	reportError(report: ErrorReport): void {
		const { message, error, context, level = "error" } = report;

		// Scrub PII from context before sending to Sentry
		const scrubbedContext = context
			? {
					...context,
					userEmail: context.userEmail ? "[REDACTED]" : undefined,
					metadata: context.metadata
						? (DataScrubber.scrubObject(
								context.metadata as Record<string, unknown>,
							) as typeof context.metadata)
						: undefined,
				}
			: undefined;

		// Set user context in Sentry (with scrubbed email)
		if (scrubbedContext?.userId) {
			setUser({
				email: scrubbedContext.userEmail,
				id: scrubbedContext.userId,
			});
		}

		// Set additional context
		if (scrubbedContext?.component) {
			setTag("component", scrubbedContext.component);
		}

		if (scrubbedContext?.action) {
			setTag("action", scrubbedContext.action);
		}

		if (scrubbedContext?.metadata) {
			setContext("metadata", scrubbedContext.metadata);
		}

		// Capture the error
		captureException(error, {
			extra: {
				context: scrubbedContext?.metadata,
				message,
			},
			level,
			tags: {
				action: scrubbedContext?.action,
				component: scrubbedContext?.component,
			},
		});

		// Track error in analytics
		analytics.trackError(message, {
			action: context?.action,
			component: context?.component,
			error_message: error.message,
			error_name: error.name,
		});
	}

	/**
	 * Report a message to Sentry
	 * @param message - Message to report
	 * @param level - Log level for the message
	 * @param context - Optional context data
	 * @returns void
	 */
	reportMessage(
		message: string,
		level: "error" | "warning" | "info" | "debug" = "info",
		context?: ErrorContext,
	): void {
		if (context?.userId) {
			setUser({
				email: context.userEmail,
				id: context.userId,
			});
		}

		captureMessage(message, {
			extra: context?.metadata,
			level,
			tags: {
				action: context?.action,
				component: context?.component,
			},
		});
	}

	/**
	 * Set user context for error reporting
	 * @param userId - User ID to associate with error reports
	 * @param email - Optional user email
	 * @param additionalContext - Optional additional user context data
	 * @returns void
	 */
	setUserContext(
		userId: string,
		email?: string,
		additionalContext?: Record<string, unknown>,
	): void {
		setUser({
			email,
			id: userId,
			...additionalContext,
		});
	}

	/**
	 * Clear user context from error reporting
	 * @returns void
	 */
	clearUserContext(): void {
		setUser(null);
	}

	/**
	 * Add breadcrumb for debugging
	 * @param message - Breadcrumb message
	 * @param category - Optional category for the breadcrumb
	 * @param level - Optional log level for the breadcrumb
	 * @returns void
	 */
	addBreadcrumb(
		message: string,
		category?: string,
		level?: "error" | "warning" | "info" | "debug",
	): void {
		addBreadcrumb({
			category: category || "custom",
			level: level || "info",
			message,
			timestamp: Date.now() / 1000,
		});
	}

	/**
	 * Set custom context for error reporting
	 * @param key - Context key
	 * @param context - Context data
	 * @returns void
	 */
	setContext(key: string, context: Record<string, unknown>): void {
		setContext(key, context);
	}

	/**
	 * Set custom tag for error reporting
	 * @param key - Tag key
	 * @param value - Tag value
	 * @returns void
	 */
	setTag(key: string, value: string): void {
		setTag(key, value);
	}
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoringService();

/**
 * API error handler
 * @param error - Error to handle
 * @param context - Optional error context
 * @returns void
 */
export function handleApiError(error: unknown, context?: ErrorContext): void {
	if (error instanceof Error) {
		errorMonitoring.reportError({
			context: {
				...context,
				component: "api",
			},
			error,
			message: "API Error",
		});
	} else {
		errorMonitoring.reportMessage(
			`Unknown API error: ${String(error)}`,
			"error",
			{
				...context,
				component: "api",
			},
		);
	}
}

/**
 * Database error handler
 * @param error - Error to handle
 * @param context - Optional error context
 * @returns void
 */
export function handleDatabaseError(
	error: unknown,
	context?: ErrorContext,
): void {
	if (error instanceof Error) {
		errorMonitoring.reportError({
			context: {
				...context,
				component: "database",
			},
			error,
			message: "Database Error",
		});
	} else {
		errorMonitoring.reportMessage(
			`Unknown database error: ${String(error)}`,
			"error",
			{
				...context,
				component: "database",
			},
		);
	}
}

/**
 * OpenAI error handler
 * @param error - Error to handle
 * @param context - Optional error context
 * @returns void
 */
export function handleOpenAIError(
	error: unknown,
	context?: ErrorContext,
): void {
	if (error instanceof Error) {
		errorMonitoring.reportError({
			context: {
				...context,
				component: "openai",
			},
			error,
			message: "OpenAI API Error",
		});
	} else {
		errorMonitoring.reportMessage(
			`Unknown OpenAI error: ${String(error)}`,
			"error",
			{
				...context,
				component: "openai",
			},
		);
	}
}

/**
 * Redis error handler
 * @param error - Error to handle
 * @param context - Optional error context
 * @returns void
 */
export function handleRedisError(error: unknown, context?: ErrorContext): void {
	if (error instanceof Error) {
		errorMonitoring.reportError({
			context: {
				...context,
				component: "redis",
			},
			error,
			message: "Redis Error",
		});
	} else {
		errorMonitoring.reportMessage(
			`Unknown Redis error: ${String(error)}`,
			"error",
			{
				...context,
				component: "redis",
			},
		);
	}
}

/**
 * Validation error handler
 * @param error - Error to handle
 * @param context - Optional error context
 * @returns void
 */
export function handleValidationError(
	error: unknown,
	context?: ErrorContext,
): void {
	if (error instanceof Error) {
		errorMonitoring.reportError({
			context: {
				...context,
				component: "validation",
			},
			error,
			level: "warning",
			message: "Validation Error",
		});
	} else {
		errorMonitoring.reportMessage(
			`Unknown validation error: ${String(error)}`,
			"warning",
			{
				...context,
				component: "validation",
			},
		);
	}
}

/**
 * Performance monitoring
 * @param name - Name of the operation being tracked
 * @param startTime - Start time of the operation in milliseconds
 * @param context - Optional context for the performance tracking
 * @returns void
 */
export function trackPerformance(
	name: string,
	startTime: number,
	context?: ErrorContext,
): void {
	const duration = Date.now() - startTime;

	// Track in analytics
	analytics.trackApiCall(name, duration, true);

	// Add breadcrumb for debugging
	errorMonitoring.addBreadcrumb(
		`Performance: ${name} took ${duration}ms`,
		"performance",
		"info",
	);

	// Report slow operations
	if (duration > 5000) {
		// 5 seconds
		errorMonitoring.reportMessage(
			`Slow operation: ${name} took ${duration}ms`,
			"warning",
			{
				...context,
				component: "performance",
				metadata: { duration, operation: name },
			},
		);
	}
}

/**
 * Health check for error monitoring
 * @returns Promise that resolves to true if error monitoring is healthy
 */
export async function checkErrorMonitoringHealth(): Promise<boolean> {
	try {
		// Test Sentry by capturing a test message
		captureMessage("Health check", "info");
		return true;
	} catch (error) {
		console.error("Error monitoring health check failed:", error);
		return false;
	}
}
