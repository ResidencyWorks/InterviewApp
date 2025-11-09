/**
 * ContentPack Entity
 *
 * Represents a content pack configuration file containing evaluation criteria,
 * content, and metadata for the InterviewApp system.
 *
 * Note: This entity should align with the database schema in types/database.ts
 */

export interface ContentPackData {
	// Structure depends on schema version
	// This is the validated JSON content from the uploaded file
	[key: string]: unknown;
}

export interface ContentPackMetadata {
	author?: string; // Content pack author
	tags?: string[]; // Categorization tags
	dependencies?: string[]; // Required system dependencies
	compatibility?: {
		// System compatibility info
		minVersion?: string;
		maxVersion?: string;
		features?: string[];
	};
	customFields?: Record<string, unknown>; // Additional custom metadata
}

export enum ContentPackStatus {
	UPLOADED = "uploaded", // Just uploaded, not validated
	VALIDATING = "validating", // Currently being validated
	VALID = "valid", // Validated successfully
	INVALID = "invalid", // Validation failed
	ACTIVATED = "activated", // Currently active in system
	ARCHIVED = "archived", // Replaced by newer version
}

export interface ContentPack {
	id: string; // UUID v4
	version: string; // Semantic version (e.g., "1.2.3")
	name: string; // Human-readable name
	description?: string; // Optional description
	schemaVersion: string; // Schema version for validation
	content: ContentPackData; // The actual content data
	metadata: ContentPackMetadata; // Additional metadata
	status: ContentPackStatus; // Current status
	createdAt: Date; // Creation timestamp
	updatedAt: Date; // Last update timestamp
	activatedAt?: Date; // When this pack was activated
	activatedBy?: string; // User ID who activated it
	uploadedBy: string; // User ID who uploaded it
	fileSize: number; // Original file size in bytes
	checksum: string; // SHA-256 hash of content
}

/**
 * Creates a new ContentPack instance with default values
 */
export function createContentPack(
	data: Omit<ContentPack, "id" | "createdAt" | "updatedAt" | "status">,
): ContentPack {
	const now = new Date();

	return {
		id: crypto.randomUUID(),
		createdAt: now,
		updatedAt: now,
		status: ContentPackStatus.UPLOADED,
		...data,
	};
}

/**
 * Updates a ContentPack with new data
 */
export function updateContentPack(
	contentPack: ContentPack,
	updates: Partial<Omit<ContentPack, "id" | "createdAt" | "uploadedBy">>,
): ContentPack {
	return {
		...contentPack,
		...updates,
		updatedAt: new Date(),
	};
}

/**
 * Transitions a ContentPack to a new status
 */
export function transitionContentPackStatus(
	contentPack: ContentPack,
	newStatus: ContentPackStatus,
	activatedBy?: string,
): ContentPack {
	const updates: Partial<ContentPack> = {
		status: newStatus,
		updatedAt: new Date(),
	};

	if (newStatus === ContentPackStatus.ACTIVATED) {
		updates.activatedAt = new Date();
		if (activatedBy) {
			updates.activatedBy = activatedBy;
		}
	}

	return updateContentPack(contentPack, updates);
}
