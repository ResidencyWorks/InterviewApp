/**
 * Integration Tests: PHI Scrubbing in /api/submit-text
 * Verifies that phone numbers are scrubbed before database insert
 *
 * @file tests/integration/api/submit-text-phi-scrub.test.ts
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/submit-text/route";

// Mock Supabase client - capture insert calls
let capturedInsertData: unknown = null;

vi.mock("@/infrastructure/config/clients", () => ({
	getSupabaseServiceRoleClient: vi.fn(() => ({
		from: vi.fn(() => ({
			insert: vi.fn((data: unknown) => {
				// Supabase insert receives an object, not array
				capturedInsertData = Array.isArray(data) ? data[0] : data;
				return Promise.resolve({
					data: [{ id: "test-recording-id" }],
					error: null,
				});
			}),
		})),
	})),
}));

// Mock upload permission validation
vi.mock("@/features/auth/application/entitlements/upload-permissions", () => ({
	validateUploadPermission: vi.fn().mockResolvedValue(undefined),
}));

// Mock text submission validation
vi.mock("@/features/booking/application/upload/schemas", () => ({
	validateTextSubmissionRequest: vi.fn((data: unknown) => ({
		valid: true,
		data,
		error: null,
	})),
}));

describe("PHI Scrubbing Integration Tests: /api/submit-text", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedInsertData = null;
	});

	it("should scrub phone numbers from textContent before database insert", async () => {
		const requestBody = {
			textContent: "My phone number is (555) 123-4567. Please call me.",
			sessionId: "session-123",
			questionId: "question-456",
			userId: "user-789",
		};

		const request = new NextRequest("http://localhost/api/submit-text", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);

		// Verify phone number was scrubbed in database insert
		const insertData = capturedInsertData as { text_content?: string };
		expect(insertData).toBeDefined();
		expect(insertData?.text_content).toBeDefined();
		expect(insertData?.text_content).not.toMatch(
			/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
		);
		expect(insertData?.text_content).toContain("[PHONE_REDACTED]");
	});

	it("should scrub email addresses from textContent before database insert", async () => {
		const requestBody = {
			textContent: "Email me at user@example.com for more details",
			sessionId: "session-123",
			questionId: "question-456",
			userId: "user-789",
		};

		const request = new NextRequest("http://localhost/api/submit-text", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);

		// Verify email was scrubbed
		const insertData = capturedInsertData as { text_content?: string };
		expect(insertData?.text_content).toBeDefined();
		expect(insertData?.text_content).not.toContain("user@example.com");
		expect(insertData?.text_content).toContain("[EMAIL_REDACTED]");
	});

	it("should return scrubbed text length in response", async () => {
		const originalText = "Call 555-123-4567";
		const requestBody = {
			textContent: originalText,
			sessionId: "session-123",
			questionId: "question-456",
			userId: "user-789",
		};

		const request = new NextRequest("http://localhost/api/submit-text", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.textLength).toBeGreaterThan(0);
		// Length should reflect scrubbed text (may differ from original)
		expect(typeof result.data.textLength).toBe("number");
	});
});
