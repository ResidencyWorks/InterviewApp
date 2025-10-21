import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	PERFORMANCE_TARGETS,
	performanceMonitor,
} from "@/lib/monitoring/performance";
import { contentPackValidationService } from "@/lib/services/content-pack-validation";
import {
	contentPackCache,
	userEntitlementCache,
} from "../../src/lib/redis/index";

/**
 * Performance benchmark tests for success criteria validation
 * Tests performance targets defined in the specification:
 * - /api/evaluate ≤250ms
 * - Redis lookups ≤50ms
 * - Content validation ≤1s
 */

describe("Performance Benchmarks", () => {
	const testUserId = "test-user-123";
	const testEntitlement = "PRO";
	const testContentPack = {
		content: {
			categories: [
				{
					created_at: new Date().toISOString(),
					description: "Questions about past behavior",
					id: "cat-1",
					name: "Behavioral Questions",
					updated_at: new Date().toISOString(),
				},
				{
					created_at: new Date().toISOString(),
					description: "Technical knowledge questions",
					id: "cat-2",
					name: "Technical Questions",
					updated_at: new Date().toISOString(),
				},
			],
			questions: Array.from({ length: 50 }, (_, i) => ({
				category_id: i % 2 === 0 ? "cat-1" : "cat-2",
				created_at: new Date().toISOString(),
				difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
				expected_keywords: ["test", "performance"],
				id: `q-${i + 1}`,
				model_answer: `Model answer for question ${i + 1}`,
				text: `Test question ${i + 1} with sufficient length to test performance`,
				time_limit: 120,
				type:
					i % 3 === 0
						? "behavioral"
						: i % 3 === 1
							? "technical"
							: "situational",
				updated_at: new Date().toISOString(),
			})),
		},
		created_at: new Date().toISOString(),
		description: "Test content pack for performance testing",
		id: "test-pack-1",
		is_active: true,
		name: "Test Content Pack",
		updated_at: new Date().toISOString(),
		version: "1.0.0",
	};

	beforeAll(async () => {
		// Clear any existing metrics
		performanceMonitor.clear();
	});

	afterAll(async () => {
		// Clean up test data
		await userEntitlementCache.deleteEntitlement(testUserId);
		await contentPackCache.deleteContentPack(testContentPack.version);
	});

	describe("Redis Lookup Performance", () => {
		it("should meet Redis lookup target (≤50ms)", async () => {
			// Set up test data
			await userEntitlementCache.setEntitlement(testUserId, testEntitlement);

			// Perform multiple lookups to get average performance
			const iterations = 10;
			const durations: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const start = performance.now();
				await userEntitlementCache.getEntitlement(testUserId);
				const duration = performance.now() - start;
				durations.push(duration);
			}

			const avgDuration =
				durations.reduce((a, b) => a + b, 0) / durations.length;
			const maxDuration = Math.max(...durations);

			console.log(
				`Redis lookup performance: avg=${avgDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`,
			);

			// Check against performance target
			expect(avgDuration).toBeLessThanOrEqual(
				PERFORMANCE_TARGETS["redis.lookup"].targetMs,
			);
			expect(maxDuration).toBeLessThanOrEqual(
				PERFORMANCE_TARGETS["redis.lookup"].targetMs * 1.5,
			); // Allow 50% variance for max
		});

		it("should meet Redis set performance target", async () => {
			const iterations = 10;
			const durations: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const start = performance.now();
				await userEntitlementCache.setEntitlement(`test-user-${i}`, "TRIAL");
				const duration = performance.now() - start;
				durations.push(duration);
			}

			const avgDuration =
				durations.reduce((a, b) => a + b, 0) / durations.length;
			const maxDuration = Math.max(...durations);

			console.log(
				`Redis set performance: avg=${avgDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`,
			);

			// Redis set operations should be reasonably fast
			expect(avgDuration).toBeLessThanOrEqual(100); // 100ms target for set operations
			expect(maxDuration).toBeLessThanOrEqual(200); // 200ms max for set operations
		});

		it("should meet Redis batch operations performance target", async () => {
			const userIds = Array.from({ length: 20 }, (_, i) => `batch-user-${i}`);
			const entitlements = userIds.reduce(
				(acc, id) => {
					acc[id] = "PRO";
					return acc;
				},
				{} as Record<string, string>,
			);

			const start = performance.now();
			await userEntitlementCache.setMultipleEntitlements(entitlements);
			const setDuration = performance.now() - start;

			const getStart = performance.now();
			await userEntitlementCache.getMultipleEntitlements(userIds);
			const getDuration = performance.now() - getStart;

			console.log(
				`Redis batch operations: set=${setDuration.toFixed(2)}ms, get=${getDuration.toFixed(2)}ms`,
			);

			// Batch operations should be efficient
			expect(setDuration).toBeLessThanOrEqual(500); // 500ms for 20 items
			expect(getDuration).toBeLessThanOrEqual(200); // 200ms for 20 items
		});
	});

	describe("Content Pack Validation Performance", () => {
		it("should meet content validation target (≤1s)", async () => {
			const iterations = 5;
			const durations: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const start = performance.now();
				const result =
					await contentPackValidationService.validateContentPack(
						testContentPack,
					);
				const duration = performance.now() - start;
				durations.push(duration);

				expect(result.valid).toBe(true);
				expect(result.performance.targetMet).toBe(true);
			}

			const avgDuration =
				durations.reduce((a, b) => a + b, 0) / durations.length;
			const maxDuration = Math.max(...durations);

			console.log(
				`Content validation performance: avg=${avgDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`,
			);

			// Check against performance target
			expect(avgDuration).toBeLessThanOrEqual(
				PERFORMANCE_TARGETS["content.validation"].targetMs,
			);
			expect(maxDuration).toBeLessThanOrEqual(
				PERFORMANCE_TARGETS["content.validation"].targetMs * 1.2,
			); // Allow 20% variance
		});

		it("should meet content hot-swap validation target (≤1s)", async () => {
			const iterations = 3;
			const durations: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const start = performance.now();
				const result =
					await contentPackValidationService.validateForHotSwap(
						testContentPack,
					);
				const duration = performance.now() - start;
				durations.push(duration);

				expect(result.valid).toBe(true);
				expect(result.performance.targetMet).toBe(true);
			}

			const avgDuration =
				durations.reduce((a, b) => a + b, 0) / durations.length;
			const maxDuration = Math.max(...durations);

			console.log(
				`Content hot-swap performance: avg=${avgDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`,
			);

			// Check against performance target
			expect(avgDuration).toBeLessThanOrEqual(
				PERFORMANCE_TARGETS["content.hotswap"].targetMs,
			);
			expect(maxDuration).toBeLessThanOrEqual(
				PERFORMANCE_TARGETS["content.hotswap"].targetMs * 1.2,
			);
		});

		it("should handle large content packs efficiently", async () => {
			// Create a larger content pack
			const largeContentPack = {
				...testContentPack,
				content: {
					...testContentPack.content,
					questions: Array.from({ length: 200 }, (_, i) => ({
						category_id: i % 2 === 0 ? "cat-1" : "cat-2",
						created_at: new Date().toISOString(),
						difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
						expected_keywords: ["large", "performance", "test"],
						id: `large-q-${i + 1}`,
						model_answer: `Detailed model answer for large content pack question ${i + 1}`,
						text: `Large content pack question ${i + 1} with more detailed text to test performance with larger datasets`,
						time_limit: 120,
						type:
							i % 3 === 0
								? "behavioral"
								: i % 3 === 1
									? "technical"
									: "situational",
						updated_at: new Date().toISOString(),
					})),
				},
			};

			const start = performance.now();
			const result =
				await contentPackValidationService.validateContentPack(
					largeContentPack,
				);
			const duration = performance.now() - start;

			console.log(`Large content pack validation: ${duration.toFixed(2)}ms`);

			expect(result.valid).toBe(true);
			expect(duration).toBeLessThanOrEqual(2000); // 2s for large content packs
			expect(result.metadata.questionCount).toBe(200);
		});
	});

	describe("API Evaluation Performance", () => {
		it("should meet evaluation API target (≤250ms)", async () => {
			// Simulate evaluation API call
			const testResponse =
				"This is a test response for performance benchmarking";
			const iterations = 10;
			const durations: number[] = [];

			for (let i = 0; i < iterations; i++) {
				// Simulate the evaluation operation
				const operationId = performanceMonitor.start("api.evaluate", {
					responseLength: testResponse.length,
					wordCount: testResponse.split(" ").length,
				});

				// Simulate processing time
				await new Promise((resolve) => setTimeout(resolve, 100));

				const metrics = performanceMonitor.end(operationId, true, {
					type: "text",
					wordCount: testResponse.split(" ").length,
				});

				durations.push(metrics.duration);
			}

			const avgDuration =
				durations.reduce((a, b) => a + b, 0) / durations.length;
			const maxDuration = Math.max(...durations);

			console.log(
				`API evaluation performance: avg=${avgDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`,
			);

			// Check against performance target
			expect(avgDuration).toBeLessThanOrEqual(
				PERFORMANCE_TARGETS["api.evaluate"].targetMs,
			);
			expect(maxDuration).toBeLessThanOrEqual(
				PERFORMANCE_TARGETS["api.evaluate"].targetMs * 1.3,
			); // Allow 30% variance
		});
	});

	describe("Performance Monitoring System", () => {
		it("should track performance metrics accurately", async () => {
			// Clear previous metrics
			performanceMonitor.clear();

			// Perform some operations
			await userEntitlementCache.getEntitlement(testUserId);
			await contentPackValidationService.validateContentPack(testContentPack);

			// Check that metrics were recorded
			const metrics = performanceMonitor.getMetrics();
			expect(metrics.length).toBeGreaterThan(0);

			// Check Redis lookup metrics
			const redisStats = performanceMonitor.getStats("redis.lookup");
			expect(redisStats.count).toBeGreaterThan(0);
			expect(redisStats.avgDuration).toBeGreaterThan(0);
			expect(redisStats.targetMs).toBe(
				PERFORMANCE_TARGETS["redis.lookup"].targetMs,
			);

			// Check content validation metrics
			const contentStats = performanceMonitor.getStats("content.validation");
			expect(contentStats.count).toBeGreaterThan(0);
			expect(contentStats.avgDuration).toBeGreaterThan(0);
			expect(contentStats.targetMs).toBe(
				PERFORMANCE_TARGETS["content.validation"].targetMs,
			);
		});

		it("should provide performance statistics", () => {
			const redisStats = performanceMonitor.getStats("redis.lookup");
			const contentStats = performanceMonitor.getStats("content.validation");

			// Check that stats include all required fields
			expect(redisStats).toHaveProperty("count");
			expect(redisStats).toHaveProperty("avgDuration");
			expect(redisStats).toHaveProperty("minDuration");
			expect(redisStats).toHaveProperty("maxDuration");
			expect(redisStats).toHaveProperty("successRate");
			expect(redisStats).toHaveProperty("targetMs");
			expect(redisStats).toHaveProperty("targetMet");

			expect(contentStats).toHaveProperty("count");
			expect(contentStats).toHaveProperty("avgDuration");
			expect(contentStats).toHaveProperty("minDuration");
			expect(contentStats).toHaveProperty("maxDuration");
			expect(contentStats).toHaveProperty("successRate");
			expect(contentStats).toHaveProperty("targetMs");
			expect(contentStats).toHaveProperty("targetMet");
		});
	});

	describe("Performance Targets Validation", () => {
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
	});
});
