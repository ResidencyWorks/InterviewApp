import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleStripeWebhookRequest } from "@/features/billing/application/stripe-webhook";

// Type for insert calls tracking
type InsertCall = { table: string; data: unknown };

// Mock Stripe SDK - define inside factory to avoid hoisting issues
let mockStripeWebhooks: { constructEvent: ReturnType<typeof vi.fn> };

vi.mock("stripe", async () => {
	const { vi } = await import("vitest");
	const mockConstructEvent = vi.fn();
	const mockWebhooks = {
		constructEvent: mockConstructEvent,
	};
	// Store reference globally for test access
	(globalThis as any).__mockStripeWebhooksIdempotency = mockWebhooks;
	return {
		default: class Stripe {
			webhooks = mockWebhooks;
		},
	};
});

// Mock idempotency store (simulate Redis behavior) - define inside factory to avoid hoisting issues
vi.mock(
	"@/features/billing/infrastructure/stripe/StripeIdempotencyStore",
	() => {
		// Create idempotency store inside factory
		const idempotencyStore: Map<string, boolean> = new Map();
		// Store reference globally for test access
		(globalThis as any).__idempotencyStoreIdempotency = idempotencyStore;
		return {
			stripeIdempotencyStore: {
				tryCreate: vi.fn(async (key: string) => {
					if (idempotencyStore.has(key)) {
						return false; // Already exists
					}
					idempotencyStore.set(key, true);
					return true; // Created
				}),
				exists: vi.fn(async (key: string) => {
					return idempotencyStore.has(key);
				}),
			},
		};
	},
);

// Mock database service - define inside factory to avoid hoisting issues
vi.mock("@/infrastructure/db/database-service", () => {
	// Create insertCalls array inside factory
	const insertCalls: InsertCall[] = [];
	// Store reference globally for test access
	(globalThis as any).__insertCallsIdempotency = insertCalls;
	return {
		serverDatabaseService: {
			insert: vi.fn(async (table: string, data: unknown) => {
				insertCalls.push({ table, data });
				// Simulate unique constraint violation for duplicate stripe_event_id
				const dataObj = data as { stripe_event_id?: string };
				const existingCall = insertCalls.find(
					(call, index) =>
						index < insertCalls.length - 1 &&
						(call.data as { stripe_event_id?: string })?.stripe_event_id ===
							dataObj.stripe_event_id,
				);
				if (existingCall) {
					return {
						success: false,
						error: "duplicate key value violates unique constraint",
						data: null,
					};
				}
				return {
					success: true,
					data: { id: `entitlement_${insertCalls.length}` },
					error: null,
				};
			}),
		},
	};
});

// Mock cache
vi.mock("@/infrastructure/redis", () => ({
	userEntitlementCache: {
		set: vi.fn().mockResolvedValue(true),
	},
}));

// Mock environment
vi.mock("@/infrastructure/config/environment", () => ({
	env: {
		STRIPE_SECRET_KEY: "sk_test_123",
		STRIPE_WEBHOOK_SECRET: "whsec_test_123",
	},
}));

// Mock PostHog
vi.mock("@/infrastructure/config/clients", () => ({
	getPostHogClient: vi.fn(() => ({
		capture: vi.fn(),
	})),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

describe("Webhook Idempotency Replay Integration", () => {
	const mockEventId = "evt_test_replay_123";
	const mockUserId = "user_replay_123";
	const mockEntitlementLevel = "PRO";

	const mockCheckoutSession: Partial<Stripe.Checkout.Session> = {
		id: "cs_test_replay",
		client_reference_id: mockUserId,
		metadata: {
			userId: mockUserId,
			entitlementLevel: mockEntitlementLevel,
		},
	};

	const mockEvent: Partial<Stripe.Event> = {
		id: mockEventId,
		type: "checkout.session.completed",
		data: {
			object: mockCheckoutSession as Stripe.Checkout.Session,
		},
	};

	const createMockRequest = (body: string, signature: string) => {
		return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
			method: "POST",
			body,
			headers: {
				"stripe-signature": signature,
				"content-type": "application/json",
			},
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Get references from global
		const idempotencyStore = (globalThis as any).__idempotencyStoreIdempotency;
		const insertCalls = (globalThis as any).__insertCallsIdempotency;
		mockStripeWebhooks = (globalThis as any).__mockStripeWebhooksIdempotency;

		if (idempotencyStore) {
			idempotencyStore.clear();
		}
		if (insertCalls) {
			insertCalls.length = 0;
		}
		if (mockStripeWebhooks) {
			mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
		}
	});

	afterEach(() => {
		vi.clearAllMocks();
		// Get references from global
		const idempotencyStore = (globalThis as any).__idempotencyStoreIdempotency;
		const insertCalls = (globalThis as any).__insertCallsIdempotency;

		if (idempotencyStore) {
			idempotencyStore.clear();
		}
		if (insertCalls) {
			insertCalls.length = 0;
		}
	});

	it("should process the same event only once when delivered multiple times", async () => {
		const insertCalls = (globalThis as any)
			.__insertCallsIdempotency as InsertCall[];
		const body = JSON.stringify(mockEvent);
		const signature = "valid_signature";

		// First delivery - should succeed
		const request1 = createMockRequest(body, signature);
		const response1 = await handleStripeWebhookRequest(request1);

		expect(response1.status).toBe(200);
		expect(response1.body.processed).toBe(true);
		expect(insertCalls.length).toBe(1);

		// Second delivery (replay) - should be skipped
		const request2 = createMockRequest(body, signature);
		const response2 = await handleStripeWebhookRequest(request2);

		expect(response2.status).toBe(200);
		expect(response2.body.idempotent).toBe(true);
		expect(response2.body.ok).toBe(true);
		// Should not create duplicate entitlement
		expect(insertCalls.length).toBe(1); // Still only 1 insert
	});

	it("should create only one entitlement record for duplicate webhook deliveries", async () => {
		const insertCalls = (globalThis as any)
			.__insertCallsIdempotency as InsertCall[];
		const body = JSON.stringify(mockEvent);
		const signature = "valid_signature";

		// Simulate 3 deliveries of the same event
		for (let i = 0; i < 3; i++) {
			const request = createMockRequest(body, signature);
			await handleStripeWebhookRequest(request);
		}

		// Should only have 1 database insert (first one succeeds, others are idempotent)
		const successfulInserts = insertCalls.filter(
			(call) =>
				(call.data as { stripe_event_id?: string })?.stripe_event_id ===
				mockEventId,
		);
		expect(successfulInserts.length).toBe(1);
	});

	it("should handle rapid duplicate deliveries correctly", async () => {
		const insertCalls = (globalThis as any)
			.__insertCallsIdempotency as InsertCall[];
		const body = JSON.stringify(mockEvent);
		const signature = "valid_signature";

		// Send 5 requests rapidly (simulating network retries)
		const requests = Array.from({ length: 5 }, () =>
			createMockRequest(body, signature),
		);
		const responses = await Promise.all(
			requests.map((req) => handleStripeWebhookRequest(req)),
		);

		// First should succeed, rest should be idempotent
		expect(responses[0].status).toBe(200);
		expect(responses[0].body.processed).toBe(true);

		for (let i = 1; i < responses.length; i++) {
			expect(responses[i].status).toBe(200);
			expect(responses[i].body.idempotent).toBe(true);
		}

		// Only one entitlement should be created
		expect(insertCalls.length).toBe(1);
	});

	it("should preserve idempotency across different request instances", async () => {
		const insertCalls = (globalThis as any)
			.__insertCallsIdempotency as InsertCall[];
		const body = JSON.stringify(mockEvent);
		const signature = "valid_signature";

		// First request
		const request1 = createMockRequest(body, signature);
		await handleStripeWebhookRequest(request1);

		// Second request (different instance, same event)
		const request2 = createMockRequest(body, signature);
		const response2 = await handleStripeWebhookRequest(request2);

		// Should be idempotent even though it's a different request object
		expect(response2.body.idempotent).toBe(true);
		expect(insertCalls.length).toBe(1);
	});
});
