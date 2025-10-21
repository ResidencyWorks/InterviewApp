import { Redis } from "@upstash/redis";
import type { ContentPackData, UserEntitlementLevel } from "@/types";

/**
 * Redis client configuration and utilities
 * Handles caching for user entitlements and other data
 */

// Initialize Redis client
const redis = new Redis({
	token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
	url: process.env.UPSTASH_REDIS_REST_URL ?? "",
});

/**
 * Cache key generators
 */
export const cacheKeys = {
	activeContentPack: () => "content:active",
	contentPack: (packId: string) => `content:${packId}`,
	evaluationResult: (resultId: string) => `evaluation:${resultId}`,
	userEntitlement: (userId: string) => `user:${userId}:entitlement`,
	userEvaluations: (userId: string, page = 1) =>
		`user:${userId}:evaluations:${page}`,
	userProfile: (userId: string) => `user:${userId}:profile`,
} as const;

/**
 * Cache TTL (Time To Live) constants in seconds
 */
export const cacheTTL = {
	activeContentPack: 3600, // 1 hour
	contentPack: 7200, // 2 hours
	evaluationResult: 86400, // 24 hours
	userEntitlement: 3600, // 1 hour
	userEvaluations: 1800, // 30 minutes
	userProfile: 1800, // 30 minutes
} as const;

/**
 * Redis cache service
 * Provides comprehensive caching functionality with TTL support and bulk operations
 */
export class RedisCacheService {
	/**
	 * Get a value from cache
	 * @param key - Cache key to retrieve
	 * @returns Promise resolving to cached value or null if not found
	 */
	async get<T>(key: string): Promise<T | null> {
		try {
			const value = await redis.get<T>(key);
			return value;
		} catch (error) {
			console.error("Redis GET error:", error);
			return null;
		}
	}

	/**
	 * Set a value in cache with TTL
	 * @param key - Cache key to set
	 * @param value - Value to cache
	 * @param ttlSeconds - Optional time-to-live in seconds
	 * @returns Promise resolving to true if successful
	 */
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

	/**
	 * Delete a key from cache
	 * @param key - Cache key to delete
	 * @returns Promise resolving to true if successful
	 */
	async delete(key: string): Promise<boolean> {
		try {
			await redis.del(key);
			return true;
		} catch (error) {
			console.error("Redis DELETE error:", error);
			return false;
		}
	}

	/**
	 * Delete multiple keys from cache
	 * @param keys - Array of cache keys to delete
	 * @returns Promise resolving to true if successful
	 */
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

	/**
	 * Check if a key exists in cache
	 * @param key - Cache key to check
	 * @returns Promise resolving to true if key exists
	 */
	async exists(key: string): Promise<boolean> {
		try {
			const result = await redis.exists(key);
			return result === 1;
		} catch (error) {
			console.error("Redis EXISTS error:", error);
			return false;
		}
	}

	/**
	 * Get multiple values from cache
	 * @param keys - Array of cache keys to retrieve
	 * @returns Promise resolving to array of cached values
	 */
	async mget<T>(keys: string[]): Promise<(T | null)[]> {
		try {
			if (keys.length === 0) return [];
			const values = await redis.mget<T[]>(keys);
			return values;
		} catch (error) {
			console.error("Redis MGET error:", error);
			return keys.map(() => null);
		}
	}

	/**
	 * Set multiple values in cache
	 * @param keyValuePairs - Object with key-value pairs to cache
	 * @param ttlSeconds - Optional time-to-live in seconds
	 * @returns Promise resolving to true if successful
	 */
	async mset(
		keyValuePairs: Record<string, unknown>,
		ttlSeconds?: number,
	): Promise<boolean> {
		try {
			const entries = Object.entries(keyValuePairs);
			if (entries.length === 0) return true;

			if (ttlSeconds) {
				// Set each key with TTL
				const promises = entries.map(([key, value]) =>
					redis.setex(key, ttlSeconds, value),
				);
				await Promise.all(promises);
			} else {
				await redis.mset(entries as unknown as Record<string, string>);
			}
			return true;
		} catch (error) {
			console.error("Redis MSET error:", error);
			return false;
		}
	}

	/**
	 * Increment a counter
	 * @param key - Cache key for the counter
	 * @param increment - Amount to increment by (default: 1)
	 * @returns Promise resolving to new counter value or null if failed
	 */
	async incr(key: string, increment = 1): Promise<number | null> {
		try {
			const result = await redis.incrby(key, increment);
			return result;
		} catch (error) {
			console.error("Redis INCR error:", error);
			return null;
		}
	}

	/**
	 * Set expiration for a key
	 * @param key - Cache key to set expiration for
	 * @param ttlSeconds - Time-to-live in seconds
	 * @returns Promise resolving to true if successful
	 */
	async expire(key: string, ttlSeconds: number): Promise<boolean> {
		try {
			const result = await redis.expire(key, ttlSeconds);
			return result === 1;
		} catch (error) {
			console.error("Redis EXPIRE error:", error);
			return false;
		}
	}

	/**
	 * Get TTL for a key
	 * @param key - Cache key to check TTL for
	 * @returns Promise resolving to TTL in seconds (-1 if no expiration, -2 if key doesn't exist)
	 */
	async ttl(key: string): Promise<number> {
		try {
			const result = await redis.ttl(key);
			return result;
		} catch (error) {
			console.error("Redis TTL error:", error);
			return -1;
		}
	}
}

// Export singleton instance
export const redisCache = new RedisCacheService();

/**
 * User entitlement cache utilities
 * Specialized cache service for managing user entitlement data with automatic TTL
 */
export class UserEntitlementCache {
	/**
	 * Get user entitlement from cache
	 * @param userId - User ID to get entitlement for
	 * @returns Promise resolving to user entitlement level or null if not found
	 */
	async get(userId: string): Promise<UserEntitlementLevel | null> {
		const key = cacheKeys.userEntitlement(userId);
		return await redisCache.get<UserEntitlementLevel>(key);
	}

	/**
	 * Set user entitlement in cache
	 * @param userId - User ID to set entitlement for
	 * @param entitlement - Entitlement level to cache
	 * @returns Promise resolving to true if successful
	 */
	async set(
		userId: string,
		entitlement: UserEntitlementLevel,
	): Promise<boolean> {
		const key = cacheKeys.userEntitlement(userId);
		return await redisCache.set(key, entitlement, cacheTTL.userEntitlement);
	}

	/**
	 * Invalidate user entitlement cache
	 * @param userId - User ID to invalidate cache for
	 * @returns Promise resolving to true if successful
	 */
	async invalidate(userId: string): Promise<boolean> {
		const key = cacheKeys.userEntitlement(userId);
		return await redisCache.delete(key);
	}
}

/**
 * Content pack cache utilities
 * Specialized cache service for managing content pack data with versioning support
 */
export class ContentPackCache {
	private readonly INDEX_KEY = "content:index";
	/**
	 * Get content pack from cache
	 * @param packId - Content pack ID to retrieve
	 * @returns Promise resolving to content pack data or null if not found
	 */
	async get(packId: string): Promise<ContentPackData | null> {
		const key = cacheKeys.contentPack(packId);
		return await redisCache.get(key);
	}

	/**
	 * Set content pack in cache
	 * @param packId - Content pack ID to cache
	 * @param contentPack - Content pack data to cache
	 * @returns Promise resolving to true if successful
	 */
	async set(packId: string, contentPack: ContentPackData): Promise<boolean> {
		const key = cacheKeys.contentPack(packId);
		const ok = await redisCache.set(key, contentPack, cacheTTL.contentPack);
		if (ok) {
			await this.addToIndex(packId);
		}
		return ok;
	}

	/**
	 * Get active content pack from cache
	 * @returns Promise resolving to active content pack data or null if not found
	 */
	async getActive(): Promise<ContentPackData | null> {
		const key = cacheKeys.activeContentPack();
		return await redisCache.get(key);
	}

	/**
	 * Set active content pack in cache
	 * @param contentPack - Content pack data to set as active
	 * @returns Promise resolving to true if successful
	 */
	async setActive(contentPack: ContentPackData): Promise<boolean> {
		const key = cacheKeys.activeContentPack();
		return await redisCache.set(key, contentPack, cacheTTL.activeContentPack);
	}

	/**
	 * Invalidate content pack cache
	 * @param packId - Optional specific content pack ID to invalidate
	 * @returns Promise resolving to true if successful
	 */
	async invalidate(packId?: string): Promise<boolean> {
		if (packId) {
			const key = cacheKeys.contentPack(packId);
			return await redisCache.delete(key);
		}
		// Invalidate all content pack related keys
		const keys = [cacheKeys.activeContentPack()];
		return await redisCache.deleteMany(keys);
	}

	/**
	 * Add a content pack ID to the index for listing/versioning
	 * @param packId - Content pack ID to add
	 */
	private async addToIndex(packId: string): Promise<void> {
		try {
			const existing = (await redisCache.get<string[]>(this.INDEX_KEY)) || [];
			if (!existing.includes(packId)) {
				const updated = [packId, ...existing];
				await redisCache.set(this.INDEX_KEY, updated);
			}
		} catch (error) {
			console.error("Failed to update content index:", error);
		}
	}

	/**
	 * Get all content pack IDs from the index (most-recent first)
	 */
	async getIndexedIds(): Promise<string[]> {
		const existing = (await redisCache.get<string[]>(this.INDEX_KEY)) || [];
		return existing;
	}

	/**
	 * List all content packs using the index
	 */
	async listIndexedPacks(): Promise<ContentPackData[]> {
		const ids = await this.getIndexedIds();
		if (ids.length === 0) return [];
		const packs = await Promise.all(ids.map((id) => this.get(id)));
		return packs.filter((pack): pack is ContentPackData => pack !== null);
	}
}

// Export cache service instances
export const userEntitlementCache = new UserEntitlementCache();
export const contentPackCache = new ContentPackCache();

/**
 * Cache health check
 * @returns Promise that resolves to true if Redis is accessible
 */
export async function checkRedisHealth(): Promise<boolean> {
	try {
		await redis.ping();
		return true;
	} catch (error) {
		console.error("Redis health check failed:", error);
		return false;
	}
}
