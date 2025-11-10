/**
 * Upload Retry Logic
 * Implements exponential backoff retry strategy for failed uploads
 *
 * @file src/lib/upload/retry-logic.ts
 */

import type { RetryConfig } from "./types";
import { DEFAULT_RETRY_CONFIG } from "./types";

/**
 * Calculate next retry delay using exponential backoff with jitter
 *
 * @param attempt - Current attempt number (1-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(
	attempt: number,
	config: RetryConfig = DEFAULT_RETRY_CONFIG,
): number {
	const exponentialDelay = config.baseDelay * config.multiplier ** attempt;

	// Add jitter: ±jitter percentage
	const jitterRange = exponentialDelay * config.jitter;
	const jitter = (Math.random() * 2 - 1) * jitterRange;

	// Ensure minimum delay of 100ms
	return Math.max(100, exponentialDelay + jitter);
}

/**
 * Wait for specified delay
 *
 * @param delayMs - Delay in milliseconds
 * @returns Promise that resolves after delay
 */
export async function waitForRetry(delayMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Execute function with retry logic
 *
 * @param fn - Function to execute with retries
 * @param config - Retry configuration
 * @returns Result or throws last error
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// If this is the last attempt, don't wait
			if (attempt === config.maxAttempts) {
				break;
			}

			// Calculate delay and wait
			const delay = calculateRetryDelay(attempt, config);
			await waitForRetry(delay);
		}
	}

	// All attempts failed
	throw lastError;
}

/**
 * Check if we can retry based on attempt count
 *
 * @param attempt - Current attempt number
 * @param maxAttempts - Maximum attempts allowed
 * @returns True if retry is allowed
 */
export function canRetry(attempt: number, maxAttempts: number): boolean {
	return attempt < maxAttempts;
}

/**
 * Calculate next retry timestamp
 *
 * @param attempt - Current attempt number
 * @param config - Retry configuration
 * @returns Date object for next retry
 */
export function getNextRetryTime(
	attempt: number,
	config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Date {
	const delayMs = calculateRetryDelay(attempt, config);
	const nextRetryAt = new Date();
	nextRetryAt.setTime(nextRetryAt.getTime() + delayMs);
	return nextRetryAt;
}
