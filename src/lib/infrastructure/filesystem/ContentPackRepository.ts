/**
 * FilesystemContentPackRepository
 *
 * Implements content pack persistence using the file system as a fallback
 * when Supabase is unavailable. Provides basic CRUD operations with
 * JSON file storage and proper error handling.
 */

import { promises as fs } from "fs";
import { dirname, join } from "path";
import {
	type ContentPack,
	ContentPackStatus,
} from "../../domain/entities/ContentPack";
import type {
	CountContentPacksOptions,
	FindContentPacksOptions,
	IContentPackRepository,
} from "../../domain/repositories/IContentPackRepository";

interface FilesystemContentPack {
	id: string;
	version: string;
	name: string;
	description?: string;
	schemaVersion: string;
	content: any;
	metadata?: any;
	status: string;
	createdAt: string;
	updatedAt: string;
	activatedAt?: string;
	activatedBy?: string;
	uploadedBy: string;
	fileSize: number;
	checksum: string;
}

export class FilesystemContentPackRepository implements IContentPackRepository {
	private readonly storagePath: string;
	private readonly indexFile: string;

	constructor(storagePath: string = "./data/content-packs") {
		this.storagePath = storagePath;
		this.indexFile = join(this.storagePath, "index.json");
	}

	/**
	 * Initializes the filesystem repository
	 */
	private async initialize(): Promise<void> {
		try {
			await fs.mkdir(this.storagePath, { recursive: true });

			// Create index file if it doesn't exist
			try {
				await fs.access(this.indexFile);
			} catch {
				await fs.writeFile(this.indexFile, JSON.stringify([]), "utf8");
			}
		} catch (error) {
			throw new Error(
				`Failed to initialize filesystem repository: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Saves a content pack to the filesystem
	 */
	async save(contentPack: ContentPack): Promise<ContentPack> {
		await this.initialize();

		try {
			const filePath = join(this.storagePath, `${contentPack.id}.json`);
			const filesystemData: FilesystemContentPack = {
				id: contentPack.id,
				version: contentPack.version,
				name: contentPack.name,
				description: contentPack.description,
				schemaVersion: contentPack.schemaVersion,
				content: contentPack.content,
				metadata: contentPack.metadata,
				status: contentPack.status,
				createdAt: contentPack.createdAt.toISOString(),
				updatedAt: contentPack.updatedAt.toISOString(),
				activatedAt: contentPack.activatedAt?.toISOString(),
				activatedBy: contentPack.activatedBy,
				uploadedBy: contentPack.uploadedBy,
				fileSize: contentPack.fileSize,
				checksum: contentPack.checksum,
			};

			// Write content pack file
			await fs.writeFile(
				filePath,
				JSON.stringify(filesystemData, null, 2),
				"utf8",
			);

			// Update index
			await this.updateIndex(contentPack.id, filesystemData);

			return contentPack;
		} catch (error) {
			throw new Error(
				`Failed to save content pack: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Finds a content pack by ID
	 */
	async findById(id: string): Promise<ContentPack | null> {
		await this.initialize();

		try {
			const filePath = join(this.storagePath, `${id}.json`);

			try {
				const data = await fs.readFile(filePath, "utf8");
				const filesystemData: FilesystemContentPack = JSON.parse(data);
				return this.mapFilesystemToContentPack(filesystemData);
			} catch (error) {
				if ((error as any).code === "ENOENT") {
					return null; // File not found
				}
				throw error;
			}
		} catch (error) {
			throw new Error(
				`Failed to find content pack: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Finds all content packs with optional filtering
	 */
	async findAll(options: FindContentPacksOptions = {}): Promise<ContentPack[]> {
		await this.initialize();

		try {
			const index = await this.getIndex();
			let contentPacks = index.map((item) =>
				this.mapFilesystemToContentPack(item),
			);

			// Apply filters
			if (options.status) {
				contentPacks = contentPacks.filter(
					(pack) => pack.status === options.status,
				);
			}

			if (options.uploadedBy) {
				contentPacks = contentPacks.filter(
					(pack) => pack.uploadedBy === options.uploadedBy,
				);
			}

			// Apply sorting
			const sortBy = options.sortBy || "createdAt";
			const sortOrder = options.sortOrder || "desc";

			contentPacks.sort((a, b) => {
				const aValue = (a as any)[sortBy];
				const bValue = (b as any)[sortBy];

				if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
				if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
				return 0;
			});

			// Apply pagination
			const offset = options.offset || 0;
			const limit = options.limit || 20;

			return contentPacks.slice(offset, offset + limit);
		} catch (error) {
			throw new Error(
				`Failed to find content packs: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Finds the currently active content pack
	 */
	async findActive(): Promise<ContentPack | null> {
		await this.initialize();

		try {
			const index = await this.getIndex();
			const activeItem = index.find(
				(item) => item.status === ContentPackStatus.ACTIVATED,
			);

			if (!activeItem) {
				return null;
			}

			return this.mapFilesystemToContentPack(activeItem);
		} catch (error) {
			throw new Error(
				`Failed to find active content pack: ${error instanceof Error ? error.message : "Unknown error"}`,
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
		await this.initialize();

		try {
			const existing = await this.findById(id);
			if (!existing) {
				return null;
			}

			const updated = { ...existing, ...updates, updatedAt: new Date() };
			const filePath = join(this.storagePath, `${id}.json`);

			const filesystemData: FilesystemContentPack = {
				id: updated.id,
				version: updated.version,
				name: updated.name,
				description: updated.description,
				schemaVersion: updated.schemaVersion,
				content: updated.content,
				metadata: updated.metadata,
				status: updated.status,
				createdAt: updated.createdAt.toISOString(),
				updatedAt: updated.updatedAt.toISOString(),
				activatedAt: updated.activatedAt?.toISOString(),
				activatedBy: updated.activatedBy,
				uploadedBy: updated.uploadedBy,
				fileSize: updated.fileSize,
				checksum: updated.checksum,
			};

			// Write updated content pack file
			await fs.writeFile(
				filePath,
				JSON.stringify(filesystemData, null, 2),
				"utf8",
			);

			// Update index
			await this.updateIndex(id, filesystemData);

			return updated;
		} catch (error) {
			throw new Error(
				`Failed to update content pack: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Deletes a content pack by ID
	 */
	async delete(id: string): Promise<boolean> {
		await this.initialize();

		try {
			const filePath = join(this.storagePath, `${id}.json`);

			try {
				await fs.unlink(filePath);
			} catch (error) {
				if ((error as any).code === "ENOENT") {
					return false; // File not found
				}
				throw error;
			}

			// Update index
			await this.removeFromIndex(id);

			return true;
		} catch (error) {
			throw new Error(
				`Failed to delete content pack: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Archives all content packs except the specified one
	 */
	async archiveAllExcept(excludeId: string): Promise<number> {
		await this.initialize();

		try {
			const index = await this.getIndex();
			let archivedCount = 0;

			for (const item of index) {
				if (
					item.id !== excludeId &&
					item.status !== ContentPackStatus.ARCHIVED
				) {
					item.status = ContentPackStatus.ARCHIVED;
					item.updatedAt = new Date().toISOString();

					// Update the file
					const filePath = join(this.storagePath, `${item.id}.json`);
					await fs.writeFile(filePath, JSON.stringify(item, null, 2), "utf8");

					archivedCount++;
				}
			}

			// Update index
			await fs.writeFile(
				this.indexFile,
				JSON.stringify(index, null, 2),
				"utf8",
			);

			return archivedCount;
		} catch (error) {
			throw new Error(
				`Failed to archive content packs: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Checks if a content pack exists by ID
	 */
	async exists(id: string): Promise<boolean> {
		await this.initialize();

		try {
			const filePath = join(this.storagePath, `${id}.json`);
			await fs.access(filePath);
			return true;
		} catch (error) {
			if ((error as any).code === "ENOENT") {
				return false;
			}
			throw new Error(
				`Failed to check content pack existence: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Counts content packs with optional filtering
	 */
	async count(options: CountContentPacksOptions = {}): Promise<number> {
		await this.initialize();

		try {
			const index = await this.getIndex();
			let count = index.length;

			// Apply filters
			if (options.status) {
				count = index.filter((item) => item.status === options.status).length;
			}

			if (options.uploadedBy) {
				count = index.filter(
					(item) => item.uploadedBy === options.uploadedBy,
				).length;
			}

			return count;
		} catch (error) {
			throw new Error(
				`Failed to count content packs: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Gets the index of all content packs
	 */
	private async getIndex(): Promise<FilesystemContentPack[]> {
		try {
			const data = await fs.readFile(this.indexFile, "utf8");
			return JSON.parse(data);
		} catch (error) {
			return [];
		}
	}

	/**
	 * Updates the index with a content pack
	 */
	private async updateIndex(
		id: string,
		contentPack: FilesystemContentPack,
	): Promise<void> {
		const index = await this.getIndex();
		const existingIndex = index.findIndex((item) => item.id === id);

		if (existingIndex >= 0) {
			index[existingIndex] = contentPack;
		} else {
			index.push(contentPack);
		}

		await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2), "utf8");
	}

	/**
	 * Removes a content pack from the index
	 */
	private async removeFromIndex(id: string): Promise<void> {
		const index = await this.getIndex();
		const filteredIndex = index.filter((item) => item.id !== id);
		await fs.writeFile(
			this.indexFile,
			JSON.stringify(filteredIndex, null, 2),
			"utf8",
		);
	}

	/**
	 * Maps filesystem data to ContentPack entity
	 */
	private mapFilesystemToContentPack(data: FilesystemContentPack): ContentPack {
		return {
			id: data.id,
			version: data.version,
			name: data.name,
			description: data.description,
			schemaVersion: data.schemaVersion,
			content: data.content,
			metadata: data.metadata,
			status: data.status as ContentPackStatus,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
			activatedAt: data.activatedAt ? new Date(data.activatedAt) : undefined,
			activatedBy: data.activatedBy,
			uploadedBy: data.uploadedBy,
			fileSize: data.fileSize,
			checksum: data.checksum,
		};
	}
}

/**
 * Factory function to create a FilesystemContentPackRepository
 */
export function createFilesystemContentPackRepository(
	storagePath?: string,
): FilesystemContentPackRepository {
	return new FilesystemContentPackRepository(storagePath);
}
