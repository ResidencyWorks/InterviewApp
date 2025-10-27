/**
 * DirectoryTraverser service
 * @fileoverview Implements directory traversal logic with structural pattern detection
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Directory } from "../entities/Directory.js";
import { createDirectory, getAllFiles } from "../entities/Directory.js";
import type { File } from "../entities/File.js";
import { createFile, isSourceFile } from "../entities/File.js";
import { PatternMatcher } from "./PatternMatcher.js";

/**
 * Directory traversal options
 */
export interface DirectoryTraversalOptions {
	/**
	 * Maximum depth for traversal
	 */
	maxDepth?: number;

	/**
	 * File patterns to include
	 */
	includePatterns?: string[];

	/**
	 * File patterns to exclude
	 */
	excludePatterns?: string[];

	/**
	 * Follow symbolic links
	 */
	followSymlinks?: boolean;

	/**
	 * Enable structural pattern detection
	 */
	detectStructuralPatterns?: boolean;

	/**
	 * Pattern detection options
	 */
	patternOptions?: {
		detectServices?: boolean;
		detectComponents?: boolean;
		detectApiRoutes?: boolean;
		detectTypes?: boolean;
	};
}

/**
 * Directory traversal result
 */
export interface DirectoryTraversalResult {
	/**
	 * Root directories found
	 */
	directories: Directory[];

	/**
	 * Structural patterns detected
	 */
	structuralPatterns: {
		services: File[];
		components: File[];
		apiRoutes: File[];
		types: File[];
	};

	/**
	 * Total files processed
	 */
	totalFiles: number;

	/**
	 * Total directories processed
	 */
	totalDirectories: number;

	/**
	 * Traversal duration in milliseconds
	 */
	durationMs: number;
}

/**
 * Directory traverser service
 */
export class DirectoryTraverser {
	private patternMatcher = new PatternMatcher();

	/**
	 * Traverse directories with structural pattern detection
	 * @param rootPaths - Root paths to traverse
	 * @param options - Traversal options
	 * @returns Promise resolving to traversal result
	 */
	async traverseDirectories(
		rootPaths: string[],
		options?: DirectoryTraversalOptions,
	): Promise<DirectoryTraversalResult> {
		const startTime = Date.now();
		const directories: Directory[] = [];
		const structuralPatterns = {
			services: [] as File[],
			components: [] as File[],
			apiRoutes: [] as File[],
			types: [] as File[],
		};

		for (const rootPath of rootPaths) {
			const directory = await this.traverseDirectory(rootPath, options);
			if (directory) {
				directories.push(directory);
			}
		}

		// Detect structural patterns if enabled
		if (options?.detectStructuralPatterns) {
			const allFiles = directories.flatMap(getAllFiles);
			const sourceFiles = allFiles.filter(isSourceFile);

			if (options.patternOptions?.detectServices) {
				structuralPatterns.services =
					await this.patternMatcher.matchServicePattern(sourceFiles);
			}

			if (options.patternOptions?.detectComponents) {
				structuralPatterns.components =
					await this.patternMatcher.matchComponentPattern(sourceFiles);
			}

			if (options.patternOptions?.detectApiRoutes) {
				structuralPatterns.apiRoutes =
					await this.patternMatcher.matchApiRoutePattern(sourceFiles);
			}

			if (options.patternOptions?.detectTypes) {
				structuralPatterns.types = await this.detectTypeFiles(sourceFiles);
			}
		}

		const totalFiles = directories.reduce(
			(sum, dir) => sum + getAllFiles(dir).length,
			0,
		);
		const totalDirectories = directories.reduce(
			(sum, dir) => sum + (dir.totalDirectories || 0),
			0,
		);

		return {
			directories,
			structuralPatterns,
			totalFiles,
			totalDirectories,
			durationMs: Date.now() - startTime,
		};
	}

	/**
	 * Traverse a single directory recursively
	 * @param dirPath - Directory path
	 * @param options - Traversal options
	 * @param currentDepth - Current depth level
	 * @returns Promise resolving to directory or null
	 */
	private async traverseDirectory(
		dirPath: string,
		options?: DirectoryTraversalOptions,
		currentDepth = 0,
	): Promise<Directory | null> {
		try {
			const stat = await fs.stat(dirPath);
			if (!stat.isDirectory()) {
				return null;
			}

			const maxDepth = options?.maxDepth ?? 10;
			if (currentDepth >= maxDepth) {
				return null;
			}

			// Check if directory should be excluded
			const dirName = path.basename(dirPath);
			const excludePatterns = options?.excludePatterns ?? [
				"node_modules",
				".git",
				"dist",
				"build",
				"coverage",
			];

			if (excludePatterns.some((pattern) => dirName.includes(pattern))) {
				return null;
			}

			const files: File[] = [];
			const subdirectories: Directory[] = [];

			const entries = await fs.readdir(dirPath, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);

				if (entry.isDirectory()) {
					const subDir = await this.traverseDirectory(
						fullPath,
						options,
						currentDepth + 1,
					);
					if (subDir) {
						subdirectories.push(subDir);
					}
				} else if (entry.isFile()) {
					// Check if file should be excluded
					if (excludePatterns.some((pattern) => entry.name.includes(pattern))) {
						continue;
					}

					// Check include patterns
					const includePatterns = options?.includePatterns;
					if (includePatterns && includePatterns.length > 0) {
						const shouldInclude = includePatterns.some((pattern) => {
							if (pattern.includes("*")) {
								const regex = new RegExp(pattern.replace(/\*/g, ".*"));
								return regex.test(entry.name);
							}
							return entry.name.includes(pattern);
						});

						if (!shouldInclude) {
							continue;
						}
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
			console.warn(`Failed to traverse directory ${dirPath}:`, error);
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
	 * Detect type files
	 * @param files - Files to analyze
	 * @returns Type files found
	 */
	private async detectTypeFiles(files: File[]): Promise<File[]> {
		const typePatterns = [
			"interface\\s+\\w+",
			"type\\s+\\w+\\s*=",
			"enum\\s+\\w+",
			"export\\s+type\\s+\\w+",
			"export\\s+interface\\s+\\w+",
		];

		const matches: File[] = [];

		for (const file of files) {
			const results = await this.patternMatcher.matchPatterns(
				[file],
				typePatterns,
				{
					allowRegex: true,
				},
			);

			if (results.length > 0) {
				matches.push(file);
			}
		}

		return matches;
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
