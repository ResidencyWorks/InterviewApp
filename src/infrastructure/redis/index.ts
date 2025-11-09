import { Redis } from "@upstash/redis";
import { performanceMonitor } from "@/features/scheduling/infrastructure/monitoring/performance";
import type { ContentPackData, UserEntitlementLevel } from "@/types";

function createRedisFallback() {
	const store = new Map<string, any>();
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

function createRedisClient(): Redis {
	try {
		return new Redis({
			token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
			url: process.env.UPSTASH_REDIS_REST_URL ?? "",
		});
	} catch (error) {
		console.warn("Using in-memory Redis fallback for tests:", error);
		return createRedisFallback();
	}
}

const redis = createRedisClient();

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

export class UserEntitlementCache {
	async get(userId: string): Promise<UserEntitlementLevel | null> {
		return await redisCache.get(cacheKeys.userEntitlement(userId));
	}

	async set(
		userId: string,
		entitlement: UserEntitlementLevel,
	): Promise<boolean> {
		return await redisCache.set(
			cacheKeys.userEntitlement(userId),
			entitlement,
			cacheTTL.userEntitlement,
		);
	}

	async invalidate(userId: string): Promise<boolean> {
		return await redisCache.delete(cacheKeys.userEntitlement(userId));
	}

	async setEntitlement(
		userId: string,
		entitlement: UserEntitlementLevel,
	): Promise<boolean> {
		return this.set(userId, entitlement);
	}

	async getEntitlement(userId: string): Promise<UserEntitlementLevel | null> {
		return this.get(userId);
	}

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
		return await redisCache.mset(entries, cacheTTL.userEntitlement);
	}

	async getMultipleEntitlements(
		userIds: string[],
	): Promise<Record<string, UserEntitlementLevel | null>> {
		const keys = userIds.map((userId) => cacheKeys.userEntitlement(userId));
		const values = await redisCache.mget<UserEntitlementLevel>(keys);
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
