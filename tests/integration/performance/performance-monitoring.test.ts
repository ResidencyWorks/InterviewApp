import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	PERFORMANCE_TARGETS,
	performanceMonitor,
	timeOperation,
} from "@/features/scheduling/infrastructure/monitoring/performance";

/**
 * Performance monitoring system tests
 * Tests the core performance monitoring functionality without external dependencies
 */

describe("Performance Monitoring System", () => {
	beforeAll(() => {
		// Clear any existing metrics
		performanceMonitor.clear();
	});

	afterAll(() => {
		// Clean up
		performanceMonitor.clear();
	});

	describe("Performance Monitor Core Functionality", () => {
		it("should track operation timing accurately", async () => {
			const operationId = performanceMonitor.start("test.operation", {
				testData: "test",
			});

			// Simulate some work
			await new Promise((resolve) => setTimeout(resolve, 50));

			const metrics = performanceMonitor.end(operationId, true, {
				result: "success",
			});

			expect(metrics.operation).toBe("test.operation");
			expect(metrics.duration).toBeGreaterThan(40); // Should be at least 40ms
			expect(metrics.duration).toBeLessThan(100); // Should be less than 100ms
			expect(metrics.success).toBe(true);
			expect(metrics.metadata).toEqual({
				result: "success",
				testData: "test",
			});
		});

		it("should track failed operations", async () => {
			const operationId = performanceMonitor.start("test.failure");

			try {
				// Simulate some work
				await new Promise((resolve) => setTimeout(resolve, 25));
				throw new Error("Test error");
			} catch (error) {
				const metrics = performanceMonitor.end(operationId, false, {
					error: error instanceof Error ? error.message : "Unknown error",
				});

				expect(metrics.operation).toBe("test.failure");
				expect(metrics.duration).toBeGreaterThan(20);
				expect(metrics.duration).toBeLessThan(50);
				expect(metrics.success).toBe(false);
				expect(metrics.metadata?.error).toBe("Test error");
			}
		});

		it("should provide operation statistics", async () => {
			// Clear previous metrics
			performanceMonitor.clear();

			// Perform multiple operations
			for (let i = 0; i < 5; i++) {
				const operationId = performanceMonitor.start("test.stats");
				await new Promise((resolve) => setTimeout(resolve, 10 + i * 5));
				performanceMonitor.end(operationId, true, { iteration: i });
			}

			const stats = performanceMonitor.getStats("test.stats");

			expect(stats.count).toBe(5);
			expect(stats.avgDuration).toBeGreaterThan(10);
			expect(stats.minDuration).toBeGreaterThanOrEqual(9); // Allow for setTimeout timing variance
			expect(stats.maxDuration).toBeGreaterThan(28); // Allow for setTimeout timing variance
			expect(stats.successRate).toBe(100);
			expect(stats.targetMet).toBe(100); // All operations should meet target
		});

		it("should filter metrics by operation", async () => {
			performanceMonitor.clear();

			// Perform different operations
			const op1Id = performanceMonitor.start("operation.1");
			await new Promise((resolve) => setTimeout(resolve, 20));
			performanceMonitor.end(op1Id, true);

			const op2Id = performanceMonitor.start("operation.2");
			await new Promise((resolve) => setTimeout(resolve, 30));
			performanceMonitor.end(op2Id, true);

			const op1Metrics =
				performanceMonitor.getMetricsForOperation("operation.1");
			const op2Metrics =
				performanceMonitor.getMetricsForOperation("operation.2");

			expect(op1Metrics).toHaveLength(1);
			expect(op2Metrics).toHaveLength(1);
			expect(op1Metrics[0].operation).toBe("operation.1");
			expect(op2Metrics[0].operation).toBe("operation.2");
		});
	});

	describe("Time Operation Utility", () => {
		it("should time async operations correctly", async () => {
			const { result, metrics } = await timeOperation(
				"test.async",
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 30));
					return "test result";
				},
				{ test: true },
			);

			expect(result).toBe("test result");
			expect(metrics.operation).toBe("test.async");
			expect(metrics.duration).toBeGreaterThan(25);
			expect(metrics.duration).toBeLessThan(50);
			expect(metrics.success).toBe(true);
			expect(metrics.metadata?.test).toBe(true);
		});

		it("should handle async operation failures", async () => {
			try {
				await timeOperation(
					"test.async.failure",
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 20));
						throw new Error("Async test error");
					},
					{ test: true },
				);
				expect.fail("Should have thrown an error");
			} catch (error: unknown) {
				const typedError = error as {
					error: { message: string };
					metrics: { operation: string; success: boolean; duration: number };
				};
				expect(typedError.error.message).toBe("Async test error");
				expect(typedError.metrics.operation).toBe("test.async.failure");
				expect(typedError.metrics.success).toBe(false);
				expect(typedError.metrics.duration).toBeGreaterThan(15);
			}
		});
	});

	describe("Performance Targets", () => {
		it("should have all required performance targets defined", () => {
			const requiredTargets = [
				"api.evaluate",
				"redis.lookup",
				"content.validation",
				"content.hotswap",
			];

			for (const target of requiredTargets) {
				expect(PERFORMANCE_TARGETS[target]).toBeDefined();
				expect(PERFORMANCE_TARGETS[target].targetMs).toBeGreaterThan(0);
				expect(PERFORMANCE_TARGETS[target].warningThreshold).toBeGreaterThan(0);
				expect(PERFORMANCE_TARGETS[target].criticalThreshold).toBeGreaterThan(
					0,
				);
			}
		});

		it("should have realistic performance targets", () => {
			// API evaluation should be fast
			expect(PERFORMANCE_TARGETS["api.evaluate"].targetMs).toBeLessThanOrEqual(
				250,
			);

			// Redis lookups should be very fast
			expect(PERFORMANCE_TARGETS["redis.lookup"].targetMs).toBeLessThanOrEqual(
				50,
			);

			// Content validation can take longer but should be reasonable
			expect(
				PERFORMANCE_TARGETS["content.validation"].targetMs,
			).toBeLessThanOrEqual(1000);
			expect(
				PERFORMANCE_TARGETS["content.hotswap"].targetMs,
			).toBeLessThanOrEqual(1000);
		});

		it("should have proper threshold ratios", () => {
			for (const [, target] of Object.entries(PERFORMANCE_TARGETS)) {
				expect(target.warningThreshold).toBeLessThan(1.0);
				expect(target.criticalThreshold).toBeGreaterThanOrEqual(
					target.warningThreshold,
				);
				expect(target.criticalThreshold).toBeLessThanOrEqual(1.0);
			}
		});
	});

	describe("Performance Monitoring Integration", () => {
		it("should track multiple operations and provide aggregate stats", async () => {
			performanceMonitor.clear();

			// Simulate different types of operations
			const operations = [
				{ duration: 200, name: "api.evaluate" },
				{ duration: 180, name: "api.evaluate" },
				{ duration: 35, name: "redis.lookup" },
				{ duration: 45, name: "redis.lookup" },
				{ duration: 800, name: "content.validation" },
			];

			for (const op of operations) {
				const operationId = performanceMonitor.start(op.name);
				await new Promise((resolve) => setTimeout(resolve, op.duration));
				performanceMonitor.end(operationId, true);
			}

			// Check individual operation stats
			const apiStats = performanceMonitor.getStats("api.evaluate");
			const redisStats = performanceMonitor.getStats("redis.lookup");
			const contentStats = performanceMonitor.getStats("content.validation");

			expect(apiStats.count).toBe(2);
			expect(apiStats.avgDuration).toBeGreaterThan(180);
			expect(apiStats.targetMet).toBe(100); // Both should meet 250ms target

			expect(redisStats.count).toBe(2);
			expect(redisStats.avgDuration).toBeGreaterThan(30);
			expect(redisStats.targetMet).toBeGreaterThanOrEqual(50); // Allow for setTimeout timing variance

			expect(contentStats.count).toBe(1);
			expect(contentStats.avgDuration).toBeGreaterThan(700);
			expect(contentStats.targetMet).toBe(100); // Should meet 1000ms target
		});

		it("should handle concurrent operations", async () => {
			performanceMonitor.clear();

			// Start multiple operations concurrently
			const operations = [
				performanceMonitor.start("concurrent.1"),
				performanceMonitor.start("concurrent.2"),
				performanceMonitor.start("concurrent.3"),
			];

			// End them with different timings
			await new Promise((resolve) => setTimeout(resolve, 20));
			performanceMonitor.end(operations[0], true);

			await new Promise((resolve) => setTimeout(resolve, 20));
			performanceMonitor.end(operations[1], true);

			await new Promise((resolve) => setTimeout(resolve, 20));
			performanceMonitor.end(operations[2], true);

			const metrics = performanceMonitor.getMetrics();
			expect(metrics).toHaveLength(3);

			// All should be successful
			const allSuccessful = metrics.every((m) => m.success);
			expect(allSuccessful).toBe(true);
		});
	});
});
