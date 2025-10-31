/**
 * Recording Domain Model
 * Represents a single audio recording created by a user during a drill practice session.
 *
 * @file src/models/recording.ts
 */

/**
 * Recording status lifecycle states
 */
export type RecordingStatus =
	| "recording"
	| "uploading"
	| "completed"
	| "failed"
	| "expired";

/**
 * Response type - audio or text
 */
export type ResponseType = "audio" | "text";

/**
 * Recording domain entity
 * Represents audio recording or text response metadata and lifecycle
 */
export interface Recording {
	/** Unique identifier (UUID v4) */
	id: string;

	/** User who created this recording */
	userId: string;

	/** Drill session identifier */
	sessionId: string;

	/** Question being answered */
	questionId: string;

	/** Response type: audio or text */
	responseType: ResponseType;

	/** File metadata (for audio responses) */
	fileName?: string;
	mimeType?: string;
	fileSize?: number;
	duration?: number;
	storagePath?: string;

	/** Text content (for text responses) */
	textContent?: string;

	/** Timestamps */
	recordedAt: Date;
	uploadedAt: Date;
	expiresAt: Date;

	/** Status and error information */
	status: RecordingStatus;
	errorMessage?: string;

	/** Analytics */
	uploadAttempts: number;
	uploadDuration: number;
}

/**
 * Create a new Recording instance
 *
 * @param params - Recording creation parameters
 * @returns New Recording instance
 */
export function createRecording(params: {
	id: string;
	userId: string;
	sessionId: string;
	questionId: string;
	responseType: ResponseType;
	// Audio response fields (optional)
	fileName?: string;
	mimeType?: string;
	fileSize?: number;
	duration?: number;
	storagePath?: string;
	// Text response fields (optional)
	textContent?: string;
	recordedAt: Date;
}): Recording {
	const now = new Date();
	const expiresAt = new Date(now);
	expiresAt.setDate(expiresAt.getDate() + 30);

	return {
		id: params.id,
		userId: params.userId,
		sessionId: params.sessionId,
		questionId: params.questionId,
		responseType: params.responseType,
		fileName: params.fileName,
		mimeType: params.mimeType,
		fileSize: params.fileSize,
		duration: params.duration,
		storagePath: params.storagePath,
		textContent: params.textContent,
		recordedAt: params.recordedAt,
		uploadedAt: now,
		expiresAt,
		status: "recording",
		uploadAttempts: 0,
		uploadDuration: 0,
	};
}

/**
 * Update recording status
 *
 * @param recording - Recording to update
 * @param status - New status
 * @param errorMessage - Optional error message
 * @returns Updated recording
 */
export function updateRecordingStatus(
	recording: Recording,
	status: RecordingStatus,
	errorMessage?: string,
): Recording {
	return {
		...recording,
		status,
		errorMessage,
		uploadedAt: status === "completed" ? new Date() : recording.uploadedAt,
	};
}

/**
 * Check if recording has expired
 *
 * @param recording - Recording to check
 * @returns True if expired
 */
export function isRecordingExpired(recording: Recording): boolean {
	return new Date() > recording.expiresAt;
}

/**
 * Validate recording duration (must be ≤ 90 seconds)
 *
 * @param duration - Duration in seconds
 * @returns True if valid
 */
export function isValidDuration(duration: number): boolean {
	return duration > 0 && duration <= 90;
}

/**
 * Validate file size (must be < 10MB)
 *
 * @param fileSize - File size in bytes
 * @returns True if valid
 */
export function isValidFileSize(fileSize: number): boolean {
	return fileSize > 0 && fileSize < 10_000_000;
}

/**
 * Validate MIME type (must be valid audio format)
 *
 * @param mimeType - MIME type string
 * @returns True if valid
 */
export function isValidMimeType(mimeType: string): boolean {
	return /^audio\/(webm|ogg|mp4)$/.test(mimeType);
}
