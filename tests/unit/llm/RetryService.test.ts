/**
 * Unit tests for RetryService
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetryService } from "@/lib/llm/infrastructure/retry/RetryService";
import type { RetryConfig } from "@/lib/llm/types/config";

describe("RetryService", () => {
	let retryService: RetryService;
	let mockConfig: RetryConfig;

	beforeEach(() => {
		mockConfig = {
			maxAttempts: 3,
			baseDelay: 1000,
			maxDelay: 10000,
			jitter: true,
		};
		retryService = new RetryService(mockConfig);
	});

	describe("execute", () => {
		it("should succeed on first attempt", async () => {
			const mockOperation = vi.fn().mockResolvedValue("success");

			const result = await retryService.execute(mockOperation);

			expect(result.result).toBe("success");
			expect(result.attempts).toBe(1);
			expect(mockOperation).toHaveBeenCalledTimes(1);
		});

		it("should retry on failure and eventually succeed", async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValue("success");

			const result = await retryService.execute(mockOperation);

			expect(result.result).toBe("success");
			expect(result.attempts).toBe(3);
			expect(mockOperation).toHaveBeenCalledTimes(3);
		});

		it("should fail after max attempts", async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValue(new Error("Persistent error"));

			await expect(retryService.execute(mockOperation)).rejects.toThrow(
				"Persistent error",
			);
			expect(mockOperation).toHaveBeenCalledTimes(3);
		});

		it("should respect shouldRetry function", async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValue(new Error("Validation error"));
			const shouldRetry = vi.fn().mockReturnValue(false);

			await expect(
				retryService.execute(mockOperation, { shouldRetry }),
			).rejects.toThrow("Validation error");
			expect(mockOperation).toHaveBeenCalledTimes(1);
			expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
		});
	});

	describe("executeWithFastRetry", () => {
		it("should use fast retry for transient errors", async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValueOnce(new Error("timeout"))
				.mockResolvedValue("success");

			const result = await retryService.executeWithFastRetry(mockOperation);

			expect(result.result).toBe("success");
			expect(result.attempts).toBe(2);
		});

		it("should fall back to normal retry if fast retry fails", async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValue(new Error("timeout"))
				.mockRejectedValue(new Error("timeout"))
				.mockRejectedValue(new Error("timeout"))
				.mockResolvedValue("success");

			const result = await retryService.executeWithFastRetry(mockOperation);

			expect(result.result).toBe("success");
			expect(result.attempts).toBeGreaterThan(2);
		});
	});

	describe("executeWithConnectionPool", () => {
		it("should optimize delays for connection pool scenarios", async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValueOnce(new Error("Connection error"))
				.mockResolvedValue("success");

			const result =
				await retryService.executeWithConnectionPool(mockOperation);

			expect(result.result).toBe("success");
			expect(result.attempts).toBe(2);
		});
	});

	describe("isTransientError", () => {
		it("should identify transient errors correctly", () => {
			const transientErrors = [
				new Error("timeout"),
				new Error("connection failed"),
				new Error("network error"),
				new Error("ECONNRESET"),
				new Error("ENOTFOUND"),
			];

			transientErrors.forEach((error) => {
				// Access private method through any for testing
				const isTransient = (retryService as any).isTransientError(error);
				expect(isTransient).toBe(true);
			});
		});

		it("should not identify non-transient errors as transient", () => {
			const nonTransientErrors = [
				new Error("validation error"),
				new Error("authentication failed"),
				new Error("business logic error"),
			];

			nonTransientErrors.forEach((error) => {
				// Access private method through any for testing
				const isTransient = (retryService as any).isTransientError(error);
				expect(isTransient).toBe(false);
			});
		});
	});

	describe("getPerformanceMetrics", () => {
		it("should return performance metrics", () => {
			const metrics = retryService.getPerformanceMetrics();

			expect(metrics).toHaveProperty("averageRetryTime");
			expect(metrics).toHaveProperty("successRate");
			expect(metrics).toHaveProperty("fastRetrySuccessRate");
		});
	});

	describe("configuration", () => {
		it("should update configuration", () => {
			const newConfig = { maxAttempts: 5 };
			retryService.updateConfig(newConfig);

			const config = retryService.getConfig();
			expect(config.maxAttempts).toBe(5);
		});

		it("should return current configuration", () => {
			const config = retryService.getConfig();
			expect(config).toEqual(mockConfig);
		});
	});
});
