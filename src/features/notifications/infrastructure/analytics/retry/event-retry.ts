import type { AnalyticsEvent } from "@/features/notifications/domain/analytics/entities/AnalyticsEvent";
import type { ErrorEvent } from "@/features/notifications/domain/analytics/entities/ErrorEvent";

type EventType = AnalyticsEvent | ErrorEvent;

/**
 * Retry strategy types
 */
export enum RetryStrategy {
	FIXED = "FIXED",
	EXPONENTIAL = "EXPONENTIAL",
	LINEAR = "LINEAR",
	CUSTOM = "CUSTOM",
}

/**
 * Retry configuration
 */
export interface RetryConfig {
	/**
	 * Maximum number of retry attempts
	 */
	maxAttempts: number;

	/**
	 * Base delay in milliseconds
	 */
	baseDelay: number;

	/**
	 * Maximum delay in milliseconds
	 */
	maxDelay: number;

	/**
	 * Retry strategy
	 */
	strategy: RetryStrategy;

	/**
	 * Jitter factor (0-1) to add randomness to delays
	 */
	jitter: number;

	/**
	 * Whether to enable retry
	 */
	enabled: boolean;

	/**
	 * Custom retry delay function
	 */
	customDelayFunction?: (attempt: number, baseDelay: number) => number;

	/**
	 * Error filter function to determine which errors should be retried
	 */
	errorFilter?: (error: Error) => boolean;
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
	attempt: number;
	timestamp: Date;
	error?: Error;
	delay: number;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
	success: boolean;
	result?: T;
	error?: Error;
	attempts: RetryAttempt[];
	totalTime: number;
}

/**
 * Event retry error
 */
export class EventRetryError extends Error {
	constructor(
		message: string,
		public readonly attempts: RetryAttempt[],
		public readonly totalTime: number,
		public readonly lastError?: Error,
	) {
		super(message);
		this.name = "EventRetryError";
	}
}

/**
 * Event retry interface
 */
export interface IEventRetry<T = EventType> {
	/**
	 * Execute a function with retry logic
	 */
	execute(fn: () => Promise<T>): Promise<T>;

	/**
	 * Execute a function with retry logic and custom configuration
	 */
	executeWithConfig(
		fn: () => Promise<T>,
		config: Partial<RetryConfig>,
	): Promise<T>;

	/**
	 * Get retry configuration
	 */
	getConfig(): RetryConfig;

	/**
	 * Update retry configuration
	 */
	updateConfig(config: Partial<RetryConfig>): void;

	/**
	 * Get retry statistics
	 */
	getStats(): {
		totalAttempts: number;
		successfulAttempts: number;
		failedAttempts: number;
		averageRetryTime: number;
		lastRetryTime?: Date;
	};
}

/**
 * Event retry implementation
 */
export class EventRetry<T = EventType> implements IEventRetry<T> {
	private config: RetryConfig;
	private stats: {
		totalAttempts: number;
		successfulAttempts: number;
		failedAttempts: number;
		totalRetryTime: number;
		lastRetryTime?: Date;
	};

	constructor(config: RetryConfig) {
		this.config = config;
		this.stats = {
			totalAttempts: 0,
			successfulAttempts: 0,
			failedAttempts: 0,
			totalRetryTime: 0,
		};
	}

	/**
	 * Execute a function with retry logic
	 */
	async execute(fn: () => Promise<T>): Promise<T> {
		return this.executeWithConfig(fn, {});
	}

	/**
	 * Execute a function with retry logic and custom configuration
	 */
	async executeWithConfig(
		fn: () => Promise<T>,
		config: Partial<RetryConfig>,
	): Promise<T> {
		const mergedConfig = { ...this.config, ...config };

		if (!mergedConfig.enabled) {
			return fn();
		}

		const startTime = Date.now();
		const attempts: RetryAttempt[] = [];
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= mergedConfig.maxAttempts; attempt++) {
			try {
				const result = await fn();
				this.stats.successfulAttempts++;
				this.stats.totalAttempts++;
				this.stats.lastRetryTime = new Date();

				const totalTime = Date.now() - startTime;
				this.stats.totalRetryTime += totalTime;

				return result;
			} catch (error) {
				lastError = error as Error;
				this.stats.failedAttempts++;
				this.stats.totalAttempts++;

				// Check if error should be retried
				if (mergedConfig.errorFilter && !mergedConfig.errorFilter(lastError)) {
					throw lastError;
				}

				// Don't retry on the last attempt
				if (attempt === mergedConfig.maxAttempts) {
					break;
				}

				// Calculate delay for next attempt
				const delay = this.calculateDelay(attempt, mergedConfig);
				attempts.push({
					attempt,
					timestamp: new Date(),
					error: lastError,
					delay,
				});

				// Wait before next attempt
				await this.sleep(delay);
			}
		}

		const totalTime = Date.now() - startTime;
		this.stats.totalRetryTime += totalTime;
		this.stats.lastRetryTime = new Date();

		throw new EventRetryError(
			`Failed after ${mergedConfig.maxAttempts} attempts`,
			attempts,
			totalTime,
			lastError,
		);
	}

	/**
	 * Get retry configuration
	 */
	getConfig(): RetryConfig {
		return { ...this.config };
	}

	/**
	 * Update retry configuration
	 */
	updateConfig(config: Partial<RetryConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get retry statistics
	 */
	getStats(): {
		totalAttempts: number;
		successfulAttempts: number;
		failedAttempts: number;
		averageRetryTime: number;
		lastRetryTime?: Date;
	} {
		const averageRetryTime =
			this.stats.totalAttempts > 0
				? this.stats.totalRetryTime / this.stats.totalAttempts
				: 0;

		return {
			totalAttempts: this.stats.totalAttempts,
			successfulAttempts: this.stats.successfulAttempts,
			failedAttempts: this.stats.failedAttempts,
			averageRetryTime,
			lastRetryTime: this.stats.lastRetryTime,
		};
	}

	/**
	 * Calculate delay for retry attempt
	 */
	private calculateDelay(attempt: number, config: RetryConfig): number {
		let delay: number;

		switch (config.strategy) {
			case RetryStrategy.FIXED:
				delay = config.baseDelay;
				break;
			case RetryStrategy.EXPONENTIAL:
				delay = config.baseDelay * 2 ** (attempt - 1);
				break;
			case RetryStrategy.LINEAR:
				delay = config.baseDelay * attempt;
				break;
			case RetryStrategy.CUSTOM:
				if (config.customDelayFunction) {
					delay = config.customDelayFunction(attempt, config.baseDelay);
				} else {
					delay = config.baseDelay;
				}
				break;
			default:
				delay = config.baseDelay;
		}

		// Apply jitter
		if (config.jitter > 0) {
			const jitterAmount = delay * config.jitter * Math.random();
			delay += jitterAmount;
		}

		// Ensure delay doesn't exceed maximum
		return Math.min(delay, config.maxDelay);
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * Event retry manager for multiple event types
 */
export class EventRetryManager {
	private retryInstances: Map<string, EventRetry<EventType>> = new Map();

	/**
	 * Create or get a retry instance for a specific event type
	 */
	getRetry<T extends EventType>(
		eventType: string,
		config: RetryConfig,
	): EventRetry<T> {
		if (!this.retryInstances.has(eventType)) {
			this.retryInstances.set(eventType, new EventRetry<T>(config));
		}
		return this.retryInstances.get(eventType) as EventRetry<T>;
	}

	/**
	 * Execute a function with retry logic for a specific event type
	 */
	async execute<T extends EventType>(
		eventType: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const retry = this.retryInstances.get(eventType);
		if (!retry) {
			throw new Error(`Retry instance not found for event type: ${eventType}`);
		}
		return retry.execute(fn) as Promise<T>;
	}

	/**
	 * Get statistics for all retry instances
	 */
	getAllStats(): Record<string, ReturnType<EventRetry["getStats"]>> {
		const stats: Record<string, ReturnType<EventRetry["getStats"]>> = {};
		for (const [eventType, retry] of Array.from(
			this.retryInstances.entries(),
		)) {
			stats[eventType] = retry.getStats();
		}
		return stats;
	}

	/**
	 * Get statistics for a specific retry instance
	 */
	getStats(eventType: string): ReturnType<EventRetry["getStats"]> | undefined {
		return this.retryInstances.get(eventType)?.getStats();
	}

	/**
	 * Update configuration for a specific retry instance
	 */
	updateConfig(eventType: string, config: Partial<RetryConfig>): void {
		this.retryInstances.get(eventType)?.updateConfig(config);
	}
}

/**
 * Default retry configurations
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 10000, // 10 seconds
	strategy: RetryStrategy.EXPONENTIAL,
	jitter: 0.1,
	enabled: true,
};

export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 5,
	baseDelay: 500, // 500ms
	maxDelay: 5000, // 5 seconds
	strategy: RetryStrategy.EXPONENTIAL,
	jitter: 0.2,
	enabled: true,
};

export const CONSERVATIVE_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 2,
	baseDelay: 2000, // 2 seconds
	maxDelay: 15000, // 15 seconds
	strategy: RetryStrategy.FIXED,
	jitter: 0.05,
	enabled: true,
};

export const FAST_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelay: 100, // 100ms
	maxDelay: 1000, // 1 second
	strategy: RetryStrategy.LINEAR,
	jitter: 0.1,
	enabled: true,
};

/**
 * Retry utilities
 */
export class RetryUtils {
	/**
	 * Check if an error should be retried
	 */
	static shouldRetry(error: Error): boolean {
		// Don't retry on client errors (4xx)
		if (
			error.message.includes("400") ||
			error.message.includes("401") ||
			error.message.includes("403") ||
			error.message.includes("404")
		) {
			return false;
		}

		// Don't retry on validation errors
		if (error.message.toLowerCase().includes("validation")) {
			return false;
		}

		// Retry on network errors, timeouts, and server errors
		if (
			error.message.toLowerCase().includes("network") ||
			error.message.toLowerCase().includes("timeout") ||
			error.message.toLowerCase().includes("500") ||
			error.message.toLowerCase().includes("502") ||
			error.message.toLowerCase().includes("503") ||
			error.message.toLowerCase().includes("504")
		) {
			return true;
		}

		return false;
	}

	/**
	 * Create a retry configuration for analytics events
	 */
	static createAnalyticsRetryConfig(): RetryConfig {
		return {
			...DEFAULT_RETRY_CONFIG,
			errorFilter: (error: Error) => {
				// Retry on network errors and timeouts
				return (
					error.message.toLowerCase().includes("network") ||
					error.message.toLowerCase().includes("timeout") ||
					error.message.toLowerCase().includes("500")
				);
			},
		};
	}

	/**
	 * Create a retry configuration for error events
	 */
	static createErrorRetryConfig(): RetryConfig {
		return {
			...AGGRESSIVE_RETRY_CONFIG,
			errorFilter: (error: Error) => {
				// Retry on most errors except validation errors
				return !error.message.toLowerCase().includes("validation");
			},
		};
	}

	/**
	 * Create a retry configuration for critical events
	 */
	static createCriticalRetryConfig(): RetryConfig {
		return {
			...AGGRESSIVE_RETRY_CONFIG,
			maxAttempts: 10,
			errorFilter: () => true, // Retry on all errors
		};
	}
}

/**
 * Convenience functions
 */
export function createEventRetry<T>(config: RetryConfig): EventRetry<T> {
	return new EventRetry<T>(config);
}

export function createDefaultEventRetry<T>(): EventRetry<T> {
	return new EventRetry<T>(DEFAULT_RETRY_CONFIG);
}

export function createAggressiveEventRetry<T>(): EventRetry<T> {
	return new EventRetry<T>(AGGRESSIVE_RETRY_CONFIG);
}

export function createConservativeEventRetry<T>(): EventRetry<T> {
	return new EventRetry<T>(CONSERVATIVE_RETRY_CONFIG);
}

export function createFastEventRetry<T>(): EventRetry<T> {
	return new EventRetry<T>(FAST_RETRY_CONFIG);
}

export function createAnalyticsEventRetry<T>(): EventRetry<T> {
	return new EventRetry<T>(RetryUtils.createAnalyticsRetryConfig());
}

export function createErrorEventRetry<T>(): EventRetry<T> {
	return new EventRetry<T>(RetryUtils.createErrorRetryConfig());
}

export function createCriticalEventRetry<T>(): EventRetry<T> {
	return new EventRetry<T>(RetryUtils.createCriticalRetryConfig());
}

export function createEventRetryManager(): EventRetryManager {
	return new EventRetryManager();
}
