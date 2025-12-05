/**
 * Integration Tests: PHI Scrubbing in Error Logs
 * Verifies that PII is scrubbed from error contexts before Sentry transmission
 *
 * @file tests/integration/logging/phi-scrub.test.ts
 */

import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorMonitoringService } from "@/features/scheduling/infrastructure/monitoring/error-monitoring";

// Mock Sentry functions - capture calls
let capturedExceptions: Array<{
	error: Error;
	options?: {
		extra?: Record<string, unknown>;
		tags?: Record<string, string>;
	};
}> = [];

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(
		(
			error: Error,
			options?: {
				extra?: Record<string, unknown>;
				tags?: Record<string, string>;
			},
		) => {
			capturedExceptions.push({ error, options });
		},
	),
	setUser: vi.fn(),
	setTag: vi.fn(),
	setContext: vi.fn(),
	addBreadcrumb: vi.fn(),
	captureMessage: vi.fn(),
}));

// Mock analytics
vi.mock("@/features/notifications/application/analytics", () => ({
	analytics: {
		trackError: vi.fn(),
	},
}));

describe("PHI Scrubbing Integration Tests: Error Logs", () => {
	let errorMonitoring: ErrorMonitoringService;

	beforeEach(() => {
		vi.clearAllMocks();
		capturedExceptions = [];
		errorMonitoring = new ErrorMonitoringService();
	});

	it("should scrub email from user context before Sentry capture", () => {
		const error = new Error("Test error");
		errorMonitoring.reportError({
			error,
			message: "Test error message",
			context: {
				userId: "user-123",
				userEmail: "user@example.com",
				component: "test",
			},
		});

		expect(Sentry.captureException).toHaveBeenCalled();
		expect(Sentry.setUser).toHaveBeenCalled();
		// Verify user email was scrubbed
		const setUserCall = vi.mocked(Sentry.setUser).mock.calls[0];
		expect(setUserCall[0]?.email).toBe("[REDACTED]");
	});

	it("should scrub PII from metadata context before Sentry capture", () => {
		const error = new Error("Test error");
		errorMonitoring.reportError({
			error,
			message: "Test error message",
			context: {
				component: "test",
				metadata: {
					email: "user@example.com",
					name: "John Doe",
					phone: "555-123-4567",
					safeField: "safe value",
				},
			},
		});

		expect(Sentry.captureException).toHaveBeenCalled();
		const capturedException = capturedExceptions[0];
		expect(capturedException).toBeDefined();
		expect(capturedException.options?.extra?.context).toBeDefined();

		const context = capturedException.options?.extra?.context as Record<
			string,
			unknown
		>;
		expect(context.email).toBe("[REDACTED]");
		expect(context.name).toBe("[REDACTED]");
		expect(context.phone).toBe("[REDACTED]");
		expect(context.safeField).toBe("safe value");
	});

	it("should scrub nested objects in metadata", () => {
		const error = new Error("Test error");
		errorMonitoring.reportError({
			error,
			message: "Test error message",
			context: {
				component: "test",
				metadata: {
					user: {
						email: "user@example.com",
						name: "John Doe",
						metadata: {
							phone: "555-123-4567",
						},
					},
					other: "safe data",
				},
			},
		});

		expect(Sentry.captureException).toHaveBeenCalled();
		const capturedException = capturedExceptions[0];
		const context = capturedException.options?.extra?.context as Record<
			string,
			unknown
		>;
		const user = context.user as Record<string, unknown>;
		expect(user.email).toBe("[REDACTED]");
		expect(user.name).toBe("[REDACTED]");
		const metadata = user.metadata as Record<string, unknown>;
		expect(metadata.phone).toBe("[REDACTED]");
		expect(context.other).toBe("safe data");
	});

	it("should preserve non-PII fields in error context", () => {
		const error = new Error("Test error");
		errorMonitoring.reportError({
			error,
			message: "Test error message",
			context: {
				component: "test",
				action: "submit",
				metadata: {
					userId: "550e8400-e29b-41d4-a716-446655440000",
					timestamp: "2025-01-27T12:00:00Z",
					count: 42,
				},
			},
		});

		expect(Sentry.captureException).toHaveBeenCalled();
		const capturedException = capturedExceptions[0];
		expect(capturedException.options?.tags?.component).toBe("test");
		expect(capturedException.options?.tags?.action).toBe("submit");

		const context = capturedException.options?.extra?.context as Record<
			string,
			unknown
		>;
		expect(context.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
		expect(context.timestamp).toBe("2025-01-27T12:00:00Z");
		expect(context.count).toBe(42);
	});
});
