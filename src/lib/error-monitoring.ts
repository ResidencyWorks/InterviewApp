import * as Sentry from "@sentry/nextjs";
import { analytics } from "./analytics";

/**
 * Error monitoring utilities
 * Centralizes error handling and reporting
 */

export interface ErrorContext {
	userId?: string;
	userEmail?: string;
	component?: string;
	action?: string;
	metadata?: Record<string, any>;
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

		// Set user context in Sentry
		if (context?.userId) {
			Sentry.setUser({
				email: context.userEmail,
				id: context.userId,
			});
		}

		// Set additional context
		if (context?.component) {
			Sentry.setTag("component", context.component);
		}

		if (context?.action) {
			Sentry.setTag("action", context.action);
		}

		if (context?.metadata) {
			Sentry.setContext("metadata", context.metadata);
		}

		// Capture the error
		Sentry.captureException(error, {
			extra: {
				context: context?.metadata,
				message,
			},
			level,
			tags: {
				action: context?.action,
				component: context?.component,
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
			Sentry.setUser({
				email: context.userEmail,
				id: context.userId,
			});
		}

		Sentry.captureMessage(message, {
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
		additionalContext?: Record<string, any>,
	): void {
		Sentry.setUser({
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
		Sentry.setUser(null);
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
		Sentry.addBreadcrumb({
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
	setContext(key: string, context: Record<string, any>): void {
		Sentry.setContext(key, context);
	}

	/**
	 * Set custom tag for error reporting
	 * @param key - Tag key
	 * @param value - Tag value
	 * @returns void
	 */
	setTag(key: string, value: string): void {
		Sentry.setTag(key, value);
	}
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoringService();

/**
 * Error boundary helper for React components
 * @param Component - React component to wrap with error boundary
 * @returns Component wrapped with Sentry error boundary
 */
export function withErrorBoundary<T extends Record<string, any>>(
	Component: React.ComponentType<T>,
) {
	return Sentry.withErrorBoundary(Component, {});
}

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
		Sentry.captureMessage("Health check", "info");
		return true;
	} catch (error) {
		console.error("Error monitoring health check failed:", error);
		return false;
	}
}
