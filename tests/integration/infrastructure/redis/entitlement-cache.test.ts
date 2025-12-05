import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRedisClient } from "@/infrastructure/config/clients";
import { UserEntitlementCache } from "@/infrastructure/redis";

// Mock Redis client
vi.mock("@/infrastructure/config/clients", () => {
	const mockRedis = {
		get: vi.fn(),
		setex: vi.fn(),
		del: vi.fn(),
		exists: vi.fn(),
	};

	return {
		getRedisClient: vi.fn(() => mockRedis),
	};
});

// Mock database service - UserEntitlementCache uses getServerDatabaseService() and accesses supabase directly
vi.mock("@/infrastructure/db/database-service", async () => {
	const actual = await vi.importActual("@/infrastructure/db/database-service");
	const mockQuery = vi.fn();
	const createMockQueryChain = () => ({
		select: vi.fn(() => ({
			eq: vi.fn(() => ({
				gte: vi.fn(() => ({
					order: vi.fn(() => ({
						limit: vi.fn(() => ({
							maybeSingle: mockQuery,
						})),
					})),
				})),
			})),
		})),
	});

	const mockSupabaseInstance = {
		from: vi.fn(() => createMockQueryChain()),
	};

	// Store references globally for test access
	(globalThis as any).__mockSupabaseQuery = mockQuery;
	(globalThis as any).__mockSupabase = mockSupabaseInstance;

	return {
		...actual,
		getServerDatabaseService: vi.fn(async () => ({
			getClient: () => mockSupabaseInstance,
			supabase: mockSupabaseInstance,
		})),
	};
});

// Mock redis cache service - define inside factory to avoid hoisting issues
vi.mock("@/infrastructure/redis", async () => {
	const actual = await vi.importActual<typeof import("@/infrastructure/redis")>(
		"@/infrastructure/redis",
	);
	// Create mock inside factory
	const mockCache = {
		get: vi.fn(),
		set: vi.fn().mockResolvedValue(true), // Return Promise<boolean> like RedisCacheService.set
		delete: vi.fn().mockResolvedValue(true), // Return Promise<boolean> like RedisCacheService.delete
		mget: vi.fn(),
		mset: vi.fn().mockResolvedValue(true), // Return Promise<boolean> like RedisCacheService.mset
	};
	// Store reference globally for test access
	(globalThis as any).__mockRedisCache = mockCache;
	// Override redisCache with our mock
	return {
		...actual,
		redisCache: mockCache,
	};
});

describe("Entitlement Cache Integration - Cache Hit/Miss", () => {
	let cache: UserEntitlementCache;

	beforeEach(() => {
		vi.clearAllMocks();
		// Get mock references from global
		const mockRedisCache = (globalThis as any).__mockRedisCache;
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQuery;
		const mockSupabase = (globalThis as any).__mockSupabase;

		// Clear mock call history but keep implementations
		if (mockRedisCache) {
			mockRedisCache.get.mockClear();
			mockRedisCache.set.mockClear();
			mockRedisCache.delete.mockClear();
		}
		if (mockSupabaseQuery) {
			mockSupabaseQuery.mockClear();
		}
		if (mockSupabase) {
			mockSupabase.from.mockClear();
		}
		// Pass mocked cache instance to constructor
		cache = new UserEntitlementCache(mockRedisCache);
	});

	describe("Cache Hit Scenario", () => {
		it("should return cached entitlement when available and not expired", async () => {
			const mockRedisCache = (globalThis as any).__mockRedisCache;
			const mockSupabase = (globalThis as any).__mockSupabase;

			const userId = "user_cache_hit";
			const cachedData = {
				entitlementLevel: "PRO" as const,
				expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
			};

			// Set up mock to return cached data - use mockResolvedValue to set default
			mockRedisCache.get.mockResolvedValue(cachedData);

			const result = await cache.get(userId);

			expect(result).toBe("PRO");
			expect(mockRedisCache.get).toHaveBeenCalledWith(
				`user:${userId}:entitlement`,
			);
			// Should not query database on cache hit
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it("should return cached value immediately without database lookup", async () => {
			const mockRedisCache = (globalThis as any).__mockRedisCache;
			const mockSupabase = (globalThis as any).__mockSupabase;

			const userId = "user_fast_cache";
			const cachedData = {
				entitlementLevel: "TRIAL" as const,
				expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
			};

			mockRedisCache.get.mockResolvedValueOnce(cachedData);

			const result = await cache.get(userId);

			expect(result).toBe("TRIAL");
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});
	});

	describe("Cache Miss Scenario", () => {
		it("should query database on cache miss and refresh cache", async () => {
			const mockRedisCache = (globalThis as any).__mockRedisCache;
			const mockSupabaseQuery = (globalThis as any).__mockSupabaseQuery;
			const mockSupabase = (globalThis as any).__mockSupabase;

			const userId = "user_cache_miss";
			const dbEntitlement = {
				entitlement_level: "PRO" as const,
				expires_at: new Date(Date.now() + 86400000).toISOString(),
			};

			// Cache miss
			mockRedisCache.get.mockResolvedValueOnce(null);

			// Database returns entitlement
			mockSupabaseQuery.mockResolvedValueOnce({
				data: dbEntitlement,
				error: null,
			});

			// Cache set succeeds
			mockRedisCache.set.mockResolvedValueOnce(true);

			const result = await cache.get(userId);

			expect(result).toBe("PRO");
			expect(mockSupabase.from).toHaveBeenCalledWith("user_entitlements");
			// Should refresh cache from database
			expect(mockRedisCache.set).toHaveBeenCalledWith(
				`user:${userId}:entitlement`,
				expect.objectContaining({
					entitlementLevel: "PRO",
					expiresAt: dbEntitlement.expires_at,
				}),
				3600, // 1 hour TTL
			);
		});

		it("should return null when database has no entitlements", async () => {
			const mockRedisCache = (globalThis as any).__mockRedisCache;
			const mockSupabaseQuery = (globalThis as any).__mockSupabaseQuery;
			const mockSupabase = (globalThis as any).__mockSupabase;

			const userId = "user_no_entitlement";

			mockRedisCache.get.mockResolvedValueOnce(null);
			mockSupabaseQuery.mockResolvedValueOnce({
				data: null,
				error: null,
			});

			const result = await cache.get(userId);

			expect(result).toBeNull();
			expect(mockSupabase.from).toHaveBeenCalledWith("user_entitlements");
			// Should not set cache for null result
			expect(mockRedisCache.set).not.toHaveBeenCalled();
		});

		it("should handle cache refresh failure gracefully", async () => {
			const mockRedisCache = (globalThis as any).__mockRedisCache;
			const mockSupabaseQuery = (globalThis as any).__mockSupabaseQuery;

			const userId = "user_cache_refresh_fail";
			const dbEntitlement = {
				entitlement_level: "PRO" as const,
				expires_at: new Date(Date.now() + 86400000).toISOString(),
			};

			mockRedisCache.get.mockResolvedValueOnce(null);
			mockSupabaseQuery.mockResolvedValueOnce({
				data: dbEntitlement,
				error: null,
			});
			// Cache set fails but we still return the entitlement
			mockRedisCache.set.mockResolvedValueOnce(false);

			// Should still return the entitlement even if cache write fails
			const result = await cache.get(userId);

			expect(result).toBe("PRO");
			expect(mockRedisCache.set).toHaveBeenCalled();
		});
	});
});
