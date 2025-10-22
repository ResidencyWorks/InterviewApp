/**
 * ContentPackCache implementation for in-memory content pack caching
 *
 * @fileoverview Infrastructure service for content pack caching
 */

import type { ContentPack } from "../../domain/entities/ContentPack";

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
	value: T;
	expiresAt: number;
	createdAt: number;
	accessCount: number;
	lastAccessedAt: number;
}

/**
 * Content pack cache configuration
 */
export interface ContentPackCacheConfig {
	maxSize: number;
	defaultTtl: number; // Time to live in milliseconds
	cleanupInterval: number; // Cleanup interval in milliseconds
	enableStats: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
	size: number;
	hits: number;
	misses: number;
	evictions: number;
	hitRate: number;
	activeContentPack: string | null;
	oldestEntry: Date | null;
	newestEntry: Date | null;
}

/**
 * In-memory content pack cache implementation
 */
export class ContentPackCache {
	private cache = new Map<string, CacheEntry<ContentPack>>();
	private activeContentPackId: string | null = null;
	private config: ContentPackCacheConfig;
	private stats = {
		hits: 0,
		misses: 0,
		evictions: 0,
	};
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor(config: Partial<ContentPackCacheConfig> = {}) {
		this.config = {
			maxSize: 100,
			defaultTtl: 30 * 60 * 1000, // 30 minutes
			cleanupInterval: 5 * 60 * 1000, // 5 minutes
			enableStats: true,
			...config,
		};

		this.startCleanupTimer();
	}

	/**
	 * Get content pack from cache
	 */
	get(id: string): ContentPack | null {
		const entry = this.cache.get(id);

		if (!entry) {
			this.stats.misses++;
			return null;
		}

		// Check if expired
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(id);
			this.stats.misses++;
			return null;
		}

		// Update access statistics
		entry.accessCount++;
		entry.lastAccessedAt = Date.now();
		this.stats.hits++;

		return entry.value;
	}

	/**
	 * Set content pack in cache
	 */
	set(id: string, contentPack: ContentPack, ttl?: number): void {
		const now = Date.now();
		const expiresAt = now + (ttl || this.config.defaultTtl);

		// Check if we need to evict entries
		if (this.cache.size >= this.config.maxSize && !this.cache.has(id)) {
			this.evictLeastRecentlyUsed();
		}

		const entry: CacheEntry<ContentPack> = {
			value: contentPack,
			expiresAt,
			createdAt: now,
			accessCount: 0,
			lastAccessedAt: now,
		};

		this.cache.set(id, entry);
	}

	/**
	 * Remove content pack from cache
	 */
	delete(id: string): boolean {
		const deleted = this.cache.delete(id);

		// Clear active content pack if it was deleted
		if (deleted && this.activeContentPackId === id) {
			this.activeContentPackId = null;
		}

		return deleted;
	}

	/**
	 * Check if content pack exists in cache
	 */
	has(id: string): boolean {
		const entry = this.cache.get(id);

		if (!entry) {
			return false;
		}

		// Check if expired
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(id);
			return false;
		}

		return true;
	}

	/**
	 * Clear all entries from cache
	 */
	clear(): void {
		this.cache.clear();
		this.activeContentPackId = null;
	}

	/**
	 * Get all cached content pack IDs
	 */
	keys(): string[] {
		return Array.from(this.cache.keys());
	}

	/**
	 * Get all cached content packs
	 */
	values(): ContentPack[] {
		const now = Date.now();
		const validEntries: ContentPack[] = [];

		for (const [id, entry] of Array.from(this.cache.entries())) {
			if (now <= entry.expiresAt) {
				validEntries.push(entry.value);
			} else {
				this.cache.delete(id);
			}
		}

		return validEntries;
	}

	/**
	 * Set active content pack
	 */
	setActiveContentPack(id: string): void {
		this.activeContentPackId = id;
	}

	/**
	 * Get active content pack ID
	 */
	getActiveContentPackId(): string | null {
		return this.activeContentPackId;
	}

	/**
	 * Get active content pack
	 */
	getActiveContentPack(): ContentPack | null {
		if (!this.activeContentPackId) {
			return null;
		}

		return this.get(this.activeContentPackId);
	}

	/**
	 * Clear active content pack
	 */
	clearActiveContentPack(): void {
		this.activeContentPackId = null;
	}

	/**
	 * Get cache statistics
	 */
	getStatistics(): CacheStatistics {
		const _now = Date.now();
		let oldestEntry: Date | null = null;
		let newestEntry: Date | null = null;

		// Find oldest and newest entries
		for (const entry of Array.from(this.cache.values())) {
			const createdAt = new Date(entry.createdAt);

			if (!oldestEntry || createdAt < oldestEntry) {
				oldestEntry = createdAt;
			}

			if (!newestEntry || createdAt > newestEntry) {
				newestEntry = createdAt;
			}
		}

		const totalRequests = this.stats.hits + this.stats.misses;
		const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

		return {
			size: this.cache.size,
			hits: this.stats.hits,
			misses: this.stats.misses,
			evictions: this.stats.evictions,
			hitRate,
			activeContentPack: this.activeContentPackId,
			oldestEntry,
			newestEntry,
		};
	}

	/**
	 * Reset cache statistics
	 */
	resetStatistics(): void {
		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0,
		};
	}

	/**
	 * Evict least recently used entry
	 */
	private evictLeastRecentlyUsed(): void {
		let lruId: string | null = null;
		let lruTime = Date.now();

		for (const [id, entry] of Array.from(this.cache.entries())) {
			if (entry.lastAccessedAt < lruTime) {
				lruTime = entry.lastAccessedAt;
				lruId = id;
			}
		}

		if (lruId) {
			this.cache.delete(lruId);
			this.stats.evictions++;
		}
	}

	/**
	 * Clean up expired entries
	 */
	private cleanupExpiredEntries(): void {
		const now = Date.now();
		const expiredIds: string[] = [];

		for (const [id, entry] of Array.from(this.cache.entries())) {
			if (now > entry.expiresAt) {
				expiredIds.push(id);
			}
		}

		for (const id of expiredIds) {
			this.cache.delete(id);
		}

		if (expiredIds.length > 0 && this.config.enableStats) {
			console.log(`Cleaned up ${expiredIds.length} expired cache entries`);
		}
	}

	/**
	 * Start cleanup timer
	 */
	private startCleanupTimer(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		this.cleanupTimer = setInterval(() => {
			this.cleanupExpiredEntries();
		}, this.config.cleanupInterval);
	}

	/**
	 * Stop cleanup timer
	 */
	stopCleanupTimer(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
	}

	/**
	 * Shutdown the cache
	 */
	shutdown(): void {
		this.stopCleanupTimer();
		this.clear();
	}

	/**
	 * Get cache configuration
	 */
	getConfig(): ContentPackCacheConfig {
		return { ...this.config };
	}

	/**
	 * Update cache configuration
	 */
	updateConfig(newConfig: Partial<ContentPackCacheConfig>): void {
		this.config = { ...this.config, ...newConfig };

		// Restart cleanup timer if interval changed
		if (newConfig.cleanupInterval !== undefined) {
			this.startCleanupTimer();
		}
	}
}
