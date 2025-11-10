/**
 * Redis-based idempotency store for Stripe webhook events
 * Uses Stripe event.id as the idempotency key to prevent duplicate processing
 */

import { getRedisClient } from "@/infrastructure/config/clients";
import type { IIdempotencyStore } from "@/infrastructure/webhooks/IdempotencyStore";

const IDEMPOTENCY_KEY_PREFIX = "webhook:event:";
const DEFAULT_TTL_SECONDS = 86400; // 24 hours

/**
 * Async idempotency store interface for Redis-based implementations
 */
export interface IAsyncIdempotencyStore {
	tryCreate(key: string, ttlMs: number): Promise<boolean>;
	exists(key: string): Promise<boolean>;
	cleanup(now?: number): Promise<void>;
}

/**
 * Redis-based idempotency store for Stripe webhook events
 * Uses async Redis operations for persistence across serverless instances
 */
export class StripeIdempotencyStore implements IAsyncIdempotencyStore {
	private readonly redis = getRedisClient();

	/**
	 * Try to create an idempotency record for the given event ID
	 * @param key - Stripe event ID (event.id)
	 * @param ttlMs - Time to live in milliseconds
	 * @returns Promise resolving to true if record was created (event not seen before), false if already exists
	 */
	async tryCreate(key: string, ttlMs: number): Promise<boolean> {
		if (!this.redis) {
			// Fallback: if Redis is unavailable, we can't guarantee idempotency
			// In production, this should be handled differently (e.g., database fallback)
			console.warn(
				"Redis unavailable for idempotency check. Event may be processed multiple times.",
			);
			return true; // Allow processing, but log warning
		}

		const redisKey = `${IDEMPOTENCY_KEY_PREFIX}${key}`;
		const ttlSeconds = Math.floor(ttlMs / 1000);

		try {
			// Check if key already exists
			const exists = await this.redis.exists(redisKey);
			if (exists === 1) {
				return false; // Event already processed
			}

			// Set key with TTL (atomic operation)
			await this.redis.setex(redisKey, ttlSeconds, "1");
			return true; // Event not seen before, record created
		} catch (error) {
			console.error("Redis idempotency check error:", error);
			// On error, allow processing but log warning
			return true;
		}
	}

	/**
	 * Check if an event ID has already been processed
	 * @param key - Stripe event ID (event.id)
	 * @returns Promise resolving to true if event was already processed, false otherwise
	 */
	async exists(key: string): Promise<boolean> {
		if (!this.redis) {
			return false; // If Redis unavailable, assume not processed
		}

		const redisKey = `${IDEMPOTENCY_KEY_PREFIX}${key}`;

		try {
			const result = await this.redis.exists(redisKey);
			return result === 1;
		} catch (error) {
			console.error("Redis idempotency exists check error:", error);
			return false; // On error, assume not processed
		}
	}

	/**
	 * Cleanup expired idempotency records
	 * Note: Redis TTL handles expiration automatically, so this is a no-op
	 * @param _now - Current timestamp (unused, Redis handles TTL automatically)
	 */
	async cleanup(_now?: number): Promise<void> {
		// Redis TTL handles expiration automatically
		// No manual cleanup needed
	}
}

/**
 * Singleton instance of StripeIdempotencyStore
 */
export const stripeIdempotencyStore = new StripeIdempotencyStore();
