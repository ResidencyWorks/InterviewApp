/**
 * IContentPackRepository Interface
 *
 * Defines the contract for content pack data persistence operations.
 * This interface follows the Repository pattern to abstract data access
 * and enable different implementations (Supabase, filesystem, etc.).
 */

import type { ContentPack } from "../entities/ContentPack";

export interface IContentPackRepository {
	/**
	 * Saves a content pack to the repository
	 * @param contentPack The content pack to save
	 * @returns Promise resolving to the saved content pack
	 */
	save(contentPack: ContentPack): Promise<ContentPack>;

	/**
	 * Finds a content pack by its ID
	 * @param id The content pack ID
	 * @returns Promise resolving to the content pack or null if not found
	 */
	findById(id: string): Promise<ContentPack | null>;

	/**
	 * Finds all content packs with optional filtering
	 * @param options Filtering and pagination options
	 * @returns Promise resolving to an array of content packs
	 */
	findAll(options?: FindContentPacksOptions): Promise<ContentPack[]>;

	/**
	 * Finds the currently active content pack
	 * @returns Promise resolving to the active content pack or null if none
	 */
	findActive(): Promise<ContentPack | null>;

	/**
	 * Updates an existing content pack
	 * @param id The content pack ID
	 * @param updates Partial content pack data to update
	 * @returns Promise resolving to the updated content pack or null if not found
	 */
	update(
		id: string,
		updates: Partial<ContentPack>,
	): Promise<ContentPack | null>;

	/**
	 * Deletes a content pack by ID
	 * @param id The content pack ID
	 * @returns Promise resolving to true if deleted, false if not found
	 */
	delete(id: string): Promise<boolean>;

	/**
	 * Archives all content packs except the specified one
	 * Used when activating a new content pack
	 * @param excludeId The content pack ID to exclude from archiving
	 * @returns Promise resolving to the number of archived content packs
	 */
	archiveAllExcept(excludeId: string): Promise<number>;

	/**
	 * Checks if a content pack exists by ID
	 * @param id The content pack ID
	 * @returns Promise resolving to true if exists, false otherwise
	 */
	exists(id: string): Promise<boolean>;

	/**
	 * Counts content packs with optional filtering
	 * @param options Filtering options
	 * @returns Promise resolving to the count
	 */
	count(options?: CountContentPacksOptions): Promise<number>;
}

export interface FindContentPacksOptions {
	status?: string;
	uploadedBy?: string;
	limit?: number;
	offset?: number;
	sortBy?: "createdAt" | "updatedAt" | "name" | "version";
	sortOrder?: "asc" | "desc";
}

export interface CountContentPacksOptions {
	status?: string;
	uploadedBy?: string;
}

/**
 * Repository operation result for operations that might fail
 */
export interface RepositoryResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Pagination metadata for list operations
 */
export interface PaginationMetadata {
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
}

/**
 * Extended repository interface with pagination support
 */
export interface IPaginatedContentPackRepository
	extends IContentPackRepository {
	/**
	 * Finds content packs with pagination metadata
	 * @param options Filtering and pagination options
	 * @returns Promise resolving to paginated results
	 */
	findWithPagination(options?: FindContentPacksOptions): Promise<{
		data: ContentPack[];
		pagination: PaginationMetadata;
	}>;
}
