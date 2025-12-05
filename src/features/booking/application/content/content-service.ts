import type {
	ContentPack,
	ContentPackData,
	ContentPackValidation,
} from "@/types/content";
import { contentPackLoader } from "./content-loader";
import type {
	ContentLoadOptions,
	ContentPackServiceInterface,
	ContentValidationResult,
} from "./content-types";

/**
 * Content pack service
 * Main service for content pack operations
 */
export class ContentPackService implements ContentPackServiceInterface {
	/**
	 * Validate content pack data
	 * @param data - Content pack data to validate
	 * @returns Promise resolving to validation result
	 */
	async validate(data: ContentPackData): Promise<ContentValidationResult> {
		const result = await contentPackLoader.validate(data);
		return result as unknown as ContentValidationResult;
	}

	/**
	 * Load content pack from file
	 * @param file - File to load
	 * @param options - Loading options
	 * @returns Promise resolving to loaded content pack
	 */
	async load(file: File, options?: ContentLoadOptions): Promise<ContentPack> {
		return await contentPackLoader.load(file, options);
	}

	/**
	 * Save content pack
	 * @param pack - Content pack to save
	 */
	async save(pack: ContentPack): Promise<void> {
		return await contentPackLoader.save(pack);
	}

	/**
	 * Get content pack by ID
	 * @param id - Content pack ID
	 * @returns Promise resolving to content pack or null
	 */
	async get(id: string): Promise<ContentPack | null> {
		return await contentPackLoader.get(id);
	}

	/**
	 * List all content packs
	 * @returns Promise resolving to array of content packs
	 */
	async list(): Promise<ContentPack[]> {
		return await contentPackLoader.list();
	}

	/**
	 * Delete content pack
	 * @param id - Content pack ID
	 */
	async delete(id: string): Promise<void> {
		return await contentPackLoader.delete(id);
	}

	/**
	 * Backup content pack
	 * @param pack - Content pack to backup
	 */
	async backup(pack: ContentPack): Promise<void> {
		return await contentPackLoader.backup(pack);
	}

	/**
	 * Restore content pack from backup
	 * @param backupId - Backup ID
	 * @returns Promise resolving to restored content pack or null
	 */
	async restore(backupId: string): Promise<ContentPack | null> {
		return await contentPackLoader.restore(backupId);
	}

	/**
	 * Search content packs
	 * @param query - Search query
	 * @returns Promise resolving to array of matching content packs
	 */
	async search(query: string): Promise<ContentPack[]> {
		return await contentPackLoader.search(query);
	}

	/**
	 * Get active content pack
	 * @returns Promise resolving to active content pack or null
	 */
	async getActive(): Promise<ContentPack | null> {
		return await contentPackLoader.getActive();
	}

	/**
	 * Set active content pack
	 * @param id - Content pack ID
	 */
	async setActive(id: string): Promise<void> {
		return await contentPackLoader.setActive(id);
	}

	/**
	 * Get content pack statistics
	 * @param id - Content pack ID
	 * @returns Promise resolving to statistics object
	 */
	async getStatistics(id: string): Promise<Record<string, unknown> | null> {
		return await contentPackLoader.getStatistics(id);
	}

	/**
	 * Validate content pack file
	 * @param file - File to validate
	 * @returns Promise resolving to validation result
	 */
	async validateFile(file: File): Promise<ContentPackValidation> {
		try {
			const text = await file.text();
			const data: ContentPackData = JSON.parse(text);
			const result = await this.validate(data);
			return result as unknown as ContentPackValidation;
		} catch (error) {
			return {
				errors: [error instanceof Error ? error.message : "Unknown error"],
				message: "Failed to parse file",
				timestamp: new Date().toISOString(),
				valid: false,
				version: "unknown",
			};
		}
	}

	/**
	 * Get content pack preview
	 * @param file - File to preview
	 * @returns Promise resolving to preview data
	 */
	async getPreview(file: File): Promise<{
		name: string;
		version: string;
		description: string;
		questionCount: number;
		categoryCount: number;
		estimatedDuration: number;
		tags: string[];
	} | null> {
		try {
			const text = await file.text();
			const data: ContentPackData = JSON.parse(text);

			return {
				categoryCount: data.categories.length,
				description: data.description,
				estimatedDuration: data.questions.reduce(
					(total, q) => total + q.time_limit,
					0,
				),
				name: data.name,
				questionCount: data.questions.length,
				tags: data.metadata.tags,
				version: data.version,
			};
		} catch (error) {
			console.error("Error getting content pack preview:", error);
			return null;
		}
	}

	/**
	 * Export content pack
	 * @param id - Content pack ID
	 * @param format - Export format
	 * @returns Promise resolving to export data
	 */
	async export(id: string, format: "json" | "csv" = "json"): Promise<string> {
		const pack = await this.get(id);
		if (!pack) {
			throw new Error("Content pack not found");
		}

		if (format === "json") {
			return JSON.stringify(pack, null, 2);
		}

		if (format === "csv") {
			// Convert to CSV format
			const headers = [
				"Question ID",
				"Category",
				"Text",
				"Type",
				"Difficulty",
				"Time Limit",
			];
			const rows = pack.content.questions.map((q) => {
				const category = pack.content.categories.find(
					(c) => c.id === q.category_id,
				);
				return [
					q.id,
					category?.name || "Unknown",
					q.text,
					q.type,
					q.difficulty,
					q.time_limit.toString(),
				];
			});

			return [headers, ...rows].map((row) => row.join(",")).join("\n");
		}

		throw new Error("Unsupported export format");
	}

	/**
	 * Duplicate content pack
	 * @param id - Content pack ID
	 * @param newName - New name for duplicated pack
	 * @returns Promise resolving to duplicated content pack
	 */
	async duplicate(id: string, newName: string): Promise<ContentPack> {
		const originalPack = await this.get(id);
		if (!originalPack) {
			throw new Error("Content pack not found");
		}

		const duplicatedPack: ContentPack = {
			...originalPack,
			created_at: new Date().toISOString(),
			download_count: 0,
			id: `duplicate_${Date.now()}`,
			is_active: false,
			name: newName,
			reviews_count: 0,
			updated_at: new Date().toISOString(),
		};

		await this.save(duplicatedPack);
		return duplicatedPack;
	}

	/**
	 * Get content pack health status
	 * @param id - Content pack ID
	 * @returns Promise resolving to health status
	 */
	async getHealthStatus(id: string): Promise<{
		status: "healthy" | "degraded" | "unhealthy";
		issues: string[];
		lastChecked: string;
	}> {
		const pack = await this.get(id);
		if (!pack) {
			return {
				issues: ["Content pack not found"],
				lastChecked: new Date().toISOString(),
				status: "unhealthy",
			};
		}

		const issues: string[] = [];
		let status: "healthy" | "degraded" | "unhealthy" = "healthy";

		// Check if pack has questions
		if (pack.content.questions.length === 0) {
			issues.push("No questions found");
			status = "unhealthy";
		}

		// Check if pack has categories
		if (pack.content.categories.length === 0) {
			issues.push("No categories found");
			status = "unhealthy";
		}

		// Check for orphaned questions
		const categoryIds = new Set(pack.content.categories.map((c) => c.id));
		const orphanedQuestions = pack.content.questions.filter(
			(q) => !categoryIds.has(q.category_id),
		);
		if (orphanedQuestions.length > 0) {
			issues.push(
				`${orphanedQuestions.length} questions reference invalid categories`,
			);
			status = "degraded";
		}

		// Check evaluation criteria weights
		const criteria = pack.content.evaluation_criteria;
		const totalWeight = Object.values(criteria).reduce(
			(sum, category) => sum + category.weight,
			0,
		);
		if (Math.abs(totalWeight - 1) > 0.01) {
			issues.push("Evaluation criteria weights do not sum to 1");
			status = "degraded";
		}

		return {
			issues,
			lastChecked: new Date().toISOString(),
			status,
		};
	}
}

// Export singleton instance
export const contentPackService = new ContentPackService();
