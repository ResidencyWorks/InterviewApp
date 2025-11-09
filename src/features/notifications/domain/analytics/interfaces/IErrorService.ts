import type {
	ErrorCategory,
	ErrorEvent,
	ErrorSeverity,
} from "../entities/ErrorEvent";

/**
 * Error service interface
 */
export interface IErrorService {
	/**
	 * Capture an error event
	 */
	captureError(error: ErrorEvent): Promise<void>;

	/**
	 * Capture an error with message and context
	 */
	captureError(
		message: string,
		severity: ErrorSeverity,
		category: ErrorCategory,
		context?: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Capture a client error
	 */
	captureClientError(
		message: string,
		component: string,
		userId?: string,
	): Promise<void>;

	/**
	 * Capture a server error
	 */
	captureServerError(
		message: string,
		component: string,
		requestId?: string,
	): Promise<void>;

	/**
	 * Capture a network error
	 */
	captureNetworkError(
		message: string,
		url: string,
		requestId?: string,
	): Promise<void>;

	/**
	 * Capture a validation error
	 */
	captureValidationError(
		message: string,
		component: string,
		userId?: string,
	): Promise<void>;

	/**
	 * Capture an authentication error
	 */
	captureAuthenticationError(message: string, userId?: string): Promise<void>;

	/**
	 * Capture an authorization error
	 */
	captureAuthorizationError(message: string, userId?: string): Promise<void>;

	/**
	 * Capture a rate limit error
	 */
	captureRateLimitError(message: string, requestId?: string): Promise<void>;

	/**
	 * Capture an external service error
	 */
	captureExternalServiceError(
		message: string,
		service: string,
		requestId?: string,
	): Promise<void>;

	/**
	 * Capture a database error
	 */
	captureDatabaseError(
		message: string,
		operation: string,
		requestId?: string,
	): Promise<void>;

	/**
	 * Capture a critical error
	 */
	captureCriticalError(
		message: string,
		component: string,
		requestId?: string,
	): Promise<void>;

	/**
	 * Capture an error from JavaScript Error object
	 */
	captureException(
		error: Error,
		category?: ErrorCategory,
		context?: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Capture a message (non-error event)
	 */
	captureMessage(message: string, severity?: ErrorSeverity): Promise<void>;

	/**
	 * Set user context for all future errors
	 */
	setUser(userId: string, properties?: Record<string, unknown>): void;

	/**
	 * Set tags for all future errors
	 */
	setTags(tags: Record<string, string>): void;

	/**
	 * Add a tag for all future errors
	 */
	addTag(key: string, value: string): void;

	/**
	 * Set extra context for all future errors
	 */
	setExtra(key: string, value: unknown): void;

	/**
	 * Set fingerprint for error grouping
	 */
	setFingerprint(fingerprint: string): void;

	/**
	 * Set release version
	 */
	setRelease(release: string): void;

	/**
	 * Set environment
	 */
	setEnvironment(environment: string): void;

	/**
	 * Flush pending errors
	 */
	flush(): Promise<void>;

	/**
	 * Check if the service is available
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * Get service health status
	 */
	getHealthStatus(): Promise<{
		status: "healthy" | "degraded" | "unhealthy";
		lastErrorTime?: Date;
		errorCount: number;
		criticalErrorCount: number;
	}>;
}

/**
 * Error service configuration
 */
export interface ErrorServiceConfig {
	/**
	 * DSN for the error service
	 */
	dsn: string;

	/**
	 * Environment name
	 */
	environment: string;

	/**
	 * Release version
	 */
	release?: string;

	/**
	 * Error sampling rate (0-1)
	 */
	sampleRate?: number;

	/**
	 * Performance sampling rate (0-1)
	 */
	tracesSampleRate?: number;

	/**
	 * Before send hook function name
	 */
	beforeSend?: string;

	/**
	 * Before breadcrumb hook function name
	 */
	beforeBreadcrumb?: string;

	/**
	 * Enabled integrations
	 */
	integrations?: string[];

	/**
	 * Whether to enable debug mode
	 */
	debug?: boolean;

	/**
	 * Whether to enable the service
	 */
	enabled?: boolean;
}

/**
 * Error service factory
 */
export interface IErrorServiceFactory {
	/**
	 * Create an error service instance
	 */
	create(config: ErrorServiceConfig): IErrorService;
}

/**
 * Error service error
 */
export class ErrorServiceError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly originalError?: Error,
	) {
		super(message);
		this.name = "ErrorServiceError";
	}
}

/**
 * Error service health check result
 */
export interface ErrorHealthCheck {
	status: "healthy" | "degraded" | "unhealthy";
	lastErrorTime?: Date;
	errorCount: number;
	criticalErrorCount: number;
	uptime: number;
	version?: string;
}

/**
 * Error service metrics
 */
export interface ErrorMetrics {
	totalErrors: number;
	successfulErrors: number;
	failedErrors: number;
	averageLatency: number;
	lastErrorTime?: Date;
	uptime: number;
	errorsByCategory: Record<string, number>;
	errorsBySeverity: Record<string, number>;
}

/**
 * Error service adapter interface
 */
export interface IErrorAdapter {
	/**
	 * Initialize the adapter
	 */
	initialize(config: ErrorServiceConfig): Promise<void>;

	/**
	 * Capture an error event
	 */
	captureError(error: ErrorEvent): Promise<void>;

	/**
	 * Capture an exception
	 */
	captureException(
		error: Error,
		category?: ErrorCategory,
		context?: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Capture a message
	 */
	captureMessage(message: string, severity?: ErrorSeverity): Promise<void>;

	/**
	 * Set user context
	 */
	setUser(userId: string, properties?: Record<string, unknown>): void;

	/**
	 * Set tags
	 */
	setTags(tags: Record<string, string>): void;

	/**
	 * Add a tag
	 */
	addTag(key: string, value: string): void;

	/**
	 * Set extra context
	 */
	setExtra(key: string, value: unknown): void;

	/**
	 * Set fingerprint
	 */
	setFingerprint(fingerprint: string): void;

	/**
	 * Set release
	 */
	setRelease(release: string): void;

	/**
	 * Set environment
	 */
	setEnvironment(environment: string): void;

	/**
	 * Flush pending errors
	 */
	flush(): Promise<void>;

	/**
	 * Check if the adapter is available
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * Get adapter health status
	 */
	getHealthStatus(): Promise<ErrorHealthCheck>;

	/**
	 * Get adapter metrics
	 */
	getMetrics(): Promise<ErrorMetrics>;

	/**
	 * Shutdown the adapter
	 */
	shutdown(): Promise<void>;
}

/**
 * Error filtering interface
 */
export interface IErrorFilter {
	/**
	 * Check if an error should be captured
	 */
	shouldCapture(error: ErrorEvent): boolean;

	/**
	 * Filter error data before sending
	 */
	filterError(error: ErrorEvent): ErrorEvent;
}

/**
 * Error grouping interface
 */
export interface IErrorGrouper {
	/**
	 * Generate a fingerprint for error grouping
	 */
	generateFingerprint(error: ErrorEvent): string;

	/**
	 * Check if two errors should be grouped together
	 */
	shouldGroup(error1: ErrorEvent, error2: ErrorEvent): boolean;
}
