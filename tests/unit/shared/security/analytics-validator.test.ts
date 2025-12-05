import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsValidator } from "@/shared/security/analytics-validator";

const setNodeEnv = (value: string) => {
	vi.stubEnv("NODE_ENV", value);
};

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("AnalyticsValidator", () => {
	describe("validateEvent", () => {
		it("should throw error in development when distinctId is an email", () => {
			setNodeEnv("development");

			expect(() => {
				AnalyticsValidator.validateEvent("test_event", {
					distinctId: "user@example.com",
				});
			}).toThrow("distinctId cannot be an email address");
		});

		it("should log warning in production when distinctId is an email", () => {
			setNodeEnv("production");
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			AnalyticsValidator.validateEvent("test_event", {
				distinctId: "user@example.com",
			});

			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it("should throw error in development when properties contain email", () => {
			setNodeEnv("development");

			expect(() => {
				AnalyticsValidator.validateEvent("test_event", {
					userEmail: "user@example.com",
				});
			}).toThrow("Analytics event contains PII");
		});

		it("should throw error in development when properties contain phone", () => {
			setNodeEnv("development");

			expect(() => {
				AnalyticsValidator.validateEvent("test_event", {
					phone: "555-123-4567",
				});
			}).toThrow("Analytics event contains PII");
		});

		it("should throw error in development when properties contain name", () => {
			setNodeEnv("development");

			expect(() => {
				AnalyticsValidator.validateEvent("test_event", {
					name: "John Doe",
				});
			}).toThrow("Analytics event contains PII");
		});

		it("should not throw when distinctId is anonymized (UUID)", () => {
			AnalyticsValidator.validateEvent("test_event", {
				distinctId: "550e8400-e29b-41d4-a716-446655440000",
			});
			// Should not throw
		});

		it("should not throw when distinctId is anonymized (hash)", () => {
			AnalyticsValidator.validateEvent("test_event", {
				distinctId: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
			});
			// Should not throw
		});

		it("should not throw when properties contain no PII", () => {
			AnalyticsValidator.validateEvent("test_event", {
				userId: "550e8400-e29b-41d4-a716-446655440000",
				timestamp: "2025-01-27T12:00:00Z",
				action: "click",
			});
			// Should not throw
		});

		it("should validate nested objects for PII", () => {
			setNodeEnv("development");

			expect(() => {
				AnalyticsValidator.validateEvent("test_event", {
					user: {
						email: "user@example.com",
					},
				});
			}).toThrow("Analytics event contains PII");
		});

		it("should handle empty properties object", () => {
			AnalyticsValidator.validateEvent("test_event", {});
			// Should not throw
		});

		it("should handle undefined properties", () => {
			AnalyticsValidator.validateEvent("test_event", undefined);
			// Should not throw
		});
	});
});
