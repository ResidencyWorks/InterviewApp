/**
 * Upload Validation Schemas
 * Zod schemas for validating upload requests and responses
 *
 * @file src/lib/upload/schemas.ts
 */

import { z } from "zod";

/**
 * Recording status schema
 */
export const RecordingStatusSchema = z.enum([
	"recording",
	"uploading",
	"completed",
	"failed",
	"expired",
]);

/**
 * MIME type schema for audio files
 */
const AudioMimeTypeSchema = z.string().regex(/^audio\/(webm|ogg|mp4)$/);

/**
 * File validation schema
 */
export const FileSchema = z.object({
	name: z.string().min(1),
	type: AudioMimeTypeSchema,
	size: z.number().int().positive().max(10_000_000), // 10MB max
});

/**
 * Upload request schema
 */
export const UploadRequestSchema = z.object({
	file: z.instanceof(File),
	sessionId: z.string().min(1),
	questionId: z.string().min(1),
	duration: z.number().int().positive().max(90), // 90 seconds max
	userId: z.uuid().optional(),
});

/**
 * Upload response schema
 */
export const UploadResponseSchema = z.object({
	success: z.boolean(),
	recordingId: z.uuid().optional(),
	status: RecordingStatusSchema.optional(),
	fileSize: z.number().optional(),
	duration: z.number().optional(),
	uploadDuration: z.number().optional(),
	uploadAttempts: z.number().optional(),
	error: z
		.object({
			code: z.string(),
			message: z.string(),
		})
		.optional(),
});

/**
 * Validated upload request type
 */
export type ValidatedUploadRequest = z.infer<typeof UploadRequestSchema>;

/**
 * Validated upload response type
 */
export type ValidatedUploadResponse = z.infer<typeof UploadResponseSchema>;

/**
 * Validate file before upload
 *
 * @param file - File to validate
 * @returns Validation result
 */
export function validateFile(file: File): {
	valid: boolean;
	error?: string;
} {
	try {
		FileSchema.parse({
			name: file.name,
			type: file.type,
			size: file.size,
		});

		// Additional checks
		if (file.size === 0) {
			return { valid: false, error: "File is empty" };
		}

		if (file.size > 10_000_000) {
			return { valid: false, error: "File exceeds 10MB limit" };
		}

		return { valid: true };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				valid: false,
				error: error.issues.map((e) => e.message).join(", "),
			};
		}

		return { valid: false, error: "Unknown validation error" };
	}
}

/**
 * Validate upload request
 *
 * @param data - Request data to validate
 * @returns Validation result
 */
export function validateUploadRequest(data: unknown): {
	valid: boolean;
	data?: ValidatedUploadRequest;
	error?: string;
} {
	try {
		const validated = UploadRequestSchema.parse(data);
		return { valid: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				valid: false,
				error: error.issues.map((e) => e.message).join(", "),
			};
		}

		return { valid: false, error: "Unknown validation error" };
	}
}

/**
 * Text submission request schema
 */
export const TextSubmissionRequestSchema = z.object({
	textContent: z.string().min(10).max(5000), // 10-5000 characters
	sessionId: z.string().min(1),
	questionId: z.string().min(1),
	userId: z.uuid().optional(),
});

/**
 * Text submission response schema
 */
export const TextSubmissionResponseSchema = z.object({
	success: z.boolean(),
	recordingId: z.uuid().optional(),
	status: RecordingStatusSchema.optional(),
	textLength: z.number().optional(),
	error: z
		.object({
			code: z.string(),
			message: z.string(),
		})
		.optional(),
});

/**
 * Validated text submission request type
 */
export type ValidatedTextSubmissionRequest = z.infer<
	typeof TextSubmissionRequestSchema
>;

/**
 * Validated text submission response type
 */
export type ValidatedTextSubmissionResponse = z.infer<
	typeof TextSubmissionResponseSchema
>;

/**
 * Validate text submission request
 *
 * @param data - Request data to validate
 * @returns Validation result
 */
export function validateTextSubmissionRequest(data: unknown): {
	valid: boolean;
	data?: ValidatedTextSubmissionRequest;
	error?: string;
} {
	try {
		const validated = TextSubmissionRequestSchema.parse(data);
		return { valid: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				valid: false,
				error: error.issues.map((e) => e.message).join(", "),
			};
		}

		return { valid: false, error: "Unknown validation error" };
	}
}
