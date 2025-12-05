/**
 * ContentPackService implementation for managing content pack lifecycle
 *
 * @fileoverview Domain service for content pack management and hot-swapping
 */

import type { IAnalyticsService } from "@/features/notifications/domain/analytics/interfaces/IAnalyticsService";
import type { ContentPack, ContentPackStatus } from "../entities/ContentPack";
import { createLoadEvent } from "../entities/LoadEvent";
import type {
	ContentPackFilters,
	ContentPackServiceConfig,
	ContentPackStatistics,
	ContentPackValidationResult,
	IContentPackService,
} from "../interfaces/IContentPackService";
import type { IContentPackValidator } from "../interfaces/IContentPackValidator";
import type { IContentPackRepository } from "../repositories/IContentPackRepository";

export class ContentPackService implements IContentPackService {
	private cache = new Map<string, ContentPack>();
	private activeContentPack: ContentPack | null = null;
	private activationInProgress = false;

	constructor(
		private repository: IContentPackRepository,
		private validator: IContentPackValidator,
		private analyticsService: IAnalyticsService,
		private config: ContentPackServiceConfig,
	) {}

	/**
	 * Get the currently active content pack
	 */
	async getActiveContentPack(): Promise<ContentPack | null> {
		if (this.config.cacheEnabled && this.activeContentPack) {
			return this.activeContentPack;
		}

		try {
			const activePack = await this.repository.findActive();
			if (activePack) {
				this.activeContentPack = activePack;
				if (this.config.cacheEnabled) {
					this.cache.set(activePack.id, activePack);
				}
			}
			return activePack;
		} catch (error) {
			console.error("Failed to get active content pack:", error);
			return null;
		}
	}

	/**
	 * Activate a content pack (hot-swap)
	 */
	async activateContentPack(
		contentPackId: string,
		userId: string,
	): Promise<ContentPack> {
		if (this.activationInProgress) {
			throw new Error("Content pack activation is already in progress");
		}

		this.activationInProgress = true;
		const startTime = Date.now();

		try {
			// Get the content pack to activate
			const contentPack = await this.getContentPack(contentPackId);
			if (!contentPack) {
				throw new Error(`Content pack with ID ${contentPackId} not found`);
			}

			// Validate the content pack
			const validationResult = await this.validateContentPack(contentPackId);
			if (!validationResult.isValid) {
				throw new Error(
					`Content pack validation failed: ${validationResult.errors.join(", ")}`,
				);
			}

			// Get current active pack for analytics (before deactivation)
			let previousActivePack: ContentPack | null = null;
			try {
				previousActivePack = await this.getActiveContentPack();
			} catch (error) {
				console.warn("Failed to get previous active pack:", error);
			}

			// Deactivate ALL currently activated packs to ensure only one is active
			// This handles the case where multiple packs might be activated due to a bug
			try {
				// Use the repository method to deactivate all activated packs
				if (
					typeof (this.repository as any).deactivateAllActivated === "function"
				) {
					const deactivatedCount = await (
						this.repository as any
					).deactivateAllActivated();
					if (deactivatedCount > 0) {
						console.log(
							`Deactivated ${deactivatedCount} content pack(s) before activating new one`,
						);
					}
				} else {
					// Fallback to old method if new method not available
					if (previousActivePack) {
						await this.deactivateContentPack(userId);
					}
				}
			} catch (error) {
				console.warn("Failed to deactivate previous content packs:", error);
				// Continue with activation even if deactivation fails
			}

			// Update content pack status to activated
			const updatedContentPack = await this.repository.update(contentPackId, {
				status: "activated" as ContentPackStatus,
				activatedAt: new Date(),
				activatedBy: userId,
				updatedAt: new Date(),
			});

			if (!updatedContentPack) {
				throw new Error("Failed to update content pack status");
			}

			// Update cache
			this.activeContentPack = updatedContentPack;
			if (this.config.cacheEnabled) {
				this.cache.set(updatedContentPack.id, updatedContentPack);
			}

			// Create load event for analytics
			const _activationTimeMs = Date.now() - startTime;
			const loadEvent = createLoadEvent({
				contentPackId: updatedContentPack.id,
				version: updatedContentPack.version,
				schemaVersion: updatedContentPack.schemaVersion,
				fileSize: updatedContentPack.fileSize,
				uploadDurationMs:
					updatedContentPack.createdAt.getTime() -
					updatedContentPack.createdAt.getTime(),
				validationDurationMs: validationResult.validationTimeMs,
				activatedBy: userId,
				previousPackId: previousActivePack?.id,
				timestamp: new Date(),
			});

			// Track analytics event
			if (this.config.enableAnalytics) {
				try {
					await this.analyticsService.trackContentPackLoad(loadEvent);
				} catch (error) {
					console.warn("Failed to track content pack load event:", error);
					// Don't fail activation if analytics fails
				}
			}

			return updatedContentPack;
		} finally {
			this.activationInProgress = false;
		}
	}

	/**
	 * Deactivate the current content pack
	 */
	async deactivateContentPack(_userId: string): Promise<ContentPack | null> {
		const activePack = await this.getActiveContentPack();
		if (!activePack) {
			return null;
		}

		// Update status to archived
		const updatedPack = await this.repository.update(activePack.id, {
			status: "archived" as ContentPackStatus,
			updatedAt: new Date(),
		});

		// Clear cache
		this.activeContentPack = null;
		if (this.config.cacheEnabled) {
			this.cache.delete(activePack.id);
		}

		return updatedPack || activePack;
	}

	/**
	 * Get content pack by ID
	 */
	async getContentPack(id: string): Promise<ContentPack | null> {
		// Check cache first
		if (this.config.cacheEnabled && this.cache.has(id)) {
			const cached = this.cache.get(id);
			if (cached) {
				return cached;
			}
		}

		try {
			const contentPack = await this.repository.findById(id);
			if (contentPack && this.config.cacheEnabled) {
				this.cache.set(id, contentPack);
			}
			return contentPack;
		} catch (error) {
			console.error(`Failed to get content pack ${id}:`, error);
			return null;
		}
	}

	/**
	 * List content packs with optional filtering
	 */
	async listContentPacks(filters?: ContentPackFilters): Promise<ContentPack[]> {
		try {
			return await this.repository.findAll(filters);
		} catch (error) {
			console.error("Failed to list content packs:", error);
			return [];
		}
	}

	/**
	 * Archive a content pack
	 */
	async archiveContentPack(
		contentPackId: string,
		_userId: string,
	): Promise<ContentPack> {
		const contentPack = await this.getContentPack(contentPackId);
		if (!contentPack) {
			throw new Error(`Content pack with ID ${contentPackId} not found`);
		}

		// Don't allow archiving the active content pack
		if (contentPack.status === "activated") {
			throw new Error(
				"Cannot archive the currently active content pack. Deactivate it first.",
			);
		}

		const updatedPack = await this.repository.update(contentPackId, {
			status: "archived" as ContentPackStatus,
			updatedAt: new Date(),
		});

		if (!updatedPack) {
			throw new Error("Failed to archive content pack");
		}

		// Update cache
		if (this.config.cacheEnabled) {
			this.cache.set(contentPackId, updatedPack);
		}

		return updatedPack;
	}

	/**
	 * Get content pack statistics
	 */
	async getContentPackStatistics(
		contentPackId: string,
	): Promise<ContentPackStatistics | null> {
		const contentPack = await this.getContentPack(contentPackId);
		if (!contentPack) {
			return null;
		}

		return {
			id: contentPack.id,
			version: contentPack.version,
			name: contentPack.name,
			status: contentPack.status,
			fileSize: contentPack.fileSize,
			createdAt: contentPack.createdAt,
			activatedAt: contentPack.activatedAt,
			activatedBy: contentPack.activatedBy,
			uploadedBy: contentPack.uploadedBy,
			// These would come from additional queries in a real implementation
			validationTimeMs: undefined,
			activationTimeMs: undefined,
			usageCount: undefined,
			lastUsedAt: undefined,
		};
	}

	/**
	 * Validate content pack before activation
	 */
	async validateContentPack(
		contentPackId: string,
	): Promise<ContentPackValidationResult> {
		const startTime = Date.now();

		try {
			const contentPack = await this.getContentPack(contentPackId);
			if (!contentPack) {
				return {
					isValid: false,
					errors: [`Content pack with ID ${contentPackId} not found`],
					warnings: [],
					validatedAt: new Date(),
					validatedBy: "system",
					validationTimeMs: Date.now() - startTime,
				};
			}

			// Add detailed logging to diagnose validation issues
			console.log(
				"ContentPackService.validateContentPack: Content pack structure:",
				{
					id: contentPack.id,
					name: contentPack.name,
					status: contentPack.status,
					hasContent: !!contentPack.content,
					hasMetadata: !!contentPack.metadata,
					contentType: typeof contentPack.content,
					metadataType: typeof contentPack.metadata,
					contentKeys: contentPack.content
						? Object.keys(contentPack.content)
						: [],
					metadataKeys: contentPack.metadata
						? Object.keys(contentPack.metadata)
						: [],
				},
			);

			// Use the validator to validate the content pack
			// The validator expects the full content pack structure (name, version, content, metadata)
			const validationData = {
				version: contentPack.version,
				name: contentPack.name,
				description: contentPack.description,
				content: contentPack.content,
				metadata: contentPack.metadata,
			};
			const validationResult = await this.validator.validate(validationData);

			console.log(
				"ContentPackService.validateContentPack: Validation result:",
				{
					isValid: validationResult.isValid,
					errorCount: validationResult.errors.length,
					warningCount: validationResult.warnings.length,
					errors: validationResult.errors.map((e) => e.message),
				},
			);

			return {
				isValid: validationResult.isValid,
				errors: validationResult.errors.map((e) => e.message),
				warnings: validationResult.warnings.map((w) => w.message),
				validatedAt: new Date(),
				validatedBy: "system",
				validationTimeMs: Date.now() - startTime,
			};
		} catch (error) {
			console.error(
				"ContentPackService.validateContentPack: Validation error:",
				error,
			);
			return {
				isValid: false,
				errors: [
					`Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				],
				warnings: [],
				validatedAt: new Date(),
				validatedBy: "system",
				validationTimeMs: Date.now() - startTime,
			};
		}
	}

	/**
	 * Clear cache (useful for testing or manual cache invalidation)
	 */
	clearCache(): void {
		this.cache.clear();
		this.activeContentPack = null;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStatistics(): { size: number; activePackCached: boolean } {
		return {
			size: this.cache.size,
			activePackCached: this.activeContentPack !== null,
		};
	}
}
