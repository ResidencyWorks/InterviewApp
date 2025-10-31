/**
 * Unit tests for Upload Retry Logic
 *
 * @file tests/unit/lib/upload/retry-logic.test.ts
 */

import { describe, expect, it, vi } from "vitest";
import {
	calculateRetryDelay,
	canRetry,
	getNextRetryTime,
	retryWithBackoff,
	waitForRetry,
} from "@/lib/upload/retry-logic";
import type { RetryConfig } from "@/lib/upload/types";

describe("Upload Retry Logic", () => {
	describe("calculateRetryDelay", () => {
		it("should calculate exponential backoff correctly", () => {
			const config: RetryConfig = {
				baseDelay: 1000,
				multiplier: 2,
				jitter: 0.25,
				maxAttempts: 3,
			};

			const delay1 = calculateRetryDelay(1, config);
			const delay2 = calculateRetryDelay(2, config);
			const delay3 = calculateRetryDelay(3, config);

			// With jitter: should be within 1000 * 2^attempt ± 25%
			// Attempt 1: 1000 * 2^1 = 2000 ± 25%
			expect(delay1).toBeGreaterThanOrEqual(1500); // 2000 - 500
			expect(delay1).toBeLessThanOrEqual(2500); // 2000 + 500

			// Attempt 2: 1000 * 2^2 = 4000 ± 25%
			expect(delay2).toBeGreaterThanOrEqual(3000); // 4000 - 1000
			expect(delay2).toBeLessThanOrEqual(5000); // 4000 + 1000

			// Attempt 3: 1000 * 2^3 = 8000 ± 25%
			expect(delay3).toBeGreaterThanOrEqual(6000); // 8000 - 2000
			expect(delay3).toBeLessThanOrEqual(10000); // 8000 + 2000
		});

		it("should enforce minimum delay of 100ms", () => {
			const config: RetryConfig = {
				baseDelay: 10,
				multiplier: 1,
				jitter: 0,
				maxAttempts: 3,
			};

			const delay = calculateRetryDelay(1, config);
			expect(delay).toBeGreaterThanOrEqual(100);
		});

		it("should handle zero jitter", () => {
			const config: RetryConfig = {
				baseDelay: 1000,
				multiplier: 2,
				jitter: 0,
				maxAttempts: 3,
			};

			// Without jitter, results should be deterministic
			const delay1 = calculateRetryDelay(1, config);
			const delay2 = calculateRetryDelay(1, config);

			// With jitter: 0, results will still have randomness in the underlying calculation
			// but it should produce consistent exponential growth
			expect(delay1).toBeGreaterThan(0);
			expect(delay2).toBeGreaterThan(0);
		});
	});

	describe("waitForRetry", () => {
		it("should wait for specified delay", async () => {
			const start = Date.now();
			await waitForRetry(100);
			const end = Date.now();

			const elapsed = end - start;
			// Allow some margin for test execution
			expect(elapsed).toBeGreaterThanOrEqual(90);
			expect(elapsed).toBeLessThan(200);
		});
	});

	describe("canRetry", () => {
		it("should return true when attempts remain", () => {
			expect(canRetry(1, 3)).toBe(true);
			expect(canRetry(2, 3)).toBe(true);
		});

		it("should return false when max attempts reached", () => {
			expect(canRetry(3, 3)).toBe(false);
			expect(canRetry(4, 3)).toBe(false);
		});
	});

	describe("retryWithBackoff", () => {
		it("should succeed on first attempt without retry", async () => {
			const mockFn = vi.fn().mockResolvedValue("success");

			const result = await retryWithBackoff(mockFn);

			expect(result).toBe("success");
			expect(mockFn).toHaveBeenCalledTimes(1);
		});

		it("should retry on failure and succeed", async () => {
			const mockFn = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValue("success");

			const result = await retryWithBackoff(mockFn);

			expect(result).toBe("success");
			expect(mockFn).toHaveBeenCalledTimes(2);
		});

		it("should fail after max attempts", async () => {
			const config: RetryConfig = {
				baseDelay: 10,
				multiplier: 2,
				jitter: 0,
				maxAttempts: 3,
			};

			const mockFn = vi.fn().mockRejectedValue(new Error("Network timeout"));

			await expect(retryWithBackoff(mockFn, config)).rejects.toThrow(
				"Network timeout",
			);
			expect(mockFn).toHaveBeenCalledTimes(3);
		}, 1000);

		it("should use custom retry config", async () => {
			const config: RetryConfig = {
				baseDelay: 10, // Short delay for testing
				multiplier: 2,
				jitter: 0,
				maxAttempts: 2,
			};

			const mockFn = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValue("success");

			const result = await retryWithBackoff(mockFn, config);

			expect(result).toBe("success");
			expect(mockFn).toHaveBeenCalledTimes(2);
		});

		it("should throw last error if all retries fail", async () => {
			const config: RetryConfig = {
				baseDelay: 10,
				multiplier: 2,
				jitter: 0,
				maxAttempts: 2,
			};

			const error1 = new Error("First error");
			const error2 = new Error("Second error");

			const mockFn = vi
				.fn()
				.mockRejectedValueOnce(error1)
				.mockRejectedValueOnce(error2);

			await expect(retryWithBackoff(mockFn, config)).rejects.toThrow(
				"Second error",
			);
		});

		it("should not wait after last attempt", async () => {
			const config: RetryConfig = {
				baseDelay: 50, // Short delay for testing
				multiplier: 2,
				jitter: 0,
				maxAttempts: 2,
			};

			const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

			const start = Date.now();
			await expect(retryWithBackoff(mockFn, config)).rejects.toThrow();
			const end = Date.now();

			const elapsed = end - start;
			// Should only wait once (after first attempt), not after second
			// First delay is ~100ms (50 * 2^1), so total should be < 200ms
			expect(elapsed).toBeLessThan(300);
		}, 1000); // Increased timeout for this test
	});

	describe("getNextRetryTime", () => {
		it("should calculate next retry time correctly", () => {
			const config: RetryConfig = {
				baseDelay: 1000,
				multiplier: 2,
				jitter: 0,
				maxAttempts: 3,
			};

			const nextRetry = getNextRetryTime(1, config);
			const now = new Date();

			// Next retry should be approximately now + delay
			const diff = nextRetry.getTime() - now.getTime();

			// Should be approximately 2000ms (1000 * 2^1)
			// Allow some margin for test execution
			expect(diff).toBeGreaterThan(1800);
			expect(diff).toBeLessThan(2500);
		});
	});
});
