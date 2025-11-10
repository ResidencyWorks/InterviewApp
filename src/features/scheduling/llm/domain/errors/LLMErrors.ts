/**
 * Domain-specific error types for the LLM Feedback Engine
 */

/**
 * Base error class for all LLM service errors
 */
export abstract class LLMError extends Error {
	abstract readonly code: string;
	abstract readonly statusCode: number;
	readonly timestamp: Date;
	readonly context?: Record<string, unknown>;

	constructor(message: string, context?: Record<string, unknown>) {
		super(message);
		this.name = this.constructor.name;
		this.timestamp = new Date();
		this.context = context;
	}

	/**
	 * Convert error to a serializable object
	 */
	toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			statusCode: this.statusCode,
			timestamp: this.timestamp.toISOString(),
			context: this.context,
		};
	}
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends LLMError {
	readonly code = "VALIDATION_ERROR";
	readonly statusCode = 400;
	readonly details: Record<string, string[]>;

	constructor(
		message: string,
		details: Record<string, string[]>,
		context?: Record<string, unknown>,
	) {
		super(message, context);
		this.details = details;
	}

	toJSON() {
		return {
			...super.toJSON(),
			details: this.details,
		};
	}
}

/**
 * Error for LLM service failures
 */
export class LLMServiceError extends LLMError {
	readonly code = "LLM_SERVICE_ERROR";
	readonly statusCode = 502;
	readonly apiError?: unknown;

	constructor(
		message: string,
		apiError?: unknown,
		context?: Record<string, unknown>,
	) {
		super(message, context);
		this.apiError = apiError;
	}

	toJSON() {
		return {
			...super.toJSON(),
			apiError: this.apiError,
		};
	}
}

/**
 * Error when retry attempts are exhausted
 */
export class RetryExhaustedError extends LLMError {
	readonly code = "RETRY_EXHAUSTED";
	readonly statusCode = 503;
	readonly attempts: number;
	readonly lastError?: Error;

	constructor(
		message: string,
		attempts: number,
		lastError?: Error,
		context?: Record<string, unknown>,
	) {
		super(message, context);
		this.attempts = attempts;
		this.lastError = lastError;
	}

	toJSON() {
		return {
			...super.toJSON(),
			attempts: this.attempts,
			lastError: this.lastError?.message,
		};
	}
}

/**
 * Error when circuit breaker is open
 */
export class CircuitBreakerError extends LLMError {
	readonly code = "CIRCUIT_BREAKER_OPEN";
	readonly statusCode = 503;
	readonly retryAfter: number;

	constructor(
		message: string,
		retryAfter: number,
		context?: Record<string, unknown>,
	) {
		super(message, context);
		this.retryAfter = retryAfter;
	}

	toJSON() {
		return {
			...super.toJSON(),
			retryAfter: this.retryAfter,
		};
	}
}

/**
 * Error for timeout scenarios
 */
export class TimeoutError extends LLMError {
	readonly code = "TIMEOUT_ERROR";
	readonly statusCode = 504;
	readonly timeoutMs: number;

	constructor(
		message: string,
		timeoutMs: number,
		context?: Record<string, unknown>,
	) {
		super(message, context);
		this.timeoutMs = timeoutMs;
	}

	toJSON() {
		return {
			...super.toJSON(),
			timeoutMs: this.timeoutMs,
		};
	}
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends LLMError {
	readonly code = "RATE_LIMIT_ERROR";
	readonly statusCode = 429;
	readonly retryAfter: number;

	constructor(
		message: string,
		retryAfter: number,
		context?: Record<string, unknown>,
	) {
		super(message, context);
		this.retryAfter = retryAfter;
	}

	toJSON() {
		return {
			...super.toJSON(),
			retryAfter: this.retryAfter,
		};
	}
}

/**
 * Error for authentication/authorization failures
 */
export class AuthenticationError extends LLMError {
	readonly code = "AUTHENTICATION_ERROR";
	readonly statusCode = 401;
}

/**
 * Error for resource not found
 */
export class NotFoundError extends LLMError {
	readonly code = "NOT_FOUND";
	readonly statusCode = 404;
	readonly resourceType: string;
	readonly resourceId: string;

	constructor(
		message: string,
		resourceType: string,
		resourceId: string,
		context?: Record<string, unknown>,
	) {
		super(message, context);
		this.resourceType = resourceType;
		this.resourceId = resourceId;
	}

	toJSON() {
		return {
			...super.toJSON(),
			resourceType: this.resourceType,
			resourceId: this.resourceId,
		};
	}
}

/**
 * Error for business logic violations
 */
export class BusinessLogicError extends LLMError {
	readonly code = "BUSINESS_LOGIC_ERROR";
	readonly statusCode = 422;
}

/**
 * Type guard to check if an error is an LLM error
 */
export function isLLMError(error: unknown): error is LLMError {
	return error instanceof LLMError;
}

/**
 * Type guard to check if an error is a specific LLM error type
 */
export function isLLMErrorOfType<T extends LLMError>(
	error: unknown,
	errorType: new (...args: unknown[]) => T,
): error is T {
	return error instanceof errorType;
}

/**
 * Extract error information for logging
 */
export function extractErrorInfo(error: unknown): {
	name: string;
	message: string;
	code?: string;
	statusCode?: number;
	context?: Record<string, unknown>;
} {
	if (isLLMError(error)) {
		return {
			name: error.name,
			message: error.message,
			code: error.code,
			statusCode: error.statusCode,
			context: error.context,
		};
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
		};
	}

	return {
		name: "UnknownError",
		message: String(error),
	};
}
