import { analytics } from "@/features/notifications/application/analytics";
import {
	type ErrorContext,
	ErrorMonitoringService,
	type ErrorReport,
} from "@/features/scheduling/infrastructure/monitoring/error-monitoring";

/**
 * Comprehensive error handler for the application
 * Integrates with Sentry, analytics, and provides structured error handling
 */
export class ErrorHandler {
	private static instance: ErrorHandler;
	private readonly errorMonitoring: ErrorMonitoringService;

	private constructor() {
		this.errorMonitoring = new ErrorMonitoringService();
	}

	/**
	 * Get the singleton instance of the error handler
	 */
	static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	/**
	 * Handle and report an error
	 */
	handleError(
		error: Error,
		context?: ErrorContext,
		options?: {
			level?: "error" | "warning" | "info" | "debug";
			reportToSentry?: boolean;
			reportToAnalytics?: boolean;
			rethrow?: boolean;
		},
	): void {
		const {
			level = "error",
			reportToSentry = true,
			reportToAnalytics = true,
			rethrow = false,
		} = options || {};

		// Create error report
		const report: ErrorReport = {
			message: error.message,
			error,
			context,
			level,
		};

		// Report to Sentry if enabled
		if (reportToSentry) {
			this.errorMonitoring.reportError(report);
		}

		// Report to analytics if enabled
		if (reportToAnalytics) {
			this.reportToAnalytics(error, context, level);
		}

		// Log to console for development
		if (process.env.NODE_ENV === "development") {
			console.error("Error handled:", {
				message: error.message,
				stack: error.stack,
				context,
				level,
			});
		}

		// Rethrow if requested
		if (rethrow) {
			throw error;
		}
	}

	/**
	 * Handle async errors in promises
	 */
	handleAsyncError<T>(
		promise: Promise<T>,
		context?: ErrorContext,
		options?: {
			level?: "error" | "warning" | "info" | "debug";
			reportToSentry?: boolean;
			reportToAnalytics?: boolean;
		},
	): Promise<T> {
		return promise.catch((error) => {
			this.handleError(error, context, options);
			throw error;
		});
	}

	/**
	 * Handle API errors
	 */
	handleApiError(
		error: Error,
		requestContext?: {
			method?: string;
			url?: string;
			statusCode?: number;
			userId?: string;
		},
	): void {
		const context: ErrorContext = {
			component: "api",
			action: requestContext?.method || "unknown",
			userId: requestContext?.userId,
			metadata: {
				url: requestContext?.url,
				statusCode: requestContext?.statusCode,
				method: requestContext?.method,
			},
		};

		this.handleError(error, context, {
			level: "error",
			reportToSentry: true,
			reportToAnalytics: true,
		});
	}

	/**
	 * Handle content pack related errors
	 */
	handleContentPackError(
		error: Error,
		contentPackContext?: {
			contentPackId?: string;
			action?: string;
			userId?: string;
		},
	): void {
		const context: ErrorContext = {
			component: "content-pack",
			action: contentPackContext?.action || "unknown",
			userId: contentPackContext?.userId,
			metadata: {
				contentPackId: contentPackContext?.contentPackId,
				action: contentPackContext?.action,
			},
		};

		this.handleError(error, context, {
			level: "error",
			reportToSentry: true,
			reportToAnalytics: true,
		});
	}

	/**
	 * Handle authentication errors
	 */
	handleAuthError(
		error: Error,
		authContext?: {
			action?: string;
			userId?: string;
			userEmail?: string;
		},
	): void {
		const context: ErrorContext = {
			component: "authentication",
			action: authContext?.action || "unknown",
			userId: authContext?.userId,
			userEmail: authContext?.userEmail,
			metadata: {
				action: authContext?.action,
			},
		};

		this.handleError(error, context, {
			level: "error",
			reportToSentry: true,
			reportToAnalytics: true,
		});
	}

	/**
	 * Handle validation errors
	 */
	handleValidationError(
		error: Error,
		validationContext?: {
			field?: string;
			value?: unknown;
			rule?: string;
			userId?: string;
		},
	): void {
		const context: ErrorContext = {
			component: "validation",
			action: "validate",
			userId: validationContext?.userId,
			metadata: {
				field: validationContext?.field,
				rule: validationContext?.rule,
				value: validationContext?.value,
			},
		};

		this.handleError(error, context, {
			level: "warning",
			reportToSentry: true,
			reportToAnalytics: true,
		});
	}

	/**
	 * Handle database errors
	 */
	handleDatabaseError(
		error: Error,
		databaseContext?: {
			operation?: string;
			table?: string;
			userId?: string;
		},
	): void {
		const context: ErrorContext = {
			component: "database",
			action: databaseContext?.operation || "unknown",
			userId: databaseContext?.userId,
			metadata: {
				operation: databaseContext?.operation,
				table: databaseContext?.table,
			},
		};

		this.handleError(error, context, {
			level: "error",
			reportToSentry: true,
			reportToAnalytics: true,
		});
	}

	/**
	 * Handle fallback content errors
	 */
	handleFallbackError(
		error: Error,
		fallbackContext?: {
			action?: string;
			userId?: string;
		},
	): void {
		const context: ErrorContext = {
			component: "fallback-content",
			action: fallbackContext?.action || "unknown",
			userId: fallbackContext?.userId,
			metadata: {
				action: fallbackContext?.action,
			},
		};

		this.handleError(error, context, {
			level: "warning",
			reportToSentry: true,
			reportToAnalytics: true,
		});
	}

	/**
	 * Handle system status errors
	 */
	handleSystemStatusError(
		error: Error,
		systemContext?: {
			component?: string;
			action?: string;
			userId?: string;
		},
	): void {
		const context: ErrorContext = {
			component: systemContext?.component || "system-status",
			action: systemContext?.action || "unknown",
			userId: systemContext?.userId,
			metadata: {
				component: systemContext?.component,
				action: systemContext?.action,
			},
		};

		this.handleError(error, context, {
			level: "error",
			reportToSentry: true,
			reportToAnalytics: true,
		});
	}

	/**
	 * Report error to analytics
	 */
	private reportToAnalytics(
		error: Error,
		context?: ErrorContext,
		level: string = "error",
	): void {
		try {
			analytics.trackError(error.message, {
				level,
				component: context?.component,
				action: context?.action,
				userId: context?.userId,
				metadata: context?.metadata,
			});
		} catch (analyticsError) {
			// Don't let analytics errors break the error handling
			console.error("Failed to report error to analytics:", analyticsError);
		}
	}

	/**
	 * Create a safe async function wrapper
	 */
	wrapAsync<T extends unknown[], R>(
		fn: (...args: T) => Promise<R>,
		context?: ErrorContext,
	): (...args: T) => Promise<R> {
		return async (...args: T): Promise<R> => {
			try {
				return await fn(...args);
			} catch (error) {
				this.handleError(error as Error, context);
				throw error;
			}
		};
	}

	/**
	 * Create a safe sync function wrapper
	 */
	wrapSync<T extends unknown[], R>(
		fn: (...args: T) => R,
		context?: ErrorContext,
	): (...args: T) => R {
		return (...args: T): R => {
			try {
				return fn(...args);
			} catch (error) {
				this.handleError(error as Error, context);
				throw error;
			}
		};
	}

	/**
	 * Get error statistics
	 */
	getErrorStatistics(): {
		totalErrors: number;
		errorsByLevel: Record<string, number>;
		errorsByComponent: Record<string, number>;
	} {
		// In a real implementation, this would query error logs
		// For now, return mock data
		return {
			totalErrors: 0,
			errorsByLevel: {},
			errorsByComponent: {},
		};
	}

	/**
	 * Clear error logs (for testing)
	 */
	clearErrorLogs(): void {
		// In a real implementation, this would clear error logs
		console.log("Error logs cleared");
	}
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions
export const handleError = (error: Error, context?: ErrorContext) =>
	errorHandler.handleError(error, context);

export const handleApiError = (error: Error, requestContext?: any) =>
	errorHandler.handleApiError(error, requestContext);

export const handleContentPackError = (
	error: Error,
	contentPackContext?: any,
) => errorHandler.handleContentPackError(error, contentPackContext);

export const handleAuthError = (error: Error, authContext?: any) =>
	errorHandler.handleAuthError(error, authContext);

export const handleValidationError = (error: Error, validationContext?: any) =>
	errorHandler.handleValidationError(error, validationContext);

export const handleDatabaseError = (error: Error, databaseContext?: any) =>
	errorHandler.handleDatabaseError(error, databaseContext);

export const handleFallbackError = (error: Error, fallbackContext?: any) =>
	errorHandler.handleFallbackError(error, fallbackContext);

export const handleSystemStatusError = (error: Error, systemContext?: any) =>
	errorHandler.handleSystemStatusError(error, systemContext);

export const wrapAsync = <T extends unknown[], R>(
	fn: (...args: T) => Promise<R>,
	context?: ErrorContext,
) => errorHandler.wrapAsync(fn, context);

export const wrapSync = <T extends unknown[], R>(
	fn: (...args: T) => R,
	context?: ErrorContext,
) => errorHandler.wrapSync(fn, context);
