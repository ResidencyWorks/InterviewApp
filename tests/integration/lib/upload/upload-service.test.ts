/**
 * Integration Tests: Upload Service
 * Tests the upload service orchestration including progress tracking and retry logic
 *
 * @file tests/integration/lib/upload/upload-service.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	logUploadCompleted,
	logUploadFailed,
	logUploadProgress,
	logUploadStarted,
} from "@/features/booking/application/upload/analytics";
import { captureUploadError } from "@/features/booking/application/upload/errors";
import { retryWithBackoff } from "@/features/booking/application/upload/retry-logic";
import type { UploadOptions } from "@/features/booking/application/upload/upload-service";
import {
	uploadFileWithFetchProgress,
	uploadWithProgress,
} from "@/features/booking/application/upload/upload-service";
import { uploadFile } from "@/features/booking/infrastructure/storage/supabase-storage";

// Mock dependencies
vi.mock("@/features/booking/infrastructure/storage/supabase-storage", () => ({
	uploadFile: vi.fn(),
}));

vi.mock("@/features/booking/application/upload/retry-logic", () => ({
	retryWithBackoff: vi.fn(),
}));

vi.mock("@/features/booking/application/upload/analytics", () => ({
	logUploadStarted: vi.fn(),
	logUploadProgress: vi.fn(),
	logUploadCompleted: vi.fn(),
	logUploadFailed: vi.fn(),
}));

vi.mock("@/features/booking/application/upload/errors", () => ({
	captureUploadError: vi.fn(),
}));

describe("Upload Service Integration Tests", () => {
	let mockFile: File;
	let mockOptions: UploadOptions;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock file
		mockFile = new File(["test content"], "test.webm", {
			type: "audio/webm;codecs=opus",
		});

		mockOptions = {
			file: mockFile,
			storagePath: "user-123/recording-456.webm",
			recordingId: "recording-456",
			userId: "user-123",
			onProgress: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("uploadWithProgress", () => {
		it("should successfully upload file with progress tracking", async () => {
			// Mock successful upload
			vi.mocked(uploadFile).mockResolvedValue({
				success: true,
			});

			vi.mocked(retryWithBackoff).mockImplementation(
				async (fn: () => Promise<unknown>) => fn(),
			);

			// Execute
			const result = await uploadWithProgress(mockOptions);

			// Assertions
			expect(result.success).toBe(true);
			expect(result.recordingId).toBe("recording-456");
			expect(result.error).toBeUndefined();

			// Verify progress callback was called
			expect(mockOptions.onProgress).toHaveBeenCalledWith(0, 0, mockFile.size);
			expect(mockOptions.onProgress).toHaveBeenCalledWith(
				100,
				mockFile.size,
				mockFile.size,
			);

			// Verify analytics events
			expect(logUploadStarted).toHaveBeenCalledWith(
				"recording-456",
				mockFile.size,
			);
			expect(logUploadProgress).toHaveBeenCalledWith("recording-456", 100);
			expect(logUploadCompleted).toHaveBeenCalledWith(
				"recording-456",
				expect.any(Number),
			);
		});

		it("should handle upload failure with retry logic", async () => {
			// Mock upload failure
			vi.mocked(uploadFile).mockResolvedValue({
				success: false,
				error: "Network error",
			});

			vi.mocked(retryWithBackoff).mockRejectedValue(
				new Error("Upload failed after retries"),
			);

			// Execute
			const result = await uploadWithProgress(mockOptions);

			// Assertions
			expect(result.success).toBe(false);
			expect(result.error).toBe("Upload failed after retries");
			expect(result.recordingId).toBeUndefined();

			// Verify error handling
			expect(logUploadFailed).toHaveBeenCalledWith(
				"recording-456",
				"UPLOAD_ERROR",
				1,
			);
			expect(captureUploadError).toHaveBeenCalled();
		});

		it("should track upload duration", async () => {
			// Mock successful upload with delay
			vi.mocked(uploadFile).mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 110));
				return { success: true };
			});

			vi.mocked(retryWithBackoff).mockImplementation(
				async (fn: () => Promise<unknown>) => fn(),
			);

			// Execute
			const result = await uploadWithProgress(mockOptions);

			// Assertions
			expect(result.success).toBe(true);

			// Verify duration was logged
			expect(logUploadCompleted).toHaveBeenCalledWith(
				"recording-456",
				expect.any(Number),
			);

			const loggedDuration = vi.mocked(logUploadCompleted).mock.calls[0][1];
			// Allow for timing precision - should be close to 110ms
			expect(loggedDuration).toBeGreaterThanOrEqual(100);
		});
	});

	describe("uploadFileWithFetchProgress", () => {
		it("should upload file with XMLHttpRequest progress tracking", async () => {
			const mockXHR = {
				upload: {
					addEventListener: vi.fn(),
				},
				addEventListener: vi.fn(),
				open: vi.fn(),
				setRequestHeader: vi.fn(),
				send: vi.fn(),
				status: 200,
			};

			// Mock XMLHttpRequest
			vi.stubGlobal("XMLHttpRequest", function MockXHR() {
				return mockXHR;
			});

			const progressCallback = vi.fn();

			// Execute
			const uploadPromise = uploadFileWithFetchProgress(
				mockFile,
				"http://localhost:3000/api/upload",
				progressCallback,
			);

			// Simulate progress events
			const progressEvent = {
				lengthComputable: true,
				loaded: 50,
				total: 100,
			};

			const loadEvent = {
				status: 200,
			};

			// Trigger progress event
			const progressHandler = mockXHR.upload.addEventListener.mock.calls.find(
				(call) => call[0] === "progress",
			)?.[1];
			progressHandler?.(progressEvent);

			// Trigger load event
			const loadHandler = mockXHR.addEventListener.mock.calls.find(
				(call) => call[0] === "load",
			)?.[1];
			loadHandler?.(loadEvent);

			await uploadPromise;

			// Assertions
			expect(mockXHR.open).toHaveBeenCalledWith(
				"PUT",
				"http://localhost:3000/api/upload",
			);
			expect(mockXHR.setRequestHeader).toHaveBeenCalledWith(
				"Content-Type",
				"audio/webm;codecs=opus",
			);
			expect(mockXHR.send).toHaveBeenCalledWith(mockFile);
			expect(progressCallback).toHaveBeenCalledWith(50, 50);
		});

		it("should handle upload error", async () => {
			const mockXHR = {
				upload: {
					addEventListener: vi.fn(),
				},
				addEventListener: vi.fn(),
				open: vi.fn(),
				setRequestHeader: vi.fn(),
				send: vi.fn(),
			};

			vi.stubGlobal("XMLHttpRequest", function MockXHR() {
				return mockXHR;
			});

			const uploadPromise = uploadFileWithFetchProgress(
				mockFile,
				"http://localhost:3000/api/upload",
			);

			// Trigger error event
			const errorHandler = mockXHR.addEventListener.mock.calls.find(
				(call) => call[0] === "error",
			)?.[1];
			errorHandler?.();

			// Assertions
			await expect(uploadPromise).rejects.toThrow("Upload failed");
		});

		it("should handle upload abort", async () => {
			const mockXHR = {
				upload: {
					addEventListener: vi.fn(),
				},
				addEventListener: vi.fn(),
				open: vi.fn(),
				setRequestHeader: vi.fn(),
				send: vi.fn(),
			};

			vi.stubGlobal("XMLHttpRequest", function MockXHR() {
				return mockXHR;
			});

			const uploadPromise = uploadFileWithFetchProgress(
				mockFile,
				"http://localhost:3000/api/upload",
			);

			// Trigger abort event
			const abortHandler = mockXHR.addEventListener.mock.calls.find(
				(call) => call[0] === "abort",
			)?.[1];
			abortHandler?.();

			// Assertions
			await expect(uploadPromise).rejects.toThrow("Upload aborted");
		});

		it("should handle HTTP error status", async () => {
			const mockXHR = {
				upload: {
					addEventListener: vi.fn(),
				},
				addEventListener: vi.fn(),
				open: vi.fn(),
				setRequestHeader: vi.fn(),
				send: vi.fn(),
				status: 500,
			};

			vi.stubGlobal("XMLHttpRequest", function MockXHR() {
				return mockXHR;
			});

			const uploadPromise = uploadFileWithFetchProgress(
				mockFile,
				"http://localhost:3000/api/upload",
			);

			// Trigger load event with error status
			const loadHandler = mockXHR.addEventListener.mock.calls.find(
				(call) => call[0] === "load",
			)?.[1];
			loadHandler?.();

			// Assertions
			await expect(uploadPromise).rejects.toThrow(
				"Upload failed with status 500",
			);
		});
	});
});
