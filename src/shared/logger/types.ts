export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

export interface LogContext {
	userId?: string;
	sessionId?: string;
	requestId?: string;
	component?: string;
	action?: string;
	metadata?: Record<string, unknown>;
}

export interface LoggerContract {
	debug(message: string, context?: LogContext): void;
	info(message: string, context?: LogContext): void;
	warn(message: string, context?: LogContext): void;
	error(message: string, error?: Error, context?: LogContext): void;
	logApiRequest(
		method: string,
		url: string,
		statusCode: number,
		duration: number,
		context?: LogContext,
	): void;
	logDatabaseOperation(
		operation: string,
		table: string,
		duration: number,
		success: boolean,
		context?: LogContext,
	): void;
	logUserAction(action: string, userId: string, context?: LogContext): void;
}
