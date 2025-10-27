/**
 * Unit tests for Recording Domain Model
 *
 * @file tests/unit/models/recording.test.ts
 */

import { describe, expect, it } from "vitest";
import {
	createRecording,
	isRecordingExpired,
	isValidDuration,
	isValidFileSize,
	isValidMimeType,
	updateRecordingStatus,
} from "@/models/recording";

describe("Recording Model", () => {
	const baseParams = {
		id: "test-id",
		userId: "user-123",
		sessionId: "session-456",
		questionId: "question-789",
		fileName: "test.webm",
		mimeType: "audio/webm",
		fileSize: 1024 * 1024, // 1MB
		duration: 30,
		storagePath: "user-123/test.webm",
		recordedAt: new Date("2024-01-01T00:00:00Z"),
	};

	describe("createRecording", () => {
		it("should create a recording with default values", () => {
			const recording = createRecording(baseParams);

			expect(recording.id).toBe("test-id");
			expect(recording.userId).toBe("user-123");
			expect(recording.sessionId).toBe("session-456");
			expect(recording.questionId).toBe("question-789");
			expect(recording.fileName).toBe("test.webm");
			expect(recording.mimeType).toBe("audio/webm");
			expect(recording.fileSize).toBe(1024 * 1024);
			expect(recording.duration).toBe(30);
			expect(recording.storagePath).toBe("user-123/test.webm");
			expect(recording.recordedAt).toEqual(new Date("2024-01-01T00:00:00Z"));
		});

		it("should set status to 'recording' by default", () => {
			const recording = createRecording(baseParams);

			expect(recording.status).toBe("recording");
		});

		it("should set uploadAttempts to 0", () => {
			const recording = createRecording(baseParams);

			expect(recording.uploadAttempts).toBe(0);
		});

		it("should set uploadDuration to 0", () => {
			const recording = createRecording(baseParams);

			expect(recording.uploadDuration).toBe(0);
		});

		it("should set uploadedAt to current time", () => {
			const before = new Date();
			const recording = createRecording(baseParams);
			const after = new Date();

			expect(recording.uploadedAt.getTime()).toBeGreaterThanOrEqual(
				before.getTime(),
			);
			expect(recording.uploadedAt.getTime()).toBeLessThanOrEqual(
				after.getTime(),
			);
		});

		it("should set expiresAt to 30 days from now", () => {
			const recording = createRecording(baseParams);

			const now = new Date();
			const expectedExpiry = new Date(now);
			expectedExpiry.setDate(expectedExpiry.getDate() + 30);

			expect(recording.expiresAt.getTime()).toBeGreaterThanOrEqual(
				expectedExpiry.getTime() - 1000,
			);
			expect(recording.expiresAt.getTime()).toBeLessThanOrEqual(
				expectedExpiry.getTime() + 1000,
			);
		});
	});

	describe("updateRecordingStatus", () => {
		it("should update recording status", () => {
			const recording = createRecording(baseParams);
			const updated = updateRecordingStatus(recording, "uploading");

			expect(updated.status).toBe("uploading");
			expect(recording.status).toBe("recording"); // Original should not change
		});

		it("should update with error message", () => {
			const recording = createRecording(baseParams);
			const updated = updateRecordingStatus(
				recording,
				"failed",
				"Upload failed",
			);

			expect(updated.status).toBe("failed");
			expect(updated.errorMessage).toBe("Upload failed");
		});

		it("should update uploadedAt when status is 'completed'", () => {
			const recording = createRecording(baseParams);
			const oldUploadedAt = recording.uploadedAt;

			// Set uploadedAt to past to test update
			recording.uploadedAt = new Date(oldUploadedAt.getTime() - 1000);

			const updated = updateRecordingStatus(recording, "completed");

			expect(updated.status).toBe("completed");
			// Should be updated to a more recent time
			expect(updated.uploadedAt.getTime()).toBeGreaterThan(
				oldUploadedAt.getTime() - 1000,
			);
		});

		it("should not update uploadedAt for other statuses", () => {
			const recording = createRecording(baseParams);
			const oldUploadedAt = recording.uploadedAt;

			const updated = updateRecordingStatus(recording, "uploading");

			expect(updated.uploadedAt).toEqual(oldUploadedAt);
		});

		it("should clear errorMessage when not provided", () => {
			const recording = createRecording(baseParams);
			const withError = updateRecordingStatus(recording, "failed", "Error");

			expect(withError.errorMessage).toBe("Error");

			const withoutError = updateRecordingStatus(withError, "completed");

			expect(withoutError.errorMessage).toBeUndefined();
		});
	});

	describe("isRecordingExpired", () => {
		it("should return false for future expiry", () => {
			const recording = createRecording(baseParams);

			expect(isRecordingExpired(recording)).toBe(false);
		});

		it("should return true for past expiry", () => {
			const recording = createRecording(baseParams);
			// Set expiry to past
			recording.expiresAt = new Date("2020-01-01T00:00:00Z");

			expect(isRecordingExpired(recording)).toBe(true);
		});

		it("should return true for exactly now expiry", () => {
			const recording = createRecording(baseParams);
			// Set expiry to 1ms in the past to ensure expired
			recording.expiresAt = new Date(Date.now() - 1);

			expect(isRecordingExpired(recording)).toBe(true);
		});
	});

	describe("isValidDuration", () => {
		it("should return true for valid duration (1-90 seconds)", () => {
			expect(isValidDuration(1)).toBe(true);
			expect(isValidDuration(45)).toBe(true);
			expect(isValidDuration(90)).toBe(true);
		});

		it("should return false for zero duration", () => {
			expect(isValidDuration(0)).toBe(false);
		});

		it("should return false for negative duration", () => {
			expect(isValidDuration(-1)).toBe(false);
		});

		it("should return false for duration exceeding 90 seconds", () => {
			expect(isValidDuration(91)).toBe(false);
			expect(isValidDuration(100)).toBe(false);
		});
	});

	describe("isValidFileSize", () => {
		it("should return true for valid file sizes (< 10MB)", () => {
			expect(isValidFileSize(1)).toBe(true);
			expect(isValidFileSize(1024)).toBe(true);
			expect(isValidFileSize(5_000_000)).toBe(true); // 5MB
			expect(isValidFileSize(9_999_999)).toBe(true);
		});

		it("should return false for zero size", () => {
			expect(isValidFileSize(0)).toBe(false);
		});

		it("should return false for negative size", () => {
			expect(isValidFileSize(-1)).toBe(false);
		});

		it("should return false for size >= 10MB", () => {
			expect(isValidFileSize(10_000_000)).toBe(false); // Exactly 10MB
			expect(isValidFileSize(10_000_001)).toBe(false);
			expect(isValidFileSize(100_000_000)).toBe(false); // 100MB
		});
	});

	describe("isValidMimeType", () => {
		it("should return true for valid audio MIME types", () => {
			expect(isValidMimeType("audio/webm")).toBe(true);
			expect(isValidMimeType("audio/ogg")).toBe(true);
			expect(isValidMimeType("audio/mp4")).toBe(true);
		});

		it("should return false for invalid MIME types", () => {
			expect(isValidMimeType("audio/mpeg")).toBe(false);
			expect(isValidMimeType("audio/wav")).toBe(false);
			expect(isValidMimeType("video/webm")).toBe(false);
			expect(isValidMimeType("application/octet-stream")).toBe(false);
			expect(isValidMimeType("")).toBe(false);
		});

		it("should return false for non-string inputs", () => {
			// @ts-expect-error - Testing invalid input
			expect(isValidMimeType(null)).toBe(false);
			// @ts-expect-error - Testing invalid input
			expect(isValidMimeType(undefined)).toBe(false);
			// @ts-expect-error - Testing invalid input
			expect(isValidMimeType(123)).toBe(false);
		});
	});
});
