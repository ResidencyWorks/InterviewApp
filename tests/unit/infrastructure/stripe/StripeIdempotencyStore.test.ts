import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StripeIdempotencyStore } from "@/features/billing/infrastructure/stripe/StripeIdempotencyStore";
import { getRedisClient } from "@/infrastructure/config/clients";

// Mock Redis client - define inside factory to avoid hoisting issues
// Use a getter function pattern to access the mock in tests
vi.mock("@/infrastructure/config/clients", () => {
	const mockRedisClient = {
		exists: vi.fn(),
		setex: vi.fn(),
	};
	// Store reference globally for test access
	(globalThis as any).__mockRedisClient = mockRedisClient;
	return {
		getRedisClient: vi.fn(() => mockRedisClient),
	};
});

describe("StripeIdempotencyStore", () => {
	let store: StripeIdempotencyStore;
	let mockRedisClient: {
		exists: ReturnType<typeof vi.fn>;
		setex: ReturnType<typeof vi.fn>;
	};
	let getRedisClientMock: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		// Get the mock redis client from global
		mockRedisClient = (globalThis as any).__mockRedisClient;
		getRedisClientMock = vi.mocked(getRedisClient);
		getRedisClientMock.mockReturnValue(mockRedisClient);
		// Create a new store instance for each test
		store = new StripeIdempotencyStore();
	});

	it("should return true when event ID is new", async () => {
		vi.mocked(mockRedisClient.exists).mockResolvedValue(0); // Key doesn't exist
		vi.mocked(mockRedisClient.setex).mockResolvedValue("OK");

		const result = await store.tryCreate("evt_test_123", 86400000);

		expect(result).toBe(true);
		expect(mockRedisClient.exists).toHaveBeenCalledWith(
			"webhook:event:evt_test_123",
		);
		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"webhook:event:evt_test_123",
			86400,
			"1",
		);
	});

	it("should return false when event ID already exists", async () => {
		vi.mocked(mockRedisClient.exists).mockResolvedValue(1); // Key exists

		const result = await store.tryCreate("evt_test_123", 86400000);

		expect(result).toBe(false);
		expect(mockRedisClient.exists).toHaveBeenCalledWith(
			"webhook:event:evt_test_123",
		);
		expect(mockRedisClient.setex).not.toHaveBeenCalled();
	});

	it("should check if event exists", async () => {
		vi.mocked(mockRedisClient.exists).mockResolvedValue(1);

		const result = await store.exists("evt_test_123");

		expect(result).toBe(true);
		expect(mockRedisClient.exists).toHaveBeenCalledWith(
			"webhook:event:evt_test_123",
		);
	});

	it("should return true when Redis is unavailable", async () => {
		// Mock getRedisClient to return null for this test
		getRedisClientMock.mockReturnValueOnce(null);

		const storeWithoutRedis = new StripeIdempotencyStore();
		const result = await storeWithoutRedis.tryCreate("evt_test_123", 86400000);

		// Should allow processing but log warning
		expect(result).toBe(true);
	});
});
