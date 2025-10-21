import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock Supabase client
const mockSupabaseClient = {
	auth: {
		getSession: vi.fn(),
		signInWithOtp: vi.fn(),
	},
};

vi.mock("@supabase/ssr", () => ({
	createServerClient: () => mockSupabaseClient,
}));

vi.mock("next/headers", () => ({
	cookies: () => ({
		getAll: vi.fn(() => []),
		set: vi.fn(),
	}),
}));

// Import the API route handler
import { GET, POST } from "@/app/api/auth/route";

describe("Auth API Routes Integration", () => {
	beforeAll(() => {
		// Set up test environment
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
		process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
	});

	afterAll(() => {
		vi.clearAllMocks();
	});

	describe("POST /api/auth (Magic Link)", () => {
		it("should handle successful magic link request", async () => {
			const email = "test@example.com";
			mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({ error: null });

			const request = new NextRequest("http://localhost:3000/api/auth", {
				body: JSON.stringify({ email }),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("Magic link sent successfully");
			expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
				email,
				options: {
					emailRedirectTo: "http://localhost:3000/callback",
				},
			});
		});

		it("should handle invalid email", async () => {
			const email = "invalid-email";
			mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
				error: { message: "Invalid email format" },
			});

			const request = new NextRequest("http://localhost:3000/api/auth", {
				body: JSON.stringify({ email }),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("Invalid email format");
		});

		it("should handle missing email", async () => {
			const request = new NextRequest("http://localhost:3000/api/auth", {
				body: JSON.stringify({}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("Email is required");
		});

		it("should handle server errors", async () => {
			const email = "test@example.com";
			mockSupabaseClient.auth.signInWithOtp.mockRejectedValue(
				new Error("Internal server error"),
			);

			const request = new NextRequest("http://localhost:3000/api/auth", {
				body: JSON.stringify({ email }),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toContain("Internal server error");
		});
	});

	describe("GET /api/auth (Session Check)", () => {
		it("should return user session when authenticated", async () => {
			const mockSession = {
				access_token: "mock-token",
				user: {
					email: "test@example.com",
					id: "123",
					user_metadata: { full_name: "Test User" },
				},
			};

			mockSupabaseClient.auth.getSession.mockResolvedValue({
				data: { session: mockSession },
				error: null,
			});

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.session).toEqual(mockSession);
		});

		it("should return null when not authenticated", async () => {
			mockSupabaseClient.auth.getSession.mockResolvedValue({
				data: { session: null },
				error: null,
			});

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.session).toBeNull();
		});

		it("should handle authentication errors", async () => {
			mockSupabaseClient.auth.getSession.mockResolvedValue({
				data: { session: null },
				error: { message: "Authentication failed" },
			});

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("Authentication failed");
		});
	});

	describe("Request Validation", () => {
		it("should handle malformed JSON", async () => {
			const request = new NextRequest("http://localhost:3000/api/auth", {
				body: "invalid-json",
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toContain("Internal server error");
		});
	});
});
