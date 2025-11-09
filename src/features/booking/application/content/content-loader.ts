import { v4 as uuidv4 } from "uuid";
import { getServerAuthService } from "@/features/auth/application/services/server-auth-service";
import { analytics } from "@/features/notifications/application/analytics";
import { errorMonitoring } from "@/features/scheduling/infrastructure/monitoring/error-monitoring";
import { contentPackCache } from "@/infrastructure/redis";
import type { ContentPack, ContentPackData } from "@/types/content";
import type {
	ContentLoadOptions,
	ContentPackServiceInterface,
	ContentValidationResult,
} from "./content-types";
import { contentPackValidator } from "./content-validator";

/**
 * Content pack loader service
 */
export class ContentPackLoader implements ContentPackServiceInterface {
	private activePackId: string | null = null;

	/**
	 * Load content pack from file
	 * @param file - File to load
	 * @param options - Loading options
	 * @returns Promise resolving to loaded content pack
	 */
	async load(
		file: File,
		options: ContentLoadOptions = {
			backup: false,
			overwrite: false,
			preview: false,
			validate: true,
		},
	): Promise<ContentPack> {
		try {
			// Read file content
			const text = await file.text();
			const data: ContentPackData = JSON.parse(text);

			// Validate if requested
			if (options.validate) {
				const validation = await contentPackValidator.validate(data);
				if (!validation.valid) {
					throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
				}
			}

			// Resolve current user for attribution
			let createdBy = "system";
			try {
				const auth = await getServerAuthService();
				const currentUser = await auth.getUser();
				createdBy = currentUser?.id || "system";
			} catch {
				// Fallback to system if auth is unavailable
				createdBy = "system";
			}

			// Create content pack
			const contentPack: ContentPack = {
				content: data,
				created_at: new Date().toISOString(),
				created_by: createdBy,
				download_count: 0,
				id: uuidv4(),
				is_active: false,
				is_public: false,
				name: data.name,
				reviews_count: 0,
				tags: data.metadata.tags,
				updated_at: new Date().toISOString(),
				version: data.version,
			};

			// Backup existing pack if requested
			if (options.backup && this.activePackId) {
				const existingPack = await this.get(this.activePackId);
				if (existingPack) {
					await this.backup(existingPack);
				}
			}

			// Save to cache
			await contentPackCache.set(contentPack.id, contentPack.content);

			// Set as active if not preview
			if (!options.preview) {
				await this.setActive(contentPack.id);
			}

			// Track analytics
			analytics.trackContentPackLoaded(contentPack.id, contentPack.version);

			return contentPack;
		} catch (error) {
			errorMonitoring.reportError({
				context: {
					action: "load",
					component: "content_loader",
					metadata: { fileName: file.name, fileSize: file.size },
				},
				error: error instanceof Error ? error : new Error("Unknown error"),
				message: "Failed to load content pack",
			});
			throw error;
		}
	}

	/**
	 * Validate content pack data
	 * @param data - Content pack data to validate
	 * @returns Promise resolving to validation result
	 */
	async validate(data: ContentPackData): Promise<ContentValidationResult> {
		try {
			const result = await contentPackValidator.validate(data);

			return {
				errors: result.errors || [],
				metadata: result.metadata,
				valid: result.valid,
				warnings: result.warnings || [],
			};
		} catch (error) {
			return {
				errors: [
					error instanceof Error ? error.message : "Unknown validation error",
				],
				valid: false,
				warnings: [],
			};
		}
	}

	/**
	 * Save content pack
	 * @param pack - Content pack to save
	 */
	async save(pack: ContentPack): Promise<void> {
		try {
			pack.updated_at = new Date().toISOString();
			await contentPackCache.set(pack.id, pack.content);

			analytics.trackContentPackUploaded(pack.id, pack.version, true);
		} catch (error) {
			analytics.trackContentPackUploaded(pack.id, pack.version, false);
			throw error;
		}
	}

	/**
	 * Get content pack by ID
	 * @param id - Content pack ID
	 * @returns Promise resolving to content pack or null
	 */
	async get(id: string): Promise<ContentPack | null> {
		try {
			const contentData = await contentPackCache.get(id);
			return contentData ? ({ id, content: contentData } as ContentPack) : null;
		} catch (error) {
			console.error("Error getting content pack:", error);
			return null;
		}
	}

	/**
	 * List all content packs
	 * @returns Promise resolving to array of content packs
	 */
	async list(): Promise<ContentPack[]> {
		try {
			const packs = await contentPackCache.listIndexedPacks();
			return packs.map(
				(pack, index) =>
					({ id: `pack_${index}`, content: pack }) as ContentPack,
			);
		} catch (error) {
			console.error("Error listing content packs:", error);
			return [];
		}
	}

	/**
	 * Delete content pack
	 * @param id - Content pack ID
	 */
	async delete(id: string): Promise<void> {
		try {
			await contentPackCache.invalidate(id);

			if (this.activePackId === id) {
				this.activePackId = null;
			}
		} catch (error) {
			console.error("Error deleting content pack:", error);
			throw error;
		}
	}

	/**
	 * Backup content pack
	 * @param pack - Content pack to backup
	 */
	async backup(pack: ContentPack): Promise<void> {
		try {
			const backupId = `backup_${pack.id}_${Date.now()}`;
			await contentPackCache.set(backupId, pack.content);
		} catch (error) {
			console.error("Error backing up content pack:", error);
			throw error;
		}
	}

	/**
	 * Restore content pack from backup
	 * @param backupId - Backup ID
	 * @returns Promise resolving to restored content pack or null
	 */
	async restore(backupId: string): Promise<ContentPack | null> {
		try {
			const contentData = await contentPackCache.get(backupId);
			return contentData
				? ({ id: backupId, content: contentData } as ContentPack)
				: null;
		} catch (error) {
			console.error("Error restoring content pack:", error);
			return null;
		}
	}

	/**
	 * Search content packs
	 * @param query - Search query
	 * @returns Promise resolving to array of matching content packs
	 */
	async search(query: string): Promise<ContentPack[]> {
		try {
			const packs = await this.list();
			const lowercaseQuery = query.toLowerCase();

			return packs.filter(
				(pack) =>
					pack.name.toLowerCase().includes(lowercaseQuery) ||
					pack.content.description.toLowerCase().includes(lowercaseQuery) ||
					pack.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
			);
		} catch (error) {
			console.error("Error searching content packs:", error);
			return [];
		}
	}

	/**
	 * Get active content pack
	 * @returns Promise resolving to active content pack or null
	 */
	async getActive(): Promise<ContentPack | null> {
		try {
			if (!this.activePackId) {
				return null;
			}
			return await this.get(this.activePackId);
		} catch (error) {
			console.error("Error getting active content pack:", error);
			return null;
		}
	}

	/**
	 * Set active content pack
	 * @param id - Content pack ID
	 */
	async setActive(id: string): Promise<void> {
		try {
			const pack = await this.get(id);
			if (!pack) {
				throw new Error("Content pack not found");
			}

			// Deactivate current active pack
			if (this.activePackId) {
				const currentPack = await this.get(this.activePackId);
				if (currentPack) {
					currentPack.is_active = false;
					await this.save(currentPack);
				}
			}

			// Activate new pack
			pack.is_active = true;
			await this.save(pack);
			this.activePackId = id;

			// Update cache
			await contentPackCache.setActive(pack.content);
		} catch (error) {
			console.error("Error setting active content pack:", error);
			throw error;
		}
	}

	/**
	 * Get content pack statistics
	 * @param id - Content pack ID
	 * @returns Promise resolving to statistics object
	 */
	async getStatistics(id: string): Promise<Record<string, unknown> | null> {
		try {
			const pack = await this.get(id);
			if (!pack) {
				return null;
			}

			return {
				category_count: pack.content.categories.length,
				difficulty_distribution: pack.content.questions.reduce(
					(acc, q) => {
						acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				),
				estimated_duration: pack.content.questions.reduce(
					(total, q) => total + q.time_limit,
					0,
				),
				question_count: pack.content.questions.length,
				type_distribution: pack.content.questions.reduce(
					(acc, q) => {
						acc[q.type] = (acc[q.type] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				),
			};
		} catch (error) {
			console.error("Error getting content pack statistics:", error);
			return null;
		}
	}
}

// Export singleton instance
export const contentPackLoader = new ContentPackLoader();
