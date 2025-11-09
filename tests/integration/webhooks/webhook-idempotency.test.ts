import { describe, expect, it } from "vitest";
import { idempotencyStore } from "@/infrastructure/webhooks/IdempotencyStore";

describe("webhook idempotency store", () => {
	it("prevents duplicate processing within TTL", async () => {
		const key = "evt_123";
		const created = idempotencyStore.tryCreate(key, 1000);
		expect(created).toBe(true);
		const duplicate = idempotencyStore.tryCreate(key, 1000);
		expect(duplicate).toBe(false);
	});
});
