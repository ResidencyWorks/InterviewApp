/**
 * Integration Tests: Upload API Route
 * Tests the complete upload flow including validation, storage, and database operations
 *
 * @file tests/integration/api/upload/route.test.ts
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/upload/route";
import { validateUploadPermission } from "@/features/auth/application/entitlements/upload-permissions";
import { uploadFile } from "@/features/booking/infrastructure/storage/supabase-storage";

// Set test timeout
vi.setConfig({ testTimeout: 10000 });

// Mock Supabase client
const mockSupabaseClient = {
	from: vi.fn(() => ({
		insert: vi.fn(() => ({
			error: null,
		})),
		update: vi.fn(() => ({
			eq: vi.fn(() => ({
				error: null,
			})),
		})),
	})),
	storage: {
		from: vi.fn(() => ({
			upload: vi.fn(() => ({
				error: null,
			})),
		})),
	},
};

// Mock dependencies
vi.mock("@/features/booking/infrastructure/storage/supabase-storage", () => ({
	uploadFile: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/features/auth/application/entitlements/upload-permissions", () => ({
	validateUploadPermission: vi.fn(() => Promise.resolve()),
}));

vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => mockSupabaseClient),
}));

describe("Upload API Route Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("POST /api/upload", () => {
		it("should successfully upload a valid audio file", async () => {
			// Create mock file
			const mockFile = new File(["audio content"], "test.webm", {
				type: "audio/webm;codecs=opus",
			});

			// Create form data
			const formData = new FormData();
			formData.append("file", mockFile);
			formData.append("sessionId", "session-123");
			formData.append("questionId", "question-456");
			formData.append("duration", "30");
			formData.append("userId", "550e8400-e29b-41d4-a716-446655440000");

			// Create mock request
			const request = {
				formData: vi.fn().mockResolvedValue(formData),
			} as unknown as NextRequest;

			// Execute
			const response = await POST(request);
			const result = await response.json();

			// Assertions
			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.recordingId).toBeDefined();
			expect(result.status).toBe("recording");
		});

		it("should reject upload without file", async () => {
			const formData = new FormData();
			formData.append("sessionId", "session-123");
			formData.append("questionId", "question-456");
			formData.append("duration", "30");

			const request = new NextRequest("http://localhost:3000/api/upload", {
				method: "POST",
				body: formData,
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error.code).toBe("INVALID_FILE");
		});

		it("should reject file that exceeds size limit", async () => {
			// Create large file (simulate > 10MB)
			const largeContent = "x".repeat(11 * 1024 * 1024); // 11MB
			const mockFile = new File([largeContent], "large.webm", {
				type: "audio/webm;codecs=opus",
			});

			const formData = new FormData();
			formData.append("file", mockFile);
			formData.append("sessionId", "session-123");
			formData.append("questionId", "question-456");
			formData.append("duration", "30");

			const request = {
				formData: vi.fn().mockResolvedValue(formData),
			} as unknown as NextRequest;

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error.code).toBe("VALIDATION_ERROR");
		});

		it("should reject file with invalid MIME type", async () => {
			const mockFile = new File(["content"], "test.txt", {
				type: "text/plain",
			});

			const formData = new FormData();
			formData.append("file", mockFile);
			formData.append("sessionId", "session-123");
			formData.append("questionId", "question-456");
			formData.append("duration", "30");

			const request = {
				formData: vi.fn().mockResolvedValue(formData),
			} as unknown as NextRequest;

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error.code).toBe("VALIDATION_ERROR");
		});

		it("should reject recording duration exceeding 90 seconds", async () => {
			const mockFile = new File(["audio content"], "test.webm", {
				type: "audio/webm;codecs=opus",
			});

			const formData = new FormData();
			formData.append("file", mockFile);
			formData.append("sessionId", "session-123");
			formData.append("questionId", "question-456");
			formData.append("duration", "120"); // Exceeds 90 seconds

			const request = {
				formData: vi.fn().mockResolvedValue(formData),
			} as unknown as NextRequest;

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error.code).toBe("VALIDATION_ERROR");
		});

		it("should handle storage upload failure", async () => {
			// Mock storage failure
			vi.mocked(uploadFile).mockResolvedValue({
				success: false,
				error: "Storage quota exceeded",
			});

			const mockFile = new File(["audio content"], "test.webm", {
				type: "audio/webm;codecs=opus",
			});

			const formData = new FormData();
			formData.append("file", mockFile);
			formData.append("sessionId", "session-123");
			formData.append("questionId", "question-456");
			formData.append("duration", "30");
			formData.append("userId", "550e8400-e29b-41d4-a716-446655440000");

			const request = {
				formData: vi.fn().mockResolvedValue(formData),
			} as unknown as NextRequest;

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error.code).toBe("UPLOAD_ERROR");
		});

		it("should handle permission validation failure", async () => {
			// Mock permission failure
			vi.mocked(validateUploadPermission).mockRejectedValue(
				new Error("User does not have permission"),
			);

			const mockFile = new File(["audio content"], "test.webm", {
				type: "audio/webm;codecs=opus",
			});

			const formData = new FormData();
			formData.append("file", mockFile);
			formData.append("sessionId", "session-123");
			formData.append("questionId", "question-456");
			formData.append("duration", "30");
			formData.append("userId", "550e8400-e29b-41d4-a716-446655440000");

			const request = {
				formData: vi.fn().mockResolvedValue(formData),
			} as unknown as NextRequest;

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(403);
			expect(result.success).toBe(false);
			expect(result.error.code).toBe("PERMISSION_DENIED");
		});
	});
});
