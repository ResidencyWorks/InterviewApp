import type { Redis } from "@upstash/redis";
import { performanceMonitor } from "@/features/scheduling/infrastructure/monitoring/performance";
import type { ContentPackData, UserEntitlementLevel } from "@/types";
import { getRedisClient } from "../config/clients";
import { hasRedis } from "../config/environment";
import { getServerDatabaseService } from "../db/database-service";

function createRedisFallback() {
	const store = new Map<string, unknown>();
	return {
		async get<T>(key: string): Promise<T | null> {
			return (store.has(key) ? store.get(key) : null) as T | null;
		},
		async set(key: string, value: unknown): Promise<void> {
			store.set(key, value);
		},
		async setex(key: string, _ttl: number, value: unknown): Promise<void> {
			store.set(key, value);
		},
		async del(...keys: string[]): Promise<number> {
			let removed = 0;
			for (const key of keys) {
				if (store.delete(key)) removed += 1;
			}
			return removed;
		},
		async mget<T>(keys: string[]): Promise<(T | null)[]> {
			return keys.map((key) => (store.has(key) ? (store.get(key) as T) : null));
		},
		async mset(entries: Record<string, unknown>): Promise<void> {
			for (const [key, value] of Object.entries(entries)) {
				store.set(key, value);
			}
		},
		async incrby(key: string, increment: number): Promise<number> {
			const current = Number(store.get(key) ?? 0);
			const next = current + increment;
			store.set(key, next);
			return next;
		},
		async expire(_key: string, _ttl: number): Promise<number> {
			// Fallback store does not track TTL; pretend success
			return 1;
		},
		async ttl(_key: string): Promise<number> {
			return -1;
		},
		async ping(): Promise<string> {
			return "PONG";
		},
	} as unknown as Redis;
}

const redis = getRedisClient() ?? createRedisFallback();

if (!hasRedis) {
	console.warn(
		"UPSTASH_REDIS_REST_URL/TOKEN not configured. Using in-memory Redis fallback.",
	);
}

export const cacheKeys = {
	activeContentPack: () => "content:active",
	contentPack: (packId: string) => `content:${packId}`,
	evaluationResult: (resultId: string) => `evaluation:${resultId}`,
	userEntitlement: (userId: string) => `user:${userId}:entitlement`,
	userEvaluations: (userId: string, page = 1) =>
		`user:${userId}:evaluations:${page}`,
	userProfile: (userId: string) => `user:${userId}:profile`,
} as const;

export const cacheTTL = {
	activeContentPack: 3600,
	contentPack: 7200,
	evaluationResult: 86400,
	userEntitlement: 3600,
	userEvaluations: 1800,
	userProfile: 1800,
} as const;

export class RedisCacheService {
	async get<T>(key: string): Promise<T | null> {
		const operationId = performanceMonitor.start("redis.lookup", { key });
		try {
			const result = await redis.get<T>(key);
			performanceMonitor.end(operationId, true);
			return result;
		} catch (error) {
			console.error("Redis GET error:", error);
			performanceMonitor.end(operationId, false, {
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
		try {
			if (ttlSeconds) {
				await redis.setex(key, ttlSeconds, value);
			} else {
				await redis.set(key, value);
			}
			return true;
		} catch (error) {
			console.error("Redis SET error:", error);
			return false;
		}
	}

	async delete(key: string): Promise<boolean> {
		try {
			await redis.del(key);
			return true;
		} catch (error) {
			console.error("Redis DELETE error:", error);
			return false;
		}
	}

	async deleteMany(keys: string[]): Promise<boolean> {
		try {
			if (keys.length === 0) return true;
			await redis.del(...keys);
			return true;
		} catch (error) {
			console.error("Redis DELETE MANY error:", error);
			return false;
		}
	}

	async exists(key: string): Promise<boolean> {
		try {
			return (await redis.exists(key)) === 1;
		} catch (error) {
			console.error("Redis EXISTS error:", error);
			return false;
		}
	}

	async mget<T>(keys: string[]): Promise<(T | null)[]> {
		try {
			if (keys.length === 0) return [];
			return await redis.mget<T[]>(keys);
		} catch (error) {
			console.error("Redis MGET error:", error);
			return keys.map(() => null);
		}
	}

	async mset(
		keyValuePairs: Record<string, unknown>,
		ttlSeconds?: number,
	): Promise<boolean> {
		try {
			const entries = Object.entries(keyValuePairs);
			if (entries.length === 0) return true;

			if (ttlSeconds) {
				await Promise.all(
					entries.map(([key, value]) => redis.setex(key, ttlSeconds, value)),
				);
			} else {
				await redis.mset(entries as unknown as Record<string, string>);
			}
			return true;
		} catch (error) {
			console.error("Redis MSET error:", error);
			return false;
		}
	}

	async incr(key: string, increment = 1): Promise<number | null> {
		try {
			return await redis.incrby(key, increment);
		} catch (error) {
			console.error("Redis INCR error:", error);
			return null;
		}
	}

	async expire(key: string, ttlSeconds: number): Promise<boolean> {
		try {
			return (await redis.expire(key, ttlSeconds)) === 1;
		} catch (error) {
			console.error("Redis EXPIRE error:", error);
			return false;
		}
	}

	async ttl(key: string): Promise<number> {
		try {
			return await redis.ttl(key);
		} catch (error) {
			console.error("Redis TTL error:", error);
			return -1;
		}
	}
}

export const redisCache = new RedisCacheService();

/**
 * Cached entitlement data structure
 */
interface CachedEntitlement {
	entitlementLevel: UserEntitlementLevel;
	expiresAt: string; // ISO 8601 timestamp
}

/**
 * User entitlement cache with expiration checking and database fallback
 * Provides fast entitlement lookups with automatic cache invalidation and fallback
 */
export class UserEntitlementCache {
	private readonly cacheHitCount = new Map<string, number>();
	private readonly cacheMissCount = new Map<string, number>();
	private readonly cache: typeof redisCache;

	constructor(cacheInstance?: typeof redisCache) {
		// Allow injection of cache instance for testing, default to module-level redisCache
		this.cache = cacheInstance ?? redisCache;
	}

	/**
	 * Get user entitlement with expiration checking and database fallback
	 * @param userId - User identifier
	 * @returns Promise resolving to entitlement level or null if not found
	 */
	async get(userId: string): Promise<UserEntitlementLevel | null> {
		const cacheKey = cacheKeys.userEntitlement(userId);
		const startTime = Date.now();

		try {
			// Try to get from cache
			const cached = await this.cache.get<CachedEntitlement>(cacheKey);

			if (cached) {
				// Check if entitlement is expired
				const expiresAt = new Date(cached.expiresAt);
				const now = new Date();

				if (expiresAt <= now) {
					// Entitlement expired - invalidate cache and fall back to database
					this.logCacheMiss(userId, "expired");
					await this.cache.delete(cacheKey);
					return await this.getFromDatabase(userId);
				}

				// Cache hit - return cached value
				this.logCacheHit(userId, Date.now() - startTime);
				return cached.entitlementLevel;
			}

			// Cache miss - fall back to database
			this.logCacheMiss(userId, "miss");
			return await this.getFromDatabase(userId);
		} catch (error) {
			// Redis unavailable - fall back to database
			console.error(`Redis cache error for user ${userId}:`, error);
			this.logCacheMiss(userId, "error");
			return await this.getFromDatabase(userId);
		}
	}

	/**
	 * Get entitlement from database and refresh cache
	 * @param userId - User identifier
	 * @returns Promise resolving to entitlement level or null
	 */
	private async getFromDatabase(
		userId: string,
	): Promise<UserEntitlementLevel | null> {
		try {
			// Get server database service with Supabase client
			const dbService = await getServerDatabaseService();
			const supabase = dbService.getClient();

			if (!supabase) {
				console.error("Supabase client not available for database fallback");
				return null;
			}

			// Query database for most recent non-expired entitlement
			const { data, error } = await supabase
				.from("user_entitlements")
				.select("entitlement_level, expires_at")
				.eq("user_id", userId)
				.gte("expires_at", new Date().toISOString())
				.order("created_at", { ascending: false })
				.limit(1)
				.maybeSingle();

			if (error || !data) {
				return null;
			}

			const cachedData: CachedEntitlement = {
				entitlementLevel: data.entitlement_level,
				expiresAt: data.expires_at,
			};

			// Refresh cache (async, don't wait for it)
			this.cache
				.set(
					cacheKeys.userEntitlement(userId),
					cachedData,
					cacheTTL.userEntitlement,
				)
				.catch((error) => {
					console.error(`Failed to refresh cache for user ${userId}:`, error);
				});

			return data.entitlement_level;
		} catch (error) {
			console.error(`Database query error for user ${userId}:`, error);
			return null;
		}
	}

	/**
	 * Set entitlement in cache with expiration timestamp
	 * @param userId - User identifier
	 * @param entitlement - Entitlement level
	 * @param expiresAt - Optional expiration timestamp (defaults to 1 year from now)
	 * @returns Promise resolving to success status
	 */
	async set(
		userId: string,
		entitlement: UserEntitlementLevel,
		expiresAt?: string,
	): Promise<boolean> {
		const cachedData: CachedEntitlement = {
			entitlementLevel: entitlement,
			expiresAt:
				expiresAt ||
				new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Default 1 year
		};

		return await this.cache.set(
			cacheKeys.userEntitlement(userId),
			cachedData,
			cacheTTL.userEntitlement,
		);
	}

	/**
	 * Log cache hit for performance monitoring
	 * @param userId - User identifier
	 * @param duration - Request duration in milliseconds
	 */
	private logCacheHit(userId: string, duration: number): void {
		const count = (this.cacheHitCount.get(userId) || 0) + 1;
		this.cacheHitCount.set(userId, count);

		if (duration > 100) {
			console.warn(
				`Slow cache hit for user ${userId}: ${duration}ms (expected <100ms)`,
			);
		}
	}

	/**
	 * Log cache miss for performance monitoring
	 * @param userId - User identifier
	 * @param reason - Reason for cache miss (miss, expired, error)
	 */
	private logCacheMiss(userId: string, reason: string): void {
		const count = (this.cacheMissCount.get(userId) || 0) + 1;
		this.cacheMissCount.set(userId, count);

		console.log(`Cache miss for user ${userId}: ${reason}`);
	}

	/**
	 * Invalidate cached entitlement for a user
	 * @param userId - User identifier
	 * @returns Promise resolving to success status
	 */
	async invalidate(userId: string): Promise<boolean> {
		return await this.cache.delete(cacheKeys.userEntitlement(userId));
	}

	/**
	 * Set entitlement in cache (alias for set)
	 * @param userId - User identifier
	 * @param entitlement - Entitlement level
	 * @returns Promise resolving to success status
	 */
	async setEntitlement(
		userId: string,
		entitlement: UserEntitlementLevel,
	): Promise<boolean> {
		return this.set(userId, entitlement);
	}

	/**
	 * Get entitlement from cache (alias for get)
	 * @param userId - User identifier
	 * @returns Promise resolving to entitlement level or null
	 */
	async getEntitlement(userId: string): Promise<UserEntitlementLevel | null> {
		return this.get(userId);
	}

	/**
	 * Delete entitlement from cache (alias for invalidate)
	 * @param userId - User identifier
	 * @returns Promise resolving to success status
	 */
	async deleteEntitlement(userId: string): Promise<boolean> {
		return this.invalidate(userId);
	}

	async setMultipleEntitlements(
		entitlements: Record<string, UserEntitlementLevel>,
	): Promise<boolean> {
		const entries = Object.entries(entitlements).reduce(
			(acc, [userId, level]) => {
				acc[cacheKeys.userEntitlement(userId)] = level;
				return acc;
			},
			{} as Record<string, UserEntitlementLevel>,
		);
		return await this.cache.mset(entries, cacheTTL.userEntitlement);
	}

	async getMultipleEntitlements(
		userIds: string[],
	): Promise<Record<string, UserEntitlementLevel | null>> {
		const keys = userIds.map((userId) => cacheKeys.userEntitlement(userId));
		const values = await this.cache.mget<UserEntitlementLevel>(keys);
		return userIds.reduce<Record<string, UserEntitlementLevel | null>>(
			(result, userId, index) => {
				result[userId] = values[index] ?? null;
				return result;
			},
			{},
		);
	}
}

export class ContentPackCache {
	private readonly INDEX_KEY = "content:index";

	async get(packId: string): Promise<ContentPackData | null> {
		return await redisCache.get(cacheKeys.contentPack(packId));
	}

	async set(packId: string, contentPack: ContentPackData): Promise<boolean> {
		const ok = await redisCache.set(
			cacheKeys.contentPack(packId),
			contentPack,
			cacheTTL.contentPack,
		);
		if (ok) await this.addToIndex(packId);
		return ok;
	}

	async getActive(): Promise<ContentPackData | null> {
		return await redisCache.get(cacheKeys.activeContentPack());
	}

	async setActive(contentPack: ContentPackData): Promise<boolean> {
		return await redisCache.set(
			cacheKeys.activeContentPack(),
			contentPack,
			cacheTTL.activeContentPack,
		);
	}

	async invalidate(packId?: string): Promise<boolean> {
		if (packId) {
			return await redisCache.delete(cacheKeys.contentPack(packId));
		}
		return await redisCache.deleteMany([cacheKeys.activeContentPack()]);
	}

	async deleteContentPack(packId: string): Promise<boolean> {
		return this.invalidate(packId);
	}

	async deleteActiveContentPack(): Promise<boolean> {
		return this.invalidate();
	}

	async setContentPack(
		packId: string,
		contentPack: ContentPackData,
	): Promise<boolean> {
		return this.set(packId, contentPack);
	}

	private async addToIndex(packId: string): Promise<void> {
		try {
			const existing = (await redisCache.get<string[]>(this.INDEX_KEY)) || [];
			if (!existing.includes(packId)) {
				await redisCache.set(this.INDEX_KEY, [packId, ...existing]);
			}
		} catch (error) {
			console.error("Failed to update content index:", error);
		}
	}

	async getIndexedIds(): Promise<string[]> {
		return (await redisCache.get<string[]>(this.INDEX_KEY)) || [];
	}

	async listIndexedPacks(): Promise<ContentPackData[]> {
		const ids = await this.getIndexedIds();
		const packs = await Promise.all(ids.map((id) => this.get(id)));
		return packs.filter((pack): pack is ContentPackData => pack !== null);
	}
}

export const userEntitlementCache = new UserEntitlementCache();
export const contentPackCache = new ContentPackCache();

export async function checkRedisHealth(): Promise<boolean> {
	try {
		await redis.ping();
		return true;
	} catch (error) {
		console.error("Redis health check failed:", error);
		return false;
	}
}
