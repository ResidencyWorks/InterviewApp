const WINDOW_MS_DEFAULT = 60_000; // 1 minute
const MAX_REQUESTS_DEFAULT = 10; // per window

export class TranscriptRateLimit {
	private readonly windowMs: number;
	private readonly maxRequests: number;
	private readonly store = new Map<
		string,
		{ count: number; resetAt: number }
	>();

	constructor(
		windowMs = WINDOW_MS_DEFAULT,
		maxRequests = MAX_REQUESTS_DEFAULT,
	) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
	}

	allow(userId: string): boolean {
		const now = Date.now();
		const bucket = this.store.get(userId) ?? {
			count: 0,
			resetAt: now + this.windowMs,
		};
		if (now > bucket.resetAt) {
			bucket.count = 0;
			bucket.resetAt = now + this.windowMs;
		}
		bucket.count += 1;
		this.store.set(userId, bucket);
		return bucket.count <= this.maxRequests;
	}
}
