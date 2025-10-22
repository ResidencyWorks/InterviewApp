/**
 * SupabaseContentPackRepository
 *
 * Implements content pack persistence using Supabase PostgreSQL.
 * Provides full CRUD operations with proper error handling and
 * connection management.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tables } from "@/types/database";
import {
	type ContentPack,
	ContentPackStatus,
} from "../../domain/entities/ContentPack";
import {
	type CountContentPacksOptions,
	type FindContentPacksOptions,
	type IContentPackRepository,
	RepositoryResult,
} from "../../domain/repositories/IContentPackRepository";

// Use the generated database types instead of custom interface
type SupabaseContentPack = Tables<"content_packs">;

export class SupabaseContentPackRepository implements IContentPackRepository {
	constructor(private supabase: SupabaseClient) {}

	/**
	 * Saves a content pack to Supabase
	 */
	async save(contentPack: ContentPack): Promise<ContentPack> {
		try {
			const supabaseData: Omit<SupabaseContentPack, "id"> = {
				version: contentPack.version,
				name: contentPack.name,
				description: contentPack.description ?? null,
				schema_version: contentPack.schemaVersion,
				content: contentPack.content as any, // ContentPackData to Json
				metadata: contentPack.metadata as any, // ContentPackMetadata to Json
				status: contentPack.status,
				is_active: contentPack.status === "activated",
				created_at: contentPack.createdAt.toISOString(),
				updated_at: contentPack.updatedAt.toISOString(),
				activated_at: contentPack.activatedAt?.toISOString() ?? null,
				activated_by: contentPack.activatedBy ?? null,
				uploaded_by: contentPack.uploadedBy,
				file_size: contentPack.fileSize,
				checksum: contentPack.checksum,
			};

			const { data, error } = await this.supabase
				.from("content_packs")
				.insert(supabaseData)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to save content pack: ${error.message}`);
			}

			return this.mapSupabaseToContentPack(data);
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Finds a content pack by ID
	 */
	async findById(id: string): Promise<ContentPack | null> {
		try {
			const { data, error } = await this.supabase
				.from("content_packs")
				.select("*")
				.eq("id", id)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					return null; // Not found
				}
				throw new Error(`Failed to find content pack: ${error.message}`);
			}

			return this.mapSupabaseToContentPack(data);
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Finds all content packs with optional filtering
	 */
	async findAll(options: FindContentPacksOptions = {}): Promise<ContentPack[]> {
		try {
			let query = this.supabase.from("content_packs").select("*");

			// Apply filters
			if (options.status) {
				query = query.eq("status", options.status);
			}

			if (options.uploadedBy) {
				query = query.eq("uploaded_by", options.uploadedBy);
			}

			// Apply sorting
			const sortBy = options.sortBy || "created_at";
			const sortOrder = options.sortOrder || "desc";
			query = query.order(sortBy, { ascending: sortOrder === "asc" });

			// Apply pagination
			if (options.limit) {
				query = query.limit(options.limit);
			}

			if (options.offset) {
				query = query.range(
					options.offset,
					options.offset + (options.limit || 20) - 1,
				);
			}

			const { data, error } = await query;

			if (error) {
				throw new Error(`Failed to find content packs: ${error.message}`);
			}

			return data.map((item) => this.mapSupabaseToContentPack(item));
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Finds the currently active content pack
	 */
	async findActive(): Promise<ContentPack | null> {
		try {
			const { data, error } = await this.supabase
				.from("content_packs")
				.select("*")
				.eq("status", ContentPackStatus.ACTIVATED)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					return null; // No active content pack
				}
				throw new Error(`Failed to find active content pack: ${error.message}`);
			}

			return this.mapSupabaseToContentPack(data);
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Updates an existing content pack
	 */
	async update(
		id: string,
		updates: Partial<ContentPack>,
	): Promise<ContentPack | null> {
		try {
			const supabaseUpdates: Partial<SupabaseContentPack> = {};

			if (updates.version !== undefined)
				supabaseUpdates.version = updates.version;
			if (updates.name !== undefined) supabaseUpdates.name = updates.name;
			if (updates.description !== undefined)
				supabaseUpdates.description = updates.description;
			if (updates.schemaVersion !== undefined)
				supabaseUpdates.schema_version = updates.schemaVersion;
			if (updates.content !== undefined)
				supabaseUpdates.content = updates.content as any; // ContentPackData to Json
			if (updates.metadata !== undefined)
				supabaseUpdates.metadata = updates.metadata as any; // ContentPackMetadata to Json
			if (updates.status !== undefined) supabaseUpdates.status = updates.status;
			if (updates.activatedAt !== undefined)
				supabaseUpdates.activated_at =
					updates.activatedAt?.toISOString() ?? null;
			if (updates.activatedBy !== undefined)
				supabaseUpdates.activated_by = updates.activatedBy ?? null;
			if (updates.fileSize !== undefined)
				supabaseUpdates.file_size = updates.fileSize;
			if (updates.checksum !== undefined)
				supabaseUpdates.checksum = updates.checksum;

			supabaseUpdates.updated_at = new Date().toISOString();

			const { data, error } = await this.supabase
				.from("content_packs")
				.update(supabaseUpdates)
				.eq("id", id)
				.select()
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					return null; // Not found
				}
				throw new Error(`Failed to update content pack: ${error.message}`);
			}

			return this.mapSupabaseToContentPack(data);
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Deletes a content pack by ID
	 */
	async delete(id: string): Promise<boolean> {
		try {
			const { error } = await this.supabase
				.from("content_packs")
				.delete()
				.eq("id", id);

			if (error) {
				throw new Error(`Failed to delete content pack: ${error.message}`);
			}

			return true;
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Archives all content packs except the specified one
	 */
	async archiveAllExcept(excludeId: string): Promise<number> {
		try {
			const { data, error } = await this.supabase
				.from("content_packs")
				.update({
					status: ContentPackStatus.ARCHIVED,
					updated_at: new Date().toISOString(),
				})
				.neq("id", excludeId)
				.neq("status", ContentPackStatus.ARCHIVED)
				.select("id");

			if (error) {
				throw new Error(`Failed to archive content packs: ${error.message}`);
			}

			return data?.length || 0;
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Checks if a content pack exists by ID
	 */
	async exists(id: string): Promise<boolean> {
		try {
			const { data, error } = await this.supabase
				.from("content_packs")
				.select("id")
				.eq("id", id)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					return false; // Not found
				}
				throw new Error(
					`Failed to check content pack existence: ${error.message}`,
				);
			}

			return !!data;
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Counts content packs with optional filtering
	 */
	async count(options: CountContentPacksOptions = {}): Promise<number> {
		try {
			let query = this.supabase
				.from("content_packs")
				.select("id", { count: "exact", head: true });

			// Apply filters
			if (options.status) {
				query = query.eq("status", options.status);
			}

			if (options.uploadedBy) {
				query = query.eq("uploaded_by", options.uploadedBy);
			}

			const { count, error } = await query;

			if (error) {
				throw new Error(`Failed to count content packs: ${error.message}`);
			}

			return count || 0;
		} catch (error) {
			throw new Error(
				`Repository error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Maps Supabase data to ContentPack entity
	 */
	private mapSupabaseToContentPack(data: SupabaseContentPack): ContentPack {
		return {
			id: data.id,
			version: data.version,
			name: data.name,
			description: data.description ?? undefined,
			schemaVersion: data.schema_version,
			content: data.content as any, // Json to ContentPackData
			metadata: data.metadata as any, // Json to ContentPackMetadata
			status: data.status as ContentPackStatus,
			createdAt: new Date(data.created_at!),
			updatedAt: new Date(data.updated_at!),
			activatedAt: data.activated_at ? new Date(data.activated_at) : undefined,
			activatedBy: data.activated_by ?? undefined,
			uploadedBy: data.uploaded_by!,
			fileSize: data.file_size!,
			checksum: data.checksum!,
		};
	}
}

/**
 * Factory function to create a SupabaseContentPackRepository
 */
export function createSupabaseContentPackRepository(
	supabase: SupabaseClient,
): SupabaseContentPackRepository {
	return new SupabaseContentPackRepository(supabase);
}
