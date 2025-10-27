/**
 * AnalysisCacheService (in-memory placeholder)
 */

export class AnalysisCacheService<T = unknown> {
	private cache = new Map<string, { value: T; expiresAt: number }>();

	set(key: string, value: T, ttlMs = 3600_000) {
		this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
	}

	get(key: string): T | null {
		const e = this.cache.get(key);
		if (!e) return null;
		if (Date.now() > e.expiresAt) {
			this.cache.delete(key);
			return null;
		}
		return e.value;
	}
}
