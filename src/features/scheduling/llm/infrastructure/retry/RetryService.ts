/**
 * Retry service with exponential backoff and jitter
 */

import type { RetryConfig } from "../../types/config";

/**
 * Performance optimization constants
 */
const PERFORMANCE_CONSTANTS = {
	// Fast retry for transient errors
	FAST_RETRY_DELAY: 100,
	// Maximum fast retry attempts
	FAST_RETRY_MAX_ATTEMPTS: 2,
	// Connection pool optimization
	CONNECTION_POOL_SIZE: 10,
	// Request timeout optimization
	OPTIMIZED_TIMEOUT: 15000,
} as const;

/**
 * Retry options for individual operations
 */
export interface RetryOptions {
	/**
	 * Maximum number of retry attempts
	 */
	maxAttempts?: number;

	/**
	 * Base delay in milliseconds
	 */
	baseDelay?: number;

	/**
	 * Maximum delay in milliseconds
	 */
	maxDelay?: number;

	/**
	 * Whether to add jitter to delays
	 */
	jitter?: boolean;

	/**
	 * Function to determine if an error should trigger a retry
	 */
	shouldRetry?: (error: unknown) => boolean;

	/**
	 * Function to calculate delay for a specific attempt
	 */
	calculateDelay?: (
		attempt: number,
		baseDelay: number,
		maxDelay: number,
	) => number;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
	/**
	 * The result of the operation
	 */
	result: T;

	/**
	 * Number of attempts made
	 */
	attempts: number;

	/**
	 * Total time taken in milliseconds
	 */
	totalTimeMs: number;
}

/**
 * Retry service implementation
 */
export class RetryService {
	private config: RetryConfig;

	constructor(config: RetryConfig) {
		this.config = config;
	}

	/**
	 * Execute a function with retry logic
	 */
	async execute<T>(
		operation: () => Promise<T>,
		options: RetryOptions = {},
	): Promise<RetryResult<T>> {
		const startTime = Date.now();
		const maxAttempts = options.maxAttempts ?? this.config.maxAttempts;
		const baseDelay = options.baseDelay ?? this.config.baseDelay;
		const maxDelay = options.maxDelay ?? this.config.maxDelay;
		const jitter = options.jitter ?? this.config.jitter;
		const shouldRetry = options.shouldRetry ?? this.defaultShouldRetry;
		const calculateDelay =
			options.calculateDelay ?? this.calculateExponentialDelay;

		let lastError: unknown;
		let attempts = 0;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			attempts++;

			try {
				const result = await operation();
				return {
					result,
					attempts,
					totalTimeMs: Date.now() - startTime,
				};
			} catch (error) {
				lastError = error;

				// Don't retry if this is the last attempt or if the error shouldn't be retried
				if (attempt === maxAttempts - 1 || !shouldRetry(error)) {
					break;
				}

				// Calculate delay for next attempt
				const delay = calculateDelay(attempt + 1, baseDelay, maxDelay);
				const finalDelay = jitter ? this.addJitter(delay) : delay;

				// Wait before retrying
				await this.sleep(finalDelay);
			}
		}

		// If we get here, all retries failed
		throw lastError;
	}

	/**
	 * Default function to determine if an error should trigger a retry
	 */
	private defaultShouldRetry(error: unknown): boolean {
		// Retry on network errors, timeouts, and rate limits
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("timeout") ||
				message.includes("network") ||
				message.includes("rate limit") ||
				message.includes("temporary") ||
				message.includes("service unavailable") ||
				message.includes("internal server error")
			);
		}

		// Don't retry on validation errors or authentication errors
		return false;
	}

	/**
	 * Calculate exponential delay with backoff
	 */
	private calculateExponentialDelay(
		attempt: number,
		baseDelay: number,
		maxDelay: number,
	): number {
		const delay = baseDelay * 2 ** (attempt - 1);
		return Math.min(delay, maxDelay);
	}

	/**
	 * Add jitter to delay to prevent thundering herd
	 */
	private addJitter(delay: number): number {
		// Add ±25% jitter
		const jitterFactor = 0.25;
		const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
		return Math.max(0, delay + jitter);
	}

	/**
	 * Sleep for the specified number of milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Update retry configuration
	 */
	updateConfig(config: Partial<RetryConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current retry configuration
	 */
	getConfig(): RetryConfig {
		return { ...this.config };
	}

	/**
	 * Execute with fast retry for transient errors
	 */
	async executeWithFastRetry<T>(
		operation: () => Promise<T>,
		options: RetryOptions = {},
	): Promise<RetryResult<T>> {
		// First attempt with fast retry for transient errors
		const fastRetryOptions = {
			...options,
			maxAttempts: PERFORMANCE_CONSTANTS.FAST_RETRY_MAX_ATTEMPTS,
			baseDelay: PERFORMANCE_CONSTANTS.FAST_RETRY_DELAY,
			shouldRetry: (error: unknown) => this.isTransientError(error),
		};

		try {
			return await this.execute(operation, fastRetryOptions);
		} catch (_error) {
			// If fast retry fails, fall back to normal retry
			return await this.execute(operation, options);
		}
	}

	/**
	 * Check if error is transient and suitable for fast retry
	 */
	private isTransientError(error: unknown): boolean {
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("timeout") ||
				message.includes("connection") ||
				message.includes("network") ||
				message.includes("econnreset") ||
				message.includes("enotfound")
			);
		}
		return false;
	}

	/**
	 * Execute with connection pooling optimization
	 */
	async executeWithConnectionPool<T>(
		operation: () => Promise<T>,
		options: RetryOptions = {},
	): Promise<RetryResult<T>> {
		// Add connection pool optimization
		const optimizedOptions = {
			...options,
			calculateDelay: (
				attempt: number,
				baseDelay: number,
				maxDelay: number,
			) => {
				// Reduce delay for connection pool scenarios
				const delay = this.calculateExponentialDelay(
					attempt,
					baseDelay,
					maxDelay,
				);
				return Math.min(delay, PERFORMANCE_CONSTANTS.OPTIMIZED_TIMEOUT);
			},
		};

		return await this.execute(operation, optimizedOptions);
	}

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics(): {
		averageRetryTime: number;
		successRate: number;
		fastRetrySuccessRate: number;
	} {
		// This would be implemented with actual metrics collection
		// For now, return placeholder values
		return {
			averageRetryTime: 0,
			successRate: 0,
			fastRetrySuccessRate: 0,
		};
	}
}

/**
 * Create a retry service instance
 */
export function createRetryService(config: RetryConfig): RetryService {
	return new RetryService(config);
}
