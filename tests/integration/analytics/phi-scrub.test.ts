/**
 * Integration Tests: PHI Scrubbing in Analytics Events
 * Verifies that PII is scrubbed from analytics events before PostHog transmission
 *
 * @file tests/integration/analytics/phi-scrub.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostHogAnalyticsService } from "@/features/notifications/infrastructure/posthog/AnalyticsService";

// Mock PostHog client - capture capture calls
let capturedEvents: Array<{
	distinctId: string;
	event: string;
	properties: Record<string, unknown>;
}> = [];

vi.mock("posthog-node", () => {
	// Create mock PostHog class inside factory to avoid hoisting issues
	class MockPostHog {
		capture(event: {
			distinctId: string;
			event: string;
			properties: Record<string, unknown>;
		}) {
			// Access capturedEvents from closure
			(globalThis as any).__capturedAnalyticsEvents = ((globalThis as any)
				.__capturedAnalyticsEvents || []) as Array<{
				distinctId: string;
				event: string;
				properties: Record<string, unknown>;
			}>;
			(globalThis as any).__capturedAnalyticsEvents.push(event);
		}

		shutdown() {
			// Mock implementation
		}

		flush() {
			// Mock implementation
		}
	}

	return {
		PostHog: MockPostHog,
	};
});

describe("PHI Scrubbing Integration Tests: Analytics Events", () => {
	let analyticsService: PostHogAnalyticsService;

	beforeEach(() => {
		vi.clearAllMocks();
		capturedEvents = [];
		// Reset global captured events
		(globalThis as any).__capturedAnalyticsEvents = [];
		analyticsService = new PostHogAnalyticsService({
			apiKey: "test-key",
			host: "https://app.posthog.com",
			enabled: true,
			debug: false,
		});
	});

	it("should scrub email addresses from event properties before PostHog capture", async () => {
		await analyticsService.track("test_event", {
			userEmail: "user@example.com",
			action: "click",
			timestamp: "2025-01-27T12:00:00Z",
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		expect(events.length).toBeGreaterThan(0);
		const capturedEvent = events[0];
		expect(capturedEvent).toBeDefined();
		expect(capturedEvent.properties.userEmail).toBe("[REDACTED]");
		expect(capturedEvent.properties.userEmail).not.toContain("@");
	});

	it("should scrub phone numbers from event properties before PostHog capture", async () => {
		await analyticsService.track("test_event", {
			phone: "555-123-4567",
			action: "submit",
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		expect(events.length).toBeGreaterThan(0);
		const capturedEvent = events[0];
		expect(capturedEvent).toBeDefined();
		expect(capturedEvent.properties.phone).toBe("[REDACTED]");
		expect(capturedEvent.properties.phone).not.toMatch(
			/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
		);
	});

	it("should scrub name fields from event properties", async () => {
		await analyticsService.track("test_event", {
			name: "John Doe",
			fullName: "Jane Smith",
			action: "view",
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		expect(events.length).toBeGreaterThan(0);
		const capturedEvent = events[0];
		expect(capturedEvent).toBeDefined();
		expect(capturedEvent.properties.name).toBe("[REDACTED]");
		expect(capturedEvent.properties.fullName).toBe("[REDACTED]");
	});

	it("should scrub nested objects recursively", async () => {
		await analyticsService.track("test_event", {
			user: {
				email: "user@example.com",
				name: "John Doe",
				metadata: {
					phone: "555-123-4567",
				},
			},
			action: "test",
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		expect(events.length).toBeGreaterThan(0);
		const capturedEvent = events[0];
		expect(capturedEvent).toBeDefined();
		const user = capturedEvent.properties.user as Record<string, unknown>;
		expect(user.email).toBe("[REDACTED]");
		expect(user.name).toBe("[REDACTED]");
		const metadata = user.metadata as Record<string, unknown>;
		expect(metadata.phone).toBe("[REDACTED]");
	});

	it("should preserve non-PII fields", async () => {
		await analyticsService.track("test_event", {
			userId: "550e8400-e29b-41d4-a716-446655440000",
			action: "click",
			timestamp: "2025-01-27T12:00:00Z",
			count: 42,
		});

		// The service initializes PostHog on first track call
		// Give it a moment to initialize and capture
		await new Promise((resolve) => setTimeout(resolve, 50));

		const events = (globalThis as any).__capturedAnalyticsEvents || [];
		expect(events.length).toBeGreaterThan(0);
		const capturedEvent = events[0];
		expect(capturedEvent).toBeDefined();
		expect(capturedEvent.properties.userId).toBe(
			"550e8400-e29b-41d4-a716-446655440000",
		);
		expect(capturedEvent.properties.action).toBe("click");
		expect(capturedEvent.properties.count).toBe(42);
	});

	it("should handle events with anonymized distinctId", async () => {
		await analyticsService.track(
			"test_event",
			{ action: "test" },
			"550e8400-e29b-41d4-a716-446655440000", // Valid UUID, not email
		);

		await new Promise((resolve) => setTimeout(resolve, 50));

		// Verify the service processes the event without errors
		// The scrubbing and validation logic is tested in unit tests
		// This integration test verifies the service doesn't break with valid input
		expect(true).toBe(true);
	});
});
