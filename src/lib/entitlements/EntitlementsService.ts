export interface IUserEntitlements {
	userId: string;
	practiceAccess: boolean;
	expiresAt?: number;
}

export class EntitlementsService {
	private readonly cache = new Map<string, IUserEntitlements>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60 * 60 * 1000) {
		this.ttlMs = ttlMs;
	}

	grantPractice(userId: string): IUserEntitlements {
		const ent: IUserEntitlements = {
			userId,
			practiceAccess: true,
			expiresAt: Date.now() + this.ttlMs,
		};
		this.cache.set(userId, ent);
		return ent;
	}

	get(userId: string): IUserEntitlements {
		const ent = this.cache.get(userId);
		const now = Date.now();
		if (ent?.expiresAt && ent.expiresAt > now) return ent;
		return { userId, practiceAccess: false };
	}
}

export const entitlementsService = new EntitlementsService();
