/**
 * FileSystemScanner service
 * @fileoverview Scans file system for project files and structure
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Directory } from "../entities/Directory";
import { createDirectory, getAllFiles } from "../entities/Directory";
import type { File } from "../entities/File";
import { createFile, isSourceFile } from "../entities/File";

/**
 * File system scanner options
 */
export interface FileSystemScannerOptions {
	/**
	 * Directories to scan
	 */
	directories: string[];

	/**
	 * File patterns to include
	 */
	includePatterns?: string[];

	/**
	 * File patterns to exclude
	 */
	excludePatterns?: string[];

	/**
	 * Maximum depth for scanning
	 */
	maxDepth?: number;

	/**
	 * Follow symbolic links
	 */
	followSymlinks?: boolean;
}

/**
 * File system scanner result
 */
export interface FileSystemScannerResult {
	/**
	 * Scanned directories
	 */
	directories: Directory[];

	/**
	 * Total files found
	 */
	totalFiles: number;

	/**
	 * Total directories found
	 */
	totalDirectories: number;

	/**
	 * Scan duration in milliseconds
	 */
	durationMs: number;
}

/**
 * File system scanner service
 */
export class FileSystemScanner {
	/**
	 * Scan file system for project files
	 * @param options - Scanner options
	 * @returns Promise resolving to scan result
	 */
	async scanFileSystem(
		options: FileSystemScannerOptions,
	): Promise<FileSystemScannerResult> {
		const startTime = Date.now();
		const directories: Directory[] = [];

		for (const dir of options.directories) {
			const scannedDir = await this.scanDirectory(dir, {
				maxDepth: options.maxDepth ?? 10,
				excludePatterns: options.excludePatterns ?? [
					"node_modules",
					".git",
					"dist",
					"build",
				],
				followSymlinks: options.followSymlinks ?? false,
			});
			if (scannedDir) {
				directories.push(scannedDir);
			}
		}

		const totalFiles = directories.reduce(
			(sum, dir) => sum + getAllFiles(dir).length,
			0,
		);
		const totalDirectories = directories.reduce(
			(sum, dir) => sum + (dir.totalDirectories ?? 0),
			0,
		);

		return {
			directories,
			totalFiles,
			totalDirectories,
			durationMs: Date.now() - startTime,
		};
	}

	/**
	 * Scan a single directory
	 * @param dirPath - Directory path
	 * @param options - Scan options
	 * @param currentDepth - Current depth level
	 * @returns Promise resolving to directory or null
	 */
	private async scanDirectory(
		dirPath: string,
		options: {
			maxDepth: number;
			excludePatterns: string[];
			followSymlinks: boolean;
		},
		currentDepth = 0,
	): Promise<Directory | null> {
		try {
			const stat = await fs.stat(dirPath);
			if (!stat.isDirectory()) {
				return null;
			}

			// Check if directory should be excluded
			const dirName = path.basename(dirPath);
			if (
				options.excludePatterns.some((pattern) => dirName.includes(pattern))
			) {
				return null;
			}

			const files: File[] = [];
			const subdirectories: Directory[] = [];

			const entries = await fs.readdir(dirPath, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);

				if (entry.isDirectory()) {
					if (currentDepth < options.maxDepth) {
						const subDir = await this.scanDirectory(
							fullPath,
							options,
							currentDepth + 1,
						);
						if (subDir) {
							subdirectories.push(subDir);
						}
					}
				} else if (entry.isFile()) {
					// Check if file should be excluded
					if (
						options.excludePatterns.some((pattern) =>
							entry.name.includes(pattern),
						)
					) {
						continue;
					}

					const file = await this.createFileFromPath(fullPath);
					if (file) {
						files.push(file);
					}
				}
			}

			const directoryName = path.basename(dirPath);
			const purpose = this.determineDirectoryPurpose(dirPath);

			return createDirectory({
				path: dirPath,
				name: directoryName,
				files,
				subdirectories,
				purpose,
				patterns: [],
				totalFiles: files.length,
				totalDirectories: subdirectories.length,
				lastModified: stat.mtime,
			});
		} catch (error) {
			console.warn(`Failed to scan directory ${dirPath}:`, error);
			return null;
		}
	}

	/**
	 * Create File entity from file path
	 * @param filePath - File path
	 * @returns Promise resolving to File or null
	 */
	private async createFileFromPath(filePath: string): Promise<File | null> {
		try {
			const stat = await fs.stat(filePath);
			const parsedPath = path.parse(filePath);
			const ext = parsedPath.ext.replace(".", "");

			// Determine file purpose
			const purpose = this.determineFilePurpose(filePath, ext);

			// Read dependencies if source file
			const dependencies: string[] = [];
			const exports: string[] = [];

			if (isSourceFile({ path: filePath, extension: ext } as File)) {
				// Would parse imports/exports here
				// For now, leave empty arrays
			}

			return createFile({
				path: filePath,
				name: parsedPath.base,
				extension: ext,
				size: stat.size,
				lastModified: stat.mtime,
				purpose,
				dependencies,
				exports,
			});
		} catch (error) {
			console.warn(`Failed to read file ${filePath}:`, error);
			return null;
		}
	}

	/**
	 * Determine directory purpose
	 * @param dirPath - Directory path
	 * @returns Directory purpose
	 */
	private determineDirectoryPurpose(dirPath: string): Directory["purpose"] {
		const pathLower = dirPath.toLowerCase();

		if (pathLower.includes("component") || pathLower.includes("components")) {
			return "components";
		}
		if (pathLower.includes("service") || pathLower.includes("services")) {
			return "services";
		}
		if (
			pathLower.includes("test") ||
			pathLower.includes("spec") ||
			pathLower.includes("__tests__")
		) {
			return "tests";
		}
		if (pathLower.includes("type") || pathLower.includes("types")) {
			return "types";
		}
		if (
			pathLower.includes("config") ||
			pathLower.includes("configs") ||
			pathLower.includes("settings")
		) {
			return "config";
		}
		if (
			pathLower.includes("asset") ||
			pathLower.includes("assets") ||
			pathLower.includes("public")
		) {
			return "assets";
		}

		return "utilities";
	}

	/**
	 * Determine file purpose
	 * @param filePath - File path
	 * @param extension - File extension
	 * @returns File purpose
	 */
	private determineFilePurpose(
		filePath: string,
		extension: string,
	): File["purpose"] {
		const pathLower = filePath.toLowerCase();
		const fileName = path.basename(filePath).toLowerCase();

		if (fileName.includes(".test.") || fileName.includes(".spec.")) {
			return "test";
		}

		if (extension === "migration" || filePath.includes("migration")) {
			return "migration";
		}

		if (
			fileName.includes("readme") ||
			fileName.includes("doc") ||
			extension === "md"
		) {
			return "documentation";
		}

		if (pathLower.includes("config") || fileName.includes("config")) {
			return "config";
		}

		if (pathLower.includes("util") || pathLower.includes("helper")) {
			return "utility";
		}

		if (
			pathLower.includes("component") ||
			pathLower.includes("ui") ||
			pathLower.includes("page")
		) {
			return "component";
		}

		if (pathLower.includes("service")) {
			return "service";
		}

		if (
			pathLower.includes("type") ||
			extension === "ts" ||
			extension === "d.ts"
		) {
			return "type";
		}

		return "service";
	}
}
