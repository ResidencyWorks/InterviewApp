import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserEntitlementCache } from "@/infrastructure/redis";

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
	(globalThis as any).__mockRedisCacheExpiration = mockCache;
	// Override redisCache with our mock
	return {
		...actual,
		redisCache: mockCache,
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
	(globalThis as any).__mockSupabaseQueryExpiration = mockQuery;
	(globalThis as any).__mockSupabaseExpiration = mockSupabaseInstance;

	return {
		...actual,
		getServerDatabaseService: vi.fn(async () => ({
			getClient: () => mockSupabaseInstance,
			supabase: mockSupabaseInstance,
		})),
	};
});

describe("Entitlement Cache Expiration", () => {
	let cache: UserEntitlementCache;

	beforeEach(() => {
		vi.clearAllMocks();
		// Get mock references from global
		const mockRedisCacheExpiration = (globalThis as any)
			.__mockRedisCacheExpiration;
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQueryExpiration;
		const mockSupabase = (globalThis as any).__mockSupabaseExpiration;

		// Clear mock call history but keep implementations
		if (mockRedisCacheExpiration) {
			mockRedisCacheExpiration.get.mockClear();
			mockRedisCacheExpiration.set.mockClear();
			mockRedisCacheExpiration.delete.mockClear();
		}
		if (mockSupabaseQuery) {
			mockSupabaseQuery.mockClear();
		}
		if (mockSupabase) {
			mockSupabase.from.mockClear();
		}
		// Pass mocked cache instance to constructor
		cache = new UserEntitlementCache(mockRedisCacheExpiration);
	});

	it("should invalidate cache when entitlement is expired", async () => {
		const userId = "user_expired";
		const expiredData = {
			entitlementLevel: "PRO" as const,
			expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago (expired)
		};

		const mockRedisCacheExpiration = (globalThis as any)
			.__mockRedisCacheExpiration;
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQueryExpiration;
		const mockSupabase = (globalThis as any).__mockSupabaseExpiration;

		// Cache returns expired data
		mockRedisCacheExpiration.get.mockResolvedValueOnce(expiredData);
		mockRedisCacheExpiration.delete.mockResolvedValueOnce(true);

		// Database query for fresh data
		const freshEntitlement = {
			entitlement_level: "FREE" as const,
			expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
		};

		mockSupabaseQuery.mockResolvedValueOnce({
			data: freshEntitlement,
			error: null,
		});

		mockRedisCacheExpiration.set.mockResolvedValueOnce(true);

		const result = await cache.get(userId);

		// Should invalidate expired cache
		expect(mockRedisCacheExpiration.delete).toHaveBeenCalledWith(
			`user:${userId}:entitlement`,
		);
		// Should query database for fresh data
		expect(mockSupabase.from).toHaveBeenCalledWith("user_entitlements");
		// Should return fresh data
		expect(result).toBe("FREE");
	});

	it("should return null when expired entitlement has no replacement in database", async () => {
		const mockRedisCacheExpiration = (globalThis as any)
			.__mockRedisCacheExpiration;
		const mockSupabaseQuery = (globalThis as any).__mockSupabaseQueryExpiration;
		const mockSupabase = (globalThis as any).__mockSupabaseExpiration;

		const userId = "user_expired_no_replacement";
		const expiredData = {
			entitlementLevel: "PRO" as const,
			expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
		};

		mockRedisCacheExpiration.get.mockResolvedValueOnce(expiredData);
		mockRedisCacheExpiration.delete.mockResolvedValueOnce(true);

		// Database has no active entitlements
		mockSupabaseQuery.mockResolvedValueOnce({
			data: null,
			error: null,
		});

		const result = await cache.get(userId);

		expect(mockRedisCacheExpiration.delete).toHaveBeenCalled();
		expect(mockSupabase.from).toHaveBeenCalledWith("user_entitlements");
		expect(result).toBeNull();
	});

	it("should check expiration timestamp before returning cached value", async () => {
		const mockRedisCacheExpiration = (globalThis as any)
			.__mockRedisCacheExpiration;
		const mockSupabase = (globalThis as any).__mockSupabaseExpiration;

		const userId = "user_valid_cache";
		const validData = {
			entitlementLevel: "TRIAL" as const,
			expiresAt: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now (valid)
		};

		mockRedisCacheExpiration.get.mockResolvedValueOnce(validData);

		const result = await cache.get(userId);

		// Should return cached value without checking database
		expect(result).toBe("TRIAL");
		expect(mockRedisCacheExpiration.delete).not.toHaveBeenCalled();
		expect(mockSupabase.from).not.toHaveBeenCalled();
	});

	it("should handle expiration check for entitlements expiring soon", async () => {
		const mockRedisCacheExpiration = (globalThis as any)
			.__mockRedisCacheExpiration;
		const mockSupabase = (globalThis as any).__mockSupabaseExpiration;

		const userId = "user_expiring_soon";
		// Entitlement expires in 1 minute (still valid but close)
		const expiringSoonData = {
			entitlementLevel: "PRO" as const,
			expiresAt: new Date(Date.now() + 60000).toISOString(), // 1 minute from now (valid)
		};

		// Mock cache to return valid data
		mockRedisCacheExpiration.get.mockResolvedValueOnce(expiringSoonData);

		const result = await cache.get(userId);

		// Should still return valid entitlement (not expired yet)
		expect(result).toBe("PRO");
		expect(mockRedisCacheExpiration.delete).not.toHaveBeenCalled();
		expect(mockSupabase.from).not.toHaveBeenCalled();
	});
});
