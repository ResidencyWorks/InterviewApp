/**
 * Integration Tests: PHI Scrubbing in /api/evaluations
 * Verifies that email addresses and phone numbers are scrubbed before database insert
 *
 * @file tests/integration/api/evaluations-phi-scrub.test.ts
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/evaluations/route";

// Mock auth service
const mockUser = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	email: "test@example.com",
};

vi.mock("@/features/auth/application/services/server-auth-service", () => ({
	getServerAuthService: vi.fn(async () => ({
		getUser: vi.fn(async () => mockUser),
	})),
}));

// Mock database service - capture insert calls to verify scrubbing
let capturedInsertData: unknown = null;

vi.mock("@/infrastructure/db/database-service", () => ({
	getServerDatabaseService: vi.fn(async () => ({
		insert: vi.fn(async (_table: string, data: unknown, _options?: unknown) => {
			capturedInsertData = data;
			return {
				success: true,
				data: { id: "test-id", ...(data as Record<string, unknown>) },
				error: null,
			};
		}),
	})),
}));

describe("PHI Scrubbing Integration Tests: /api/evaluations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedInsertData = null;
	});

	it("should scrub email addresses from response_text before database insert", async () => {
		const requestBody = {
			response_text: "Contact me at john.doe@example.com for more information",
			response_type: "text" as const,
			categories: { communication: 85 },
		};

		const request = new NextRequest("http://localhost/api/evaluations", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);

		// Verify email was scrubbed in database insert
		const insertData = capturedInsertData as { response_text?: string };
		expect(insertData?.response_text).toBeDefined();
		expect(insertData?.response_text).not.toContain("john.doe@example.com");
		expect(insertData?.response_text).toContain("[EMAIL_REDACTED]");
	});

	it("should scrub phone numbers from response_text before database insert", async () => {
		const requestBody = {
			response_text: "Call me at (555) 123-4567 or 555-987-6543",
			response_type: "text" as const,
			categories: { communication: 85 },
		};

		const request = new NextRequest("http://localhost/api/evaluations", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);

		// Verify phone numbers were scrubbed
		const insertData = capturedInsertData as { response_text?: string };
		expect(insertData?.response_text).toBeDefined();
		expect(insertData?.response_text).not.toMatch(
			/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
		);
		expect(insertData?.response_text).toContain("[PHONE_REDACTED]");
	});

	it("should scrub both email and phone from response_text", async () => {
		const requestBody = {
			response_text:
				"Contact john@example.com or call 555-123-4567 for details",
			response_type: "text" as const,
			categories: { communication: 85 },
		};

		const request = new NextRequest("http://localhost/api/evaluations", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);

		// Verify both were scrubbed
		const insertData = capturedInsertData as { response_text?: string };
		expect(insertData?.response_text).toBeDefined();
		expect(insertData?.response_text).not.toContain("john@example.com");
		expect(insertData?.response_text).not.toMatch(/555-123-4567/);
		expect(insertData?.response_text).toContain("[EMAIL_REDACTED]");
		expect(insertData?.response_text).toContain("[PHONE_REDACTED]");
	});

	it("should not modify text without PHI", async () => {
		const originalText =
			"This is normal text without any sensitive information";
		const requestBody = {
			response_text: originalText,
			response_type: "text" as const,
			categories: { communication: 85 },
		};

		const request = new NextRequest("http://localhost/api/evaluations", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);

		// Verify text unchanged when no PHI present
		const insertData = capturedInsertData as { response_text?: string };
		expect(insertData?.response_text).toBe(originalText);
	});
});
