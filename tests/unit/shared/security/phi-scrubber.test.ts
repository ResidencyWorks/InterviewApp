import { describe, expect, it } from "vitest";
import { PhiScrubber } from "@/shared/security/phi-scrubber";

describe("PhiScrubber", () => {
	describe("scrubUserInput", () => {
		it("should remove email addresses and replace with placeholder", () => {
			const input = "Contact me at john.doe@example.com for more info";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).not.toContain("john.doe@example.com");
			expect(result).toContain("[EMAIL_REDACTED]");
		});

		it("should remove phone numbers and replace with placeholder", () => {
			const input = "Call me at (555) 123-4567 or 555-987-6543";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).not.toMatch(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/);
			expect(result).toContain("[PHONE_REDACTED]");
		});

		it("should handle multiple email addresses", () => {
			const input = "Email admin@company.com or support@company.com";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).not.toContain("admin@company.com");
			expect(result).not.toContain("support@company.com");
			expect(result.split("[EMAIL_REDACTED]").length).toBeGreaterThan(2);
		});

		it("should handle multiple phone numbers", () => {
			const input = "Call 555-111-2222 or (555) 333-4444";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result.split("[PHONE_REDACTED]").length).toBeGreaterThan(2);
		});

		it("should handle text with both email and phone", () => {
			const input = "Contact john@example.com or call 555-123-4567";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toContain("[EMAIL_REDACTED]");
			expect(result).toContain("[PHONE_REDACTED]");
			expect(result).not.toContain("john@example.com");
			expect(result).not.toMatch(/555-123-4567/);
		});

		it("should not modify text without PHI", () => {
			const input = "This is a normal text without any sensitive information";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toBe(input);
		});

		it("should handle empty string", () => {
			const result = PhiScrubber.scrubUserInput("");
			expect(result).toBe("");
		});

		it("should handle email-like patterns that are not emails", () => {
			// Word "email" should not be flagged
			const input = "Please send an email to discuss";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toBe(input);
		});

		it("should handle US phone numbers with country code", () => {
			const input = "Call +1-555-123-4567";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toContain("[PHONE_REDACTED]");
			expect(result).not.toMatch(/\+1-555-123-4567/);
		});

		it("should preserve text structure and readability", () => {
			const input = "My email is test@example.com. Call me at 555-123-4567.";
			const result = PhiScrubber.scrubUserInput(input);
			expect(result).toContain("My email is");
			expect(result).toContain("Call me at");
			expect(result).toContain(".");
		});
	});

	describe("isPhiPresent", () => {
		it("should return true when email is present", () => {
			const input = "Contact me at john@example.com";
			expect(PhiScrubber.isPhiPresent(input)).toBe(true);
		});

		it("should return true when phone number is present", () => {
			const input = "Call me at 555-123-4567";
			expect(PhiScrubber.isPhiPresent(input)).toBe(true);
		});

		it("should return true when both email and phone are present", () => {
			const input = "Email john@example.com or call 555-123-4567";
			expect(PhiScrubber.isPhiPresent(input)).toBe(true);
		});

		it("should return false when no PHI is present", () => {
			const input = "This is normal text without sensitive information";
			expect(PhiScrubber.isPhiPresent(input)).toBe(false);
		});

		it("should return false for empty string", () => {
			expect(PhiScrubber.isPhiPresent("")).toBe(false);
		});
	});
});
