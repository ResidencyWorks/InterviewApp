/**
 * IContentPackService interface for content pack management
 *
 * @fileoverview Domain interface for content pack service abstraction
 */

import type { ContentPack, ContentPackStatus } from "../entities/ContentPack";
import type { LoadEvent } from "../entities/LoadEvent";

/**
 * Content pack service interface for managing content pack lifecycle
 */
export interface IContentPackService {
	/**
	 * Get the currently active content pack
	 * @returns Promise resolving to active content pack or null
	 */
	getActiveContentPack(): Promise<ContentPack | null>;

	/**
	 * Activate a content pack (hot-swap)
	 * @param contentPackId - ID of the content pack to activate
	 * @param userId - User ID who is activating the pack
	 * @returns Promise resolving to the activated content pack
	 */
	activateContentPack(
		contentPackId: string,
		userId: string,
	): Promise<ContentPack>;

	/**
	 * Deactivate the current content pack
	 * @param userId - User ID who is deactivating the pack
	 * @returns Promise resolving to the deactivated content pack or null
	 */
	deactivateContentPack(userId: string): Promise<ContentPack | null>;

	/**
	 * Get content pack by ID
	 * @param id - Content pack ID
	 * @returns Promise resolving to content pack or null
	 */
	getContentPack(id: string): Promise<ContentPack | null>;

	/**
	 * List content packs with optional filtering
	 * @param filters - Optional filters
	 * @returns Promise resolving to array of content packs
	 */
	listContentPacks(filters?: ContentPackFilters): Promise<ContentPack[]>;

	/**
	 * Archive a content pack
	 * @param contentPackId - ID of the content pack to archive
	 * @param userId - User ID who is archiving the pack
	 * @returns Promise resolving to the archived content pack
	 */
	archiveContentPack(
		contentPackId: string,
		userId: string,
	): Promise<ContentPack>;

	/**
	 * Get content pack statistics
	 * @param contentPackId - ID of the content pack
	 * @returns Promise resolving to statistics object
	 */
	getContentPackStatistics(
		contentPackId: string,
	): Promise<ContentPackStatistics | null>;

	/**
	 * Validate content pack before activation
	 * @param contentPackId - ID of the content pack to validate
	 * @returns Promise resolving to validation result
	 */
	validateContentPack(
		contentPackId: string,
	): Promise<ContentPackValidationResult>;
}

/**
 * Content pack filters for listing
 */
export interface ContentPackFilters {
	status?: ContentPackStatus;
	uploadedBy?: string;
	createdAfter?: Date;
	createdBefore?: Date;
	limit?: number;
	offset?: number;
}

/**
 * Content pack statistics
 */
export interface ContentPackStatistics {
	id: string;
	version: string;
	name: string;
	status: ContentPackStatus;
	fileSize: number;
	createdAt: Date;
	activatedAt?: Date;
	activatedBy?: string;
	uploadedBy: string;
	validationTimeMs?: number;
	activationTimeMs?: number;
	usageCount?: number;
	lastUsedAt?: Date;
}

/**
 * Content pack validation result
 */
export interface ContentPackValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	validatedAt: Date;
	validatedBy: string;
	validationTimeMs: number;
}

/**
 * Content pack activation result
 */
export interface ContentPackActivationResult {
	success: boolean;
	contentPack: ContentPack;
	previousContentPack?: ContentPack;
	loadEvent: LoadEvent;
	activationTimeMs: number;
	errors?: string[];
}

/**
 * Content pack service configuration
 */
export interface ContentPackServiceConfig {
	cacheEnabled: boolean;
	cacheTtl: number; // Time to live in milliseconds
	maxConcurrentActivations: number;
	validationTimeout: number; // Timeout in milliseconds
	enableAnalytics: boolean;
}
