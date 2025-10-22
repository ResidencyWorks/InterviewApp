export interface IIdempotencyRecord {
	key: string;
	expiresAt: number; // epoch ms
}

export interface IIdempotencyStore {
	tryCreate(key: string, ttlMs: number): boolean;
	exists(key: string): boolean;
	cleanup(now?: number): void;
}

class InMemoryIdempotencyStore implements IIdempotencyStore {
	private readonly records = new Map<string, IIdempotencyRecord>();

	tryCreate(key: string, ttlMs: number): boolean {
		const now = Date.now();
		this.cleanup(now);
		const current = this.records.get(key);
		if (current && current.expiresAt > now) return false;
		this.records.set(key, { key, expiresAt: now + ttlMs });
		return true;
	}

	exists(key: string): boolean {
		const rec = this.records.get(key);
		if (!rec) return false;
		if (rec.expiresAt <= Date.now()) return false;
		return true;
	}

	cleanup(now: number = Date.now()): void {
		this.records.forEach((value, key) => {
			if (value.expiresAt <= now) this.records.delete(key);
		});
	}
}

export const idempotencyStore: IIdempotencyStore =
	new InMemoryIdempotencyStore();
