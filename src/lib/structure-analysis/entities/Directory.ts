/**
 * Directory entity
 * @fileoverview Represents a single directory in the project structure
 */

import type { File } from "./File.js";

/**
 * Single directory in the project structure
 */
export interface Directory {
	/**
	 * Full path to the directory
	 */
	path: string;

	/**
	 * Directory name
	 */
	name: string;

	/**
	 * List of files in this directory
	 */
	files: File[];

	/**
	 * Nested directories
	 */
	subdirectories: Directory[];

	/**
	 * Intended purpose of the directory
	 */
	purpose:
		| "components"
		| "services"
		| "utilities"
		| "types"
		| "config"
		| "assets"
		| "tests";

	/**
	 * Architectural patterns used in this directory
	 */
	patterns: string[];

	/**
	 * Total file count (including subdirectories)
	 */
	totalFiles?: number;

	/**
	 * Total directory count (including subdirectories)
	 */
	totalDirectories?: number;

	/**
	 * Last modification timestamp
	 */
	lastModified?: Date;
}

/**
 * Directory purpose validation
 */
const VALID_PURPOSES = [
	"components",
	"services",
	"utilities",
	"types",
	"config",
	"assets",
	"tests",
] as const;

/**
 * Check if purpose is valid
 * @param purpose - Purpose to validate
 * @returns True if valid
 */
export function isValidPurpose(
	purpose: string,
): purpose is Directory["purpose"] {
	return VALID_PURPOSES.includes(purpose as Directory["purpose"]);
}

/**
 * Create a new Directory instance
 * @param options - Directory options
 * @returns New Directory instance
 */
export function createDirectory(
	options: Partial<Directory> & {
		path: string;
		name: string;
		purpose: Directory["purpose"];
	},
): Directory {
	return {
		path: options.path,
		name: options.name,
		files: options.files ?? [],
		subdirectories: options.subdirectories ?? [],
		purpose: options.purpose,
		patterns: options.patterns ?? [],
		totalFiles: options.totalFiles,
		totalDirectories: options.totalDirectories,
		lastModified: options.lastModified ?? new Date(),
	};
}

/**
 * Get directory depth
 * @param directory - Directory to measure
 * @returns Depth level
 */
export function getDirectoryDepth(directory: Directory): number {
	if (directory.subdirectories.length === 0) {
		return 0;
	}
	return 1 + Math.max(...directory.subdirectories.map(getDirectoryDepth));
}

/**
 * Get all files recursively from directory and subdirectories
 * @param directory - Directory to scan
 * @returns Flat list of all files
 */
export function getAllFiles(directory: Directory): File[] {
	return [...directory.files, ...directory.subdirectories.flatMap(getAllFiles)];
}
