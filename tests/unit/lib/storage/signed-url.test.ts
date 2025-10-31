/**
 * Unit tests for Signed URL Service
 *
 * @file tests/unit/lib/storage/signed-url.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	generateSignedUrl,
	getTimeRemaining,
	isSignedUrlValid,
} from "@/lib/storage/signed-url";
import * as supabaseStorage from "@/lib/storage/supabase-storage";

// Mock the supabase storage module
vi.mock("@/lib/storage/supabase-storage", () => ({
	getSignedUrl: vi.fn(),
}));

describe("Signed URL Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("generateSignedUrl", () => {
		it("should generate signed URL successfully", async () => {
			const mockUrl = "https://example.com/signed-url";
			vi.mocked(supabaseStorage.getSignedUrl).mockResolvedValue({
				url: mockUrl,
				error: null,
			});

			const result = await generateSignedUrl("/test/path.webm", 900);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.url).toBe(mockUrl);
			expect(result.data?.expiresIn).toBe(900);
			expect(result.data?.generatedAt).toBeInstanceOf(Date);
			expect(result.data?.expiresAt).toBeInstanceOf(Date);

			// Verify expiresAt is approximately 900 seconds in the future
			const now = new Date();
			const expiresAt = result.data?.expiresAt;
			expect(expiresAt).toBeDefined();
			if (!expiresAt) return;
			const diff = expiresAt.getTime() - now.getTime();
			expect(diff).toBeGreaterThan(890000); // At least 890 seconds
			expect(diff).toBeLessThan(910000); // At most 910 seconds
		});

		it("should reject expiry time exceeding maximum", async () => {
			const result = await generateSignedUrl("/test/path.webm", 1000);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Expiry time exceeds maximum of 900 seconds");
			expect(result.data).toBeUndefined();
		});

		it("should reject zero or negative expiry time", async () => {
			const result1 = await generateSignedUrl("/test/path.webm", 0);
			const result2 = await generateSignedUrl("/test/path.webm", -100);

			expect(result1.success).toBe(false);
			expect(result1.error).toBe("Expiry time must be greater than 0");

			expect(result2.success).toBe(false);
			expect(result2.error).toBe("Expiry time must be greater than 0");
		});

		it("should use default expiry time when not specified", async () => {
			const mockUrl = "https://example.com/signed-url";
			vi.mocked(supabaseStorage.getSignedUrl).mockResolvedValue({
				url: mockUrl,
				error: null,
			});

			const result = await generateSignedUrl("/test/path.webm");

			expect(result.success).toBe(true);
			expect(result.data?.expiresIn).toBe(900); // Default 15 minutes
		});

		it("should handle storage errors", async () => {
			vi.mocked(supabaseStorage.getSignedUrl).mockResolvedValue({
				url: null,
				error: "Storage error",
			});

			const result = await generateSignedUrl("/test/path.webm", 900);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Storage error");
			expect(result.data).toBeUndefined();
		});

		it("should handle null URL from storage", async () => {
			vi.mocked(supabaseStorage.getSignedUrl).mockResolvedValue({
				url: null,
				error: null,
			});

			const result = await generateSignedUrl("/test/path.webm", 900);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Failed to generate signed URL");
			expect(result.data).toBeUndefined();
		});
	});

	describe("isSignedUrlValid", () => {
		it("should return true for future expiration", () => {
			const futureDate = new Date();
			futureDate.setMinutes(futureDate.getMinutes() + 10);

			expect(isSignedUrlValid(futureDate)).toBe(true);
		});

		it("should return false for past expiration", () => {
			const pastDate = new Date();
			pastDate.setMinutes(pastDate.getMinutes() - 10);

			expect(isSignedUrlValid(pastDate)).toBe(false);
		});

		it("should return false for exactly now expiration", () => {
			const now = new Date();

			expect(isSignedUrlValid(now)).toBe(false);
		});
	});

	describe("getTimeRemaining", () => {
		it("should return correct time remaining in seconds", () => {
			const futureDate = new Date();
			futureDate.setSeconds(futureDate.getSeconds() + 100);

			const remaining = getTimeRemaining(futureDate);

			expect(remaining).toBeGreaterThan(95);
			expect(remaining).toBeLessThan(105);
		});

		it("should return 0 for expired URL", () => {
			const pastDate = new Date();
			pastDate.setSeconds(pastDate.getSeconds() - 100);

			const remaining = getTimeRemaining(pastDate);

			expect(remaining).toBe(0);
		});

		it("should return 0 for exactly now expiration", () => {
			const now = new Date();

			const remaining = getTimeRemaining(now);

			expect(remaining).toBe(0);
		});

		it("should return rounded down seconds", () => {
			const futureDate = new Date();
			futureDate.setMilliseconds(futureDate.getMilliseconds() + 1500); // 1.5 seconds

			const remaining = getTimeRemaining(futureDate);

			expect(remaining).toBe(1); // Should be floor(1.5) = 1
		});
	});
});
