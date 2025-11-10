import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleStripeWebhookRequest } from "@/features/billing/application/stripe-webhook";
import { stripeIdempotencyStore } from "@/features/billing/infrastructure/stripe/StripeIdempotencyStore";
import { serverDatabaseService } from "@/infrastructure/db/database-service";
import { userEntitlementCache } from "@/infrastructure/redis";

// Mock Stripe SDK - Stripe is a class constructor
// Use a module-level variable that will be set by the mock
vi.mock("stripe", async () => {
	const { vi } = await import("vitest");
	const mockConstructEventFn = vi.fn();
	// Store in a way that can be accessed from tests
	(globalThis as any).__mockStripeConstructEvent = mockConstructEventFn;
	return {
		default: class Stripe {
			webhooks = {
				constructEvent: mockConstructEventFn,
			};
		},
	};
});

// Mock idempotency store
vi.mock(
	"@/features/billing/infrastructure/stripe/StripeIdempotencyStore",
	() => ({
		stripeIdempotencyStore: {
			tryCreate: vi.fn(),
			exists: vi.fn(),
		},
	}),
);

// Mock database service
vi.mock("@/infrastructure/db/database-service", () => ({
	serverDatabaseService: {
		insert: vi.fn(),
	},
}));

// Mock cache
vi.mock("@/infrastructure/redis", () => ({
	userEntitlementCache: {
		set: vi.fn(),
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

describe("handleStripeWebhookRequest - Idempotency", () => {
	const mockEventId = "evt_test_1234567890";
	const mockUserId = "user_123";
	const mockEntitlementLevel = "PRO";

	const mockCheckoutSession: Partial<Stripe.Checkout.Session> = {
		id: "cs_test_123",
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

	beforeEach(async () => {
		vi.clearAllMocks();
		// Default: valid signature verification
		const mockConstructEvent = (globalThis as any).__mockStripeConstructEvent;
		if (mockConstructEvent) {
			mockConstructEvent.mockReturnValue(mockEvent as any);
		}
		// Default: event not seen before (idempotent = true)
		vi.mocked(stripeIdempotencyStore.tryCreate).mockResolvedValue(true);
		// Default: successful database insert
		vi.mocked(serverDatabaseService.insert).mockResolvedValue({
			success: true,
			data: { id: "entitlement_123" },
			error: null,
		});
		// Default: successful cache write
		vi.mocked(userEntitlementCache.set).mockResolvedValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should process new event and create idempotency record", async () => {
		const body = JSON.stringify(mockEvent);
		const signature = "valid_signature";
		const request = createMockRequest(body, signature);

		const response = await handleStripeWebhookRequest(request);

		expect(response.status).toBe(200);
		expect(stripeIdempotencyStore.tryCreate).toHaveBeenCalledWith(
			mockEventId,
			24 * 60 * 60 * 1000, // 24 hours
		);
		expect(serverDatabaseService.insert).toHaveBeenCalled();
	});

	it("should skip processing when event already processed (idempotent)", async () => {
		// Event already processed
		vi.mocked(stripeIdempotencyStore.tryCreate).mockResolvedValue(false);

		const body = JSON.stringify(mockEvent);
		const signature = "valid_signature";
		const request = createMockRequest(body, signature);

		const response = await handleStripeWebhookRequest(request);

		expect(response.status).toBe(200);
		expect(response.body.idempotent).toBe(true);
		expect(response.body.ok).toBe(true);
		// Should not process the event
		expect(serverDatabaseService.insert).not.toHaveBeenCalled();
	});

	it("should use Stripe event.id for idempotency check", async () => {
		const body = JSON.stringify(mockEvent);
		const signature = "valid_signature";
		const request = createMockRequest(body, signature);

		await handleStripeWebhookRequest(request);

		// Verify idempotency check uses event.id, not headers
		expect(stripeIdempotencyStore.tryCreate).toHaveBeenCalledWith(
			mockEventId,
			expect.any(Number),
		);
		expect(stripeIdempotencyStore.tryCreate).not.toHaveBeenCalledWith(
			expect.stringContaining("stripe-signature"),
			expect.any(Number),
		);
	});

	it("should log skipped replay when event already processed", async () => {
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(stripeIdempotencyStore.tryCreate).mockResolvedValue(false);

		const body = JSON.stringify(mockEvent);
		const signature = "valid_signature";
		const request = createMockRequest(body, signature);

		await handleStripeWebhookRequest(request);

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Skipped replay"),
		);
		expect(consoleSpy.mock.calls[0][0]).toContain(mockEventId);

		consoleSpy.mockRestore();
	});

	it("should handle different event IDs independently", async () => {
		const eventId1 = "evt_test_111";
		const eventId2 = "evt_test_222";

		const event1: Partial<Stripe.Event> = {
			...mockEvent,
			id: eventId1,
		};
		const event2: Partial<Stripe.Event> = {
			...mockEvent,
			id: eventId2,
		};

		// First event - new
		const mockConstructEvent = (globalThis as any).__mockStripeConstructEvent;
		mockConstructEvent.mockReturnValueOnce(event1 as any);
		const request1 = createMockRequest(JSON.stringify(event1), "sig1");
		await handleStripeWebhookRequest(request1);

		// Second event - new (different ID)
		mockConstructEvent.mockReturnValueOnce(event2 as any);
		const request2 = createMockRequest(JSON.stringify(event2), "sig2");
		await handleStripeWebhookRequest(request2);

		// Both should be processed
		expect(stripeIdempotencyStore.tryCreate).toHaveBeenCalledWith(
			eventId1,
			expect.any(Number),
		);
		expect(stripeIdempotencyStore.tryCreate).toHaveBeenCalledWith(
			eventId2,
			expect.any(Number),
		);
		expect(serverDatabaseService.insert).toHaveBeenCalledTimes(2);
	});
});
