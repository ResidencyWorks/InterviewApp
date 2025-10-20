import type { UserEntitlementLevel } from '@/types'
import { Redis } from '@upstash/redis'

/**
 * Redis client configuration and utilities
 * Handles caching for user entitlements and other data
 */

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

/**
 * Cache key generators
 */
export const cacheKeys = {
  userEntitlement: (userId: string) => `user:${userId}:entitlement`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  contentPack: (packId: string) => `content:${packId}`,
  activeContentPack: () => 'content:active',
  evaluationResult: (resultId: string) => `evaluation:${resultId}`,
  userEvaluations: (userId: string, page = 1) =>
    `user:${userId}:evaluations:${page}`,
} as const

/**
 * Cache TTL (Time To Live) constants in seconds
 */
export const cacheTTL = {
  userEntitlement: 3600, // 1 hour
  userProfile: 1800, // 30 minutes
  contentPack: 7200, // 2 hours
  activeContentPack: 3600, // 1 hour
  evaluationResult: 86400, // 24 hours
  userEvaluations: 1800, // 30 minutes
} as const

/**
 * Redis cache service
 */
export class RedisCacheService {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get<T>(key)
      return value
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, value)
      } else {
        await redis.set(key, value)
      }
      return true
    } catch (error) {
      console.error('Redis SET error:', error)
      return false
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.error('Redis DELETE error:', error)
      return false
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async deleteMany(keys: string[]): Promise<boolean> {
    try {
      if (keys.length === 0) return true
      await redis.del(...keys)
      return true
    } catch (error) {
      console.error('Redis DELETE MANY error:', error)
      return false
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis EXISTS error:', error)
      return false
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (keys.length === 0) return []
      const values = await redis.mget<T[]>(keys)
      return values
    } catch (error) {
      console.error('Redis MGET error:', error)
      return keys.map(() => null)
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(
    keyValuePairs: Record<string, any>,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const entries = Object.entries(keyValuePairs)
      if (entries.length === 0) return true

      if (ttlSeconds) {
        // Set each key with TTL
        const promises = entries.map(([key, value]) =>
          redis.setex(key, ttlSeconds, value)
        )
        await Promise.all(promises)
      } else {
        await redis.mset(entries as unknown as Record<string, string>)
      }
      return true
    } catch (error) {
      console.error('Redis MSET error:', error)
      return false
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string, increment = 1): Promise<number | null> {
    try {
      const result = await redis.incrby(key, increment)
      return result
    } catch (error) {
      console.error('Redis INCR error:', error)
      return null
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttlSeconds)
      return result === 1
    } catch (error) {
      console.error('Redis EXPIRE error:', error)
      return false
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      const result = await redis.ttl(key)
      return result
    } catch (error) {
      console.error('Redis TTL error:', error)
      return -1
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCacheService()

/**
 * User entitlement cache utilities
 */
export class UserEntitlementCache {
  /**
   * Get user entitlement from cache
   */
  async get(userId: string): Promise<UserEntitlementLevel | null> {
    const key = cacheKeys.userEntitlement(userId)
    return await redisCache.get<UserEntitlementLevel>(key)
  }

  /**
   * Set user entitlement in cache
   */
  async set(
    userId: string,
    entitlement: UserEntitlementLevel
  ): Promise<boolean> {
    const key = cacheKeys.userEntitlement(userId)
    return await redisCache.set(key, entitlement, cacheTTL.userEntitlement)
  }

  /**
   * Invalidate user entitlement cache
   */
  async invalidate(userId: string): Promise<boolean> {
    const key = cacheKeys.userEntitlement(userId)
    return await redisCache.delete(key)
  }
}

/**
 * Content pack cache utilities
 */
export class ContentPackCache {
  /**
   * Get content pack from cache
   */
  async get(packId: string): Promise<any | null> {
    const key = cacheKeys.contentPack(packId)
    return await redisCache.get(key)
  }

  /**
   * Set content pack in cache
   */
  async set(packId: string, contentPack: any): Promise<boolean> {
    const key = cacheKeys.contentPack(packId)
    return await redisCache.set(key, contentPack, cacheTTL.contentPack)
  }

  /**
   * Get active content pack from cache
   */
  async getActive(): Promise<any | null> {
    const key = cacheKeys.activeContentPack()
    return await redisCache.get(key)
  }

  /**
   * Set active content pack in cache
   */
  async setActive(contentPack: any): Promise<boolean> {
    const key = cacheKeys.activeContentPack()
    return await redisCache.set(key, contentPack, cacheTTL.activeContentPack)
  }

  /**
   * Invalidate content pack cache
   */
  async invalidate(packId?: string): Promise<boolean> {
    if (packId) {
      const key = cacheKeys.contentPack(packId)
      return await redisCache.delete(key)
    }
    // Invalidate all content pack related keys
    const keys = [cacheKeys.activeContentPack()]
    return await redisCache.deleteMany(keys)
  }
}

// Export cache service instances
export const userEntitlementCache = new UserEntitlementCache()
export const contentPackCache = new ContentPackCache()

/**
 * Cache health check
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error('Redis health check failed:', error)
    return false
  }
}
