import * as Sentry from "@sentry/nextjs";

/**
 * Log levels for structured logging
 */
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

/**
 * Log context interface
 */
export interface LogContext {
	userId?: string;
	sessionId?: string;
	requestId?: string;
	component?: string;
	action?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Structured logger for application-wide logging
 */
export class Logger {
	private static instance: Logger;
	private isDevelopment = process.env.NODE_ENV === "development";

	private constructor() {}

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	/**
	 * Log debug message
	 */
	debug(message: string, context?: LogContext): void {
		this.log(LogLevel.DEBUG, message, context);
	}

	/**
	 * Log info message
	 */
	info(message: string, context?: LogContext): void {
		this.log(LogLevel.INFO, message, context);
	}

	/**
	 * Log warning message
	 */
	warn(message: string, context?: LogContext): void {
		this.log(LogLevel.WARN, message, context);
	}

	/**
	 * Log error message
	 */
	error(message: string, error?: Error, context?: LogContext): void {
		this.log(LogLevel.ERROR, message, {
			...context,
			metadata: { ...context?.metadata, error: error?.message },
		});

		// Send to Sentry in production
		if (!this.isDevelopment && error) {
			Sentry.captureException(error, {
				tags: {
					component: context?.component,
					action: context?.action,
				},
				extra: context?.metadata,
			});
		}
	}

	/**
	 * Log API request
	 */
	logApiRequest(
		method: string,
		url: string,
		statusCode: number,
		duration: number,
		context?: LogContext,
	): void {
		const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
		this.log(level, `API ${method} ${url}`, {
			...context,
			metadata: {
				...context?.metadata,
				method,
				url,
				statusCode,
				duration,
			},
		});
	}

	/**
	 * Log database operation
	 */
	logDatabaseOperation(
		operation: string,
		table: string,
		duration: number,
		success: boolean,
		context?: LogContext,
	): void {
		const level = success ? LogLevel.INFO : LogLevel.ERROR;
		this.log(level, `Database ${operation} on ${table}`, {
			...context,
			metadata: {
				...context?.metadata,
				operation,
				table,
				duration,
				success,
			},
		});
	}

	/**
	 * Log user action
	 */
	logUserAction(action: string, userId: string, context?: LogContext): void {
		this.log(LogLevel.INFO, `User action: ${action}`, {
			...context,
			userId,
			action,
		});
	}

	/**
	 * Core logging method
	 */
	private log(level: LogLevel, message: string, context?: LogContext): void {
		const timestamp = new Date().toISOString();
		const _logEntry = {
			timestamp,
			level,
			message,
			...context,
		};

		// Console output for development
		if (this.isDevelopment) {
			const consoleMethod = this.getConsoleMethod(level);
			consoleMethod(
				`[${timestamp}] ${level.toUpperCase()}: ${message}`,
				context,
			);
		}

		// In production, logs would be sent to external logging service
		// For now, we rely on Sentry for error tracking
	}

	/**
	 * Get appropriate console method for log level
	 */
	private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
		switch (level) {
			case LogLevel.DEBUG:
				return console.debug;
			case LogLevel.INFO:
				return console.info;
			case LogLevel.WARN:
				return console.warn;
			case LogLevel.ERROR:
				return console.error;
			default:
				return console.log;
		}
	}
}

// Export singleton instance
export const logger = Logger.getInstance();
