import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRedisClient } from "@/infrastructure/config/clients";
import { redisCache, UserEntitlementCache } from "@/infrastructure/redis";

// Mock Redis client - define inside factory to avoid hoisting issues
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
	(globalThis as any).__mockSupabaseQueryUnit = mockQuery;
	(globalThis as any).__mockSupabaseUnit = mockSupabaseInstance;

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
	};
	// Store reference globally for test access
	(globalThis as any).__mockRedisCacheUnit = mockCache;
	// Override redisCache with our mock
	return {
		...actual,
		redisCache: mockCache,
	};
});

describe("UserEntitlementCache - Database Fallback", () => {
	let cache: UserEntitlementCache;

	beforeEach(() => {
		vi.clearAllMocks();
		// Get mock references from global
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQueryUnit;
		const mockSupabase = (globalThis as any).__mockSupabaseUnit;
		const mockRedisCacheUnit = (globalThis as any).__mockRedisCacheUnit;

		// Clear mock call history but keep implementations
		// Don't set default return values here - let each test set up its own mocks
		if (mockSupabaseQuery) {
			mockSupabaseQuery.mockClear();
		}
		if (mockRedisCacheUnit) {
			mockRedisCacheUnit.get.mockClear();
			mockRedisCacheUnit.set.mockClear();
			mockRedisCacheUnit.delete.mockClear();
		}
		// Pass mocked cache instance to constructor
		cache = new UserEntitlementCache(mockRedisCacheUnit);
	});

	it("should fall back to database when Redis is unavailable", async () => {
		// Mock Redis unavailable
		const { getRedisClient } = await import("@/infrastructure/config/clients");
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQueryUnit;
		const mockSupabase = (globalThis as any).__mockSupabaseUnit;
		const mockRedisCacheUnit = (globalThis as any).__mockRedisCacheUnit;

		vi.mocked(getRedisClient).mockReturnValue(null);
		mockRedisCacheUnit.get.mockResolvedValueOnce(null);

		// Mock database query returning entitlement
		const mockEntitlement = {
			entitlement_level: "PRO" as const,
			expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
		};

		// Set up mock return value before calling cache.get
		mockSupabaseQuery.mockResolvedValue({
			data: mockEntitlement,
			error: null,
		});

		const result = await cache.get("user_123");

		expect(result).toBe("PRO");
		expect(mockSupabase.from).toHaveBeenCalledWith("user_entitlements");
		expect(mockSupabaseQuery).toHaveBeenCalled();
	});

	it("should return null when database query fails", async () => {
		const { getRedisClient } = await import("@/infrastructure/config/clients");
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQueryUnit;
		const mockRedisCacheUnit = (globalThis as any).__mockRedisCacheUnit;

		vi.mocked(getRedisClient).mockReturnValue(null);
		mockRedisCacheUnit.get.mockResolvedValueOnce(null);

		mockSupabaseQuery.mockResolvedValueOnce({
			data: null,
			error: { message: "Database error" },
		});

		const result = await cache.get("user_123");

		expect(result).toBeNull();
	});

	it("should return null when database returns no entitlements", async () => {
		const { getRedisClient } = await import("@/infrastructure/config/clients");
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQueryUnit;
		const mockRedisCacheUnit = (globalThis as any).__mockRedisCacheUnit;

		vi.mocked(getRedisClient).mockReturnValue(null);
		mockRedisCacheUnit.get.mockResolvedValueOnce(null);

		mockSupabaseQuery.mockResolvedValueOnce({
			data: null,
			error: null,
		});

		const result = await cache.get("user_123");

		expect(result).toBeNull();
	});

	it("should handle database errors gracefully", async () => {
		const { getRedisClient } = await import("@/infrastructure/config/clients");
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQueryUnit;
		const mockRedisCacheUnit = (globalThis as any).__mockRedisCacheUnit;

		vi.mocked(getRedisClient).mockReturnValue(null);
		mockRedisCacheUnit.get.mockResolvedValueOnce(null);

		mockSupabaseQuery.mockRejectedValueOnce(new Error("Connection failed"));

		// Should not throw, but return null
		const result = await cache.get("user_123");
		expect(result).toBeNull();
	});
});
