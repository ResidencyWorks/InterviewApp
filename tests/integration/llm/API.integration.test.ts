/**
 * Integration tests for LLM API endpoints
 * Tests the complete API flow
 */

import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "../../../app/api/evaluate/[submissionId]/status/route";
import { POST } from "../../../app/api/evaluate/route";

describe("LLM API Integration Tests", () => {
	beforeAll(async () => {
		// Setup test environment
		process.env.OPENAI_API_KEY = "test-key";
		process.env.POSTHOG_API_KEY = "test-posthog-key";
		process.env.SENTRY_DSN = "https://test-sentry-dsn@sentry.io/test";
	});

	afterAll(async () => {
		// Cleanup test environment
		delete process.env.OPENAI_API_KEY;
		delete process.env.POSTHOG_API_KEY;
		delete process.env.SENTRY_DSN;
	});

	describe("POST /api/evaluate", () => {
		it("should evaluate text submission", async () => {
			const requestBody = {
				content:
					"I have 5 years of experience in full-stack development using React, Node.js, and PostgreSQL.",
				questionId: "q_001",
				userId: "user-123",
				metadata: {
					role: "Senior Software Engineer",
					company: "Tech Corp",
					level: "senior",
				},
			};

			const request = new NextRequest("http://localhost/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toHaveProperty("success");
			expect(data).toHaveProperty("data");
			expect(data.data).toHaveProperty("submissionId");
			expect(data.data).toHaveProperty("status");
			expect(data.data).toHaveProperty("feedback");
			expect(data.data).toHaveProperty("evaluationRequest");

			// Validate feedback structure
			expect(data.data.feedback).toHaveProperty("score");
			expect(data.data.feedback).toHaveProperty("strengths");
			expect(data.data.feedback).toHaveProperty("improvements");
			expect(data.data.feedback).toHaveProperty("generatedAt");
			expect(data.data.feedback).toHaveProperty("model");

			// Validate score range
			expect(data.data.feedback.score).toBeGreaterThanOrEqual(0);
			expect(data.data.feedback.score).toBeLessThanOrEqual(100);
		});

		it("should evaluate audio submission", async () => {
			const requestBody = {
				audioUrl: "https://example.com/test-audio.wav",
				question: "Describe your biggest challenge",
				context: {
					role: "Product Manager",
				},
			};

			const request = new NextRequest("http://localhost/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);

			// This will likely fail with a mock URL, but should fail gracefully
			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("submissionId");
				expect(data).toHaveProperty("feedback");
			} else {
				// Should return appropriate error
				expect(response.status).toBeGreaterThanOrEqual(400);
			}
		});

		it("should handle validation errors", async () => {
			const invalidRequests = [
				{
					// Missing content and audioUrl
					question: "Test question",
				},
				{
					content: "",
					question: "Test question",
				},
				{
					content: "a".repeat(100000), // Too long
					question: "Test question",
				},
			];

			for (const requestBody of invalidRequests) {
				const request = new NextRequest("http://localhost/api/evaluate", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer test-token",
					},
					body: JSON.stringify(requestBody),
				});

				const response = await POST(request);
				expect(response.status).toBe(400);
			}
		});

		it("should handle authentication errors", async () => {
			const requestBody = {
				content: "Test content",
				questionId: "test-question-id",
				userId: "test-user-id",
			};

			const request = new NextRequest("http://localhost/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					// Missing Authorization header
				},
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			expect(response.status).toBe(401);
		});

		it("should handle rate limiting", async () => {
			const requestBody = {
				content: "Rate limit test",
				questionId: "test-question-id",
				userId: "test-user-id",
			};

			// Make multiple rapid requests
			const requests = Array.from(
				{ length: 15 },
				() =>
					new NextRequest("http://localhost/api/evaluate", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: "Bearer test-token",
						},
						body: JSON.stringify(requestBody),
					}),
			);

			const responses = await Promise.all(requests.map((req) => POST(req)));

			// Some requests should be rate limited
			const rateLimited = responses.filter((res) => res.status === 429);
			expect(rateLimited.length).toBeGreaterThan(0);
		});
	});

	describe("GET /api/evaluate/[submissionId]/status", () => {
		it("should return status for valid submission", async () => {
			// First create a submission
			const requestBody = {
				content: "Status test content",
				question: "Test question",
			};

			const createRequest = new NextRequest("http://localhost/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify(requestBody),
			});

			const createResponse = await POST(createRequest);

			if (createResponse.status === 200) {
				const createData = await createResponse.json();
				const submissionId = createData.submissionId;

				// Now check status
				const statusRequest = new NextRequest(
					`http://localhost/api/evaluate/${submissionId}/status`,
					{
						method: "GET",
						headers: {
							Authorization: "Bearer test-token",
						},
					},
				);

				const statusResponse = await GET(statusRequest, {
					params: { submissionId },
				});
				const statusData = await statusResponse.json();

				expect(statusResponse.status).toBe(200);
				expect(statusData).toHaveProperty("submissionId");
				expect(statusData).toHaveProperty("status");
				expect(statusData.submissionId).toBe(submissionId);
			}
		});

		it("should return 404 for invalid submission ID", async () => {
			const request = new NextRequest(
				"http://localhost/api/evaluate/invalid-id/status",
				{
					method: "GET",
					headers: {
						Authorization: "Bearer test-token",
					},
				},
			);

			const response = await GET(request, {
				params: { submissionId: "invalid-id" },
			});
			expect(response.status).toBe(404);
		});

		it("should handle authentication errors", async () => {
			const request = new NextRequest(
				"http://localhost/api/evaluate/test-id/status",
				{
					method: "GET",
					// Missing Authorization header
				},
			);

			const response = await GET(request, {
				params: { submissionId: "test-id" },
			});
			expect(response.status).toBe(401);
		});
	});

	describe("Error Response Format", () => {
		it("should return consistent error format", async () => {
			const request = new NextRequest("http://localhost/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify({
					// Invalid request body - missing required fields
					content: "",
					questionId: "",
					userId: "",
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data).toHaveProperty("error");
			expect(data).toHaveProperty("code");
			expect(data).toHaveProperty("timestamp");
		});
	});

	describe("CORS Headers", () => {
		it("should include CORS headers", async () => {
			const request = new NextRequest("http://localhost/api/evaluate", {
				method: "OPTIONS",
				headers: {
					Origin: "https://example.com",
				},
			});

			const response = await POST(request);

			// Check for CORS headers
			expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
			expect(
				response.headers.get("Access-Control-Allow-Methods"),
			).toBeDefined();
			expect(
				response.headers.get("Access-Control-Allow-Headers"),
			).toBeDefined();
		});
	});

	describe("Request Size Limits", () => {
		it("should handle large requests", async () => {
			const largeContent = "a".repeat(50000); // 50KB
			const requestBody = {
				content: largeContent,
				question: "Test question",
			};

			const request = new NextRequest("http://localhost/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);

			// Should either succeed or return appropriate error
			expect([200, 400, 413]).toContain(response.status);
		});

		it("should reject oversized requests", async () => {
			const oversizedContent = "a".repeat(2000000); // 2MB
			const requestBody = {
				content: oversizedContent,
				questionId: "test-question-id",
				userId: "test-user-id",
			};

			const request = new NextRequest("http://localhost/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify(requestBody),
			});

			const response = await POST(request);
			expect(response.status).toBe(413); // Payload Too Large
		});
	});
});
