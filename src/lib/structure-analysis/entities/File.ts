/**
 * File entity
 * @fileoverview Represents a single file in the project
 */

/**
 * File purpose classification
 */
export type FilePurpose =
	| "service"
	| "component"
	| "utility"
	| "type"
	| "config"
	| "test"
	| "migration"
	| "documentation";

/**
 * Single file in the project
 */
export interface File {
	/**
	 * Full path to the file
	 */
	path: string;

	/**
	 * File name
	 */
	name: string;

	/**
	 * File extension
	 */
	extension: string;

	/**
	 * File size in bytes
	 */
	size: number;

	/**
	 * Last modification date
	 */
	lastModified: Date;

	/**
	 * Intended purpose of the file
	 */
	purpose: FilePurpose;

	/**
	 * Import/require dependencies
	 */
	dependencies: string[];

	/**
	 * Exported functions/classes/interfaces
	 */
	exports: string[];

	/**
	 * Line count
	 */
	lineCount?: number;

	/**
	 * Complexity score (optional)
	 */
	complexityScore?: number;
}

/**
 * File purpose validation
 */
const VALID_FILE_PURPOSES: FilePurpose[] = [
	"service",
	"component",
	"utility",
	"type",
	"config",
	"test",
	"migration",
	"documentation",
];

/**
 * Check if file purpose is valid
 * @param purpose - Purpose to validate
 * @returns True if valid
 */
export function isValidFilePurpose(purpose: string): purpose is FilePurpose {
	return VALID_FILE_PURPOSES.includes(purpose as FilePurpose);
}

/**
 * Create a new File instance
 * @param options - File options
 * @returns New File instance
 */
export function createFile(
	options: Partial<File> & {
		path: string;
		name: string;
		extension: string;
		size: number;
		purpose: FilePurpose;
	},
): File {
	return {
		path: options.path,
		name: options.name,
		extension: options.extension,
		size: options.size,
		lastModified: options.lastModified ?? new Date(),
		purpose: options.purpose,
		dependencies: options.dependencies ?? [],
		exports: options.exports ?? [],
		lineCount: options.lineCount,
		complexityScore: options.complexityScore,
	};
}

/**
 * Get file size in human-readable format
 * @param file - File to format
 * @returns Formatted size string
 */
export function formatFileSize(file: File): string {
	const { size } = file;
	if (size < 1024) {
		return `${size} B`;
	}
	if (size < 1024 * 1024) {
		return `${(size / 1024).toFixed(2)} KB`;
	}
	return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Check if file is a source file
 * @param file - File to check
 * @returns True if source file
 */
export function isSourceFile(file: File): boolean {
	return ["ts", "tsx", "js", "jsx"].includes(file.extension.toLowerCase());
}

/**
 * Check if file is a test file
 * @param file - File to check
 * @returns True if test file
 */
export function isTestFile(file: File): boolean {
	return (
		file.name.includes(".test.") ||
		file.name.includes(".spec.") ||
		file.path.includes("/tests/") ||
		file.path.includes("/__tests__/")
	);
}
