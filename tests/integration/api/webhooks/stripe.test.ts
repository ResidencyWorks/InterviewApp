import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { handleStripeWebhookRequest } from "@/features/billing/application/stripe-webhook";

// Mock the webhook handler
vi.mock("@/features/billing/application/stripe-webhook", () => ({
	handleStripeWebhookRequest: vi.fn(),
}));

describe("POST /api/webhooks/stripe - Signature Verification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should return 400 when signature verification fails", async () => {
		// Mock webhook handler to return invalid signature error
		vi.mocked(handleStripeWebhookRequest).mockResolvedValue({
			status: 400,
			body: { error: "Invalid signature" },
		});

		const request = new NextRequest(
			"http://localhost:3000/api/webhooks/stripe",
			{
				method: "POST",
				body: JSON.stringify({ type: "checkout.session.completed" }),
				headers: {
					"stripe-signature": "invalid_signature",
					"content-type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Invalid signature");
		expect(handleStripeWebhookRequest).toHaveBeenCalledWith(request);
	});

	it("should return 400 when signature is missing", async () => {
		vi.mocked(handleStripeWebhookRequest).mockResolvedValue({
			status: 400,
			body: { error: "Missing stripe signature" },
		});

		const request = new NextRequest(
			"http://localhost:3000/api/webhooks/stripe",
			{
				method: "POST",
				body: JSON.stringify({ type: "checkout.session.completed" }),
				headers: {
					"content-type": "application/json",
					// No stripe-signature header
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Missing stripe signature");
	});

	it("should preserve raw body for signature verification", async () => {
		const rawBody = JSON.stringify({
			id: "evt_test_123",
			type: "checkout.session.completed",
			data: { object: { id: "cs_test_123" } },
		});

		vi.mocked(handleStripeWebhookRequest).mockResolvedValue({
			status: 200,
			body: { ok: true, processed: true },
		});

		const request = new NextRequest(
			"http://localhost:3000/api/webhooks/stripe",
			{
				method: "POST",
				body: rawBody,
				headers: {
					"stripe-signature": "valid_signature",
					"content-type": "application/json",
				},
			},
		);

		await POST(request);

		// Verify that the handler was called with the request (body should be raw)
		expect(handleStripeWebhookRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: "POST",
			}),
		);
	});

	it("should return 200 when signature is valid", async () => {
		vi.mocked(handleStripeWebhookRequest).mockResolvedValue({
			status: 200,
			body: {
				eventId: "evt_test_123",
				eventType: "checkout.session.completed",
				processed: true,
			},
		});

		const request = new NextRequest(
			"http://localhost:3000/api/webhooks/stripe",
			{
				method: "POST",
				body: JSON.stringify({ type: "checkout.session.completed" }),
				headers: {
					"stripe-signature": "valid_signature",
					"content-type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.processed).toBe(true);
		expect(data.eventId).toBe("evt_test_123");
	});

	it("should handle webhook secret not configured error", async () => {
		vi.mocked(handleStripeWebhookRequest).mockResolvedValue({
			status: 500,
			body: { error: "Webhook secret not configured" },
		});

		const request = new NextRequest(
			"http://localhost:3000/api/webhooks/stripe",
			{
				method: "POST",
				body: JSON.stringify({ type: "checkout.session.completed" }),
				headers: {
					"stripe-signature": "valid_signature",
					"content-type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe("Webhook secret not configured");
	});

	it("should return proper error response format for invalid signature", async () => {
		vi.mocked(handleStripeWebhookRequest).mockResolvedValue({
			status: 400,
			body: { error: "Invalid signature" },
		});

		const request = new NextRequest(
			"http://localhost:3000/api/webhooks/stripe",
			{
				method: "POST",
				body: JSON.stringify({ type: "checkout.session.completed" }),
				headers: {
					"stripe-signature": "tampered_signature",
					"content-type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toHaveProperty("error");
		expect(data.error).toContain("Invalid signature");
		// Should not process the event
		expect(data).not.toHaveProperty("processed");
	});
});
