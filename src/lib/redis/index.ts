import { Redis } from "@upstash/redis";
import { timeOperation } from "@/lib/monitoring/performance";

/**
 * Redis client configuration and utilities
 * Implements performance monitoring for Redis operations
 * Target: ≤50ms for Redis lookups
 */

// Initialize Redis client
const redis = new Redis({
	token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
	url: process.env.UPSTASH_REDIS_REST_URL || "",
});

/**
 * Redis cache utilities with performance monitoring
 */
export class RedisCache {
	private client: Redis;

	constructor() {
		this.client = redis;
	}

	/**
	 * Get a value from Redis with performance monitoring
	 * @param key - Cache key
	 * @returns Promise resolving to cached value or null
	 */
	async get<T = any>(key: string): Promise<T | null> {
		const { result, metrics } = await timeOperation(
			"redis.lookup",
			async () => {
				const value = await this.client.get(key);
				return value as T | null;
			},
			{
				key,
				operation: "get",
			},
		);

		// Log performance warning if lookup exceeds target
		if (metrics.duration > 50) {
			console.warn(
				`Redis GET exceeded target: ${metrics.duration.toFixed(2)}ms (target: 50ms)`,
				{
					duration: metrics.duration,
					key,
				},
			);
		}

		return result;
	}

	/**
	 * Set a value in Redis with performance monitoring
	 * @param key - Cache key
	 * @param value - Value to cache
	 * @param ttl - Time to live in seconds (optional)
	 * @returns Promise resolving to success status
	 */
	async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
		const { result } = await timeOperation(
			"redis.set",
			async () => {
				if (ttl) {
					await this.client.setex(key, ttl, value);
				} else {
					await this.client.set(key, value);
				}
				return true;
			},
			{
				hasTtl: !!ttl,
				key,
				operation: "set",
				ttl,
			},
		);

		return result;
	}

	/**
	 * Delete a key from Redis with performance monitoring
	 * @param key - Cache key
	 * @returns Promise resolving to deletion count
	 */
	async del(key: string): Promise<number> {
		const { result } = await timeOperation(
			"redis.delete",
			async () => {
				return await this.client.del(key);
			},
			{
				key,
				operation: "delete",
			},
		);

		return result;
	}

	/**
	 * Check if a key exists in Redis with performance monitoring
	 * @param key - Cache key
	 * @returns Promise resolving to existence status
	 */
	async exists(key: string): Promise<boolean> {
		const { result } = await timeOperation(
			"redis.exists",
			async () => {
				const count = await this.client.exists(key);
				return count > 0;
			},
			{
				key,
				operation: "exists",
			},
		);

		return result;
	}

	/**
	 * Get multiple keys from Redis with performance monitoring
	 * @param keys - Array of cache keys
	 * @returns Promise resolving to array of values
	 */
	async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
		const { result } = await timeOperation(
			"redis.mget",
			async () => {
				return (await this.client.mget(...keys)) as (T | null)[];
			},
			{
				keyCount: keys.length,
				keys: keys.slice(0, 5), // Log first 5 keys for debugging
				operation: "mget",
			},
		);

		return result;
	}

	/**
	 * Set multiple key-value pairs in Redis with performance monitoring
	 * @param data - Object with key-value pairs
	 * @param ttl - Time to live in seconds (optional)
	 * @returns Promise resolving to success status
	 */
	async mset<T = any>(data: Record<string, T>, ttl?: number): Promise<boolean> {
		const { result } = await timeOperation(
			"redis.mset",
			async () => {
				if (ttl) {
					// Use pipeline for TTL operations
					const pipeline = this.client.pipeline();
					for (const [key, value] of Object.entries(data)) {
						pipeline.setex(key, ttl, value);
					}
					await pipeline.exec();
				} else {
					await this.client.mset(data);
				}
				return true;
			},
			{
				hasTtl: !!ttl,
				keyCount: Object.keys(data).length,
				operation: "mset",
				ttl,
			},
		);

		return result;
	}
}

/**
 * User entitlement cache with performance monitoring
 */
export class UserEntitlementCache extends RedisCache {
	private readonly ENTITLEMENT_PREFIX = "entitlement:";
	private readonly DEFAULT_TTL = 3600; // 1 hour

	/**
	 * Get user entitlement level from cache
	 * @param userId - User ID
	 * @returns Promise resolving to entitlement level or null
	 */
	async getEntitlement(userId: string): Promise<string | null> {
		const key = `${this.ENTITLEMENT_PREFIX}${userId}`;
		return await this.get<string>(key);
	}

	/**
	 * Set user entitlement level in cache
	 * @param userId - User ID
	 * @param entitlement - Entitlement level
	 * @param ttl - Time to live in seconds (default: 1 hour)
	 * @returns Promise resolving to success status
	 */
	async setEntitlement(
		userId: string,
		entitlement: string,
		ttl: number = this.DEFAULT_TTL,
	): Promise<boolean> {
		const key = `${this.ENTITLEMENT_PREFIX}${userId}`;
		return await this.set(key, entitlement, ttl);
	}

	/**
	 * Delete user entitlement from cache
	 * @param userId - User ID
	 * @returns Promise resolving to deletion count
	 */
	async deleteEntitlement(userId: string): Promise<number> {
		const key = `${this.ENTITLEMENT_PREFIX}${userId}`;
		return await this.del(key);
	}

	/**
	 * Get multiple user entitlements from cache
	 * @param userIds - Array of user IDs
	 * @returns Promise resolving to array of entitlement levels
	 */
	async getMultipleEntitlements(userIds: string[]): Promise<(string | null)[]> {
		const keys = userIds.map((id) => `${this.ENTITLEMENT_PREFIX}${id}`);
		return await this.mget<string>(keys);
	}

	/**
	 * Set multiple user entitlements in cache
	 * @param entitlements - Object with user ID as key and entitlement as value
	 * @param ttl - Time to live in seconds (default: 1 hour)
	 * @returns Promise resolving to success status
	 */
	async setMultipleEntitlements(
		entitlements: Record<string, string>,
		ttl: number = this.DEFAULT_TTL,
	): Promise<boolean> {
		const data: Record<string, string> = {};
		for (const [userId, entitlement] of Object.entries(entitlements)) {
			data[`${this.ENTITLEMENT_PREFIX}${userId}`] = entitlement;
		}
		return await this.mset(data, ttl);
	}
}

/**
 * Content pack cache with performance monitoring
 */
export class ContentPackCache extends RedisCache {
	private readonly CONTENT_PREFIX = "content:";
	private readonly ACTIVE_PACK_KEY = "content:active";
	private readonly DEFAULT_TTL = 86400; // 24 hours

	/**
	 * Get active content pack from cache
	 * @returns Promise resolving to content pack or null
	 */
	async getActiveContentPack(): Promise<any | null> {
		return await this.get(this.ACTIVE_PACK_KEY);
	}

	/**
	 * Set active content pack in cache
	 * @param contentPack - Content pack data
	 * @param ttl - Time to live in seconds (default: 24 hours)
	 * @returns Promise resolving to success status
	 */
	async setActiveContentPack(
		contentPack: any,
		ttl: number = this.DEFAULT_TTL,
	): Promise<boolean> {
		return await this.set(this.ACTIVE_PACK_KEY, contentPack, ttl);
	}

	/**
	 * Get content pack by version from cache
	 * @param version - Content pack version
	 * @returns Promise resolving to content pack or null
	 */
	async getContentPack(version: string): Promise<any | null> {
		const key = `${this.CONTENT_PREFIX}${version}`;
		return await this.get(key);
	}

	/**
	 * Set content pack by version in cache
	 * @param version - Content pack version
	 * @param contentPack - Content pack data
	 * @param ttl - Time to live in seconds (default: 24 hours)
	 * @returns Promise resolving to success status
	 */
	async setContentPack(
		version: string,
		contentPack: any,
		ttl: number = this.DEFAULT_TTL,
	): Promise<boolean> {
		const key = `${this.CONTENT_PREFIX}${version}`;
		return await this.set(key, contentPack, ttl);
	}

	/**
	 * Delete content pack from cache
	 * @param version - Content pack version
	 * @returns Promise resolving to deletion count
	 */
	async deleteContentPack(version: string): Promise<number> {
		const key = `${this.CONTENT_PREFIX}${version}`;
		return await this.del(key);
	}
}

// Export singleton instances
export const redisCache = new RedisCache();
export const userEntitlementCache = new UserEntitlementCache();
export const contentPackCache = new ContentPackCache();

// Export the raw Redis client for advanced operations
export { redis };
