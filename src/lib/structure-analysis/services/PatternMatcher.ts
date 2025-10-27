/**
 * PatternMatcher service
 * @fileoverview Matches files and code patterns for structural analysis
 */

import * as fs from "node:fs/promises";
import type { File } from "../entities/File";

/**
 * Pattern matching options
 */
export interface PatternMatcherOptions {
	/**
	 * Case sensitive matching
	 */
	caseSensitive?: boolean;

	/**
	 * Enable regex patterns
	 */
	allowRegex?: boolean;

	/**
	 * Maximum file size to analyze (bytes)
	 */
	maxFileSize?: number;

	/**
	 * Include binary files
	 */
	includeBinaryFiles?: boolean;
}

/**
 * Pattern match result
 */
export interface PatternMatchResult {
	/**
	 * Matched file path
	 */
	filePath: string;

	/**
	 * Matched line number
	 */
	lineNumber: number;

	/**
	 * Matched content
	 */
	content: string;

	/**
	 * Match confidence (0-1)
	 */
	confidence?: number;
}

/**
 * Pattern matcher service
 */
export class PatternMatcher {
	/**
	 * Match patterns in files
	 * @param files - Files to search
	 * @param patterns - Patterns to match
	 * @param options - Matching options
	 * @returns Promise resolving to match results
	 */
	async matchPatterns(
		files: File[],
		patterns: string[],
		options?: PatternMatcherOptions,
	): Promise<PatternMatchResult[]> {
		const results: PatternMatchResult[] = [];

		for (const file of files) {
			if (!this.shouldAnalyzeFile(file, options)) {
				continue;
			}

			const fileResults = await this.matchPatternsInFile(
				file,
				patterns,
				options,
			);
			results.push(...fileResults);
		}

		return results;
	}

	/**
	 * Match patterns in a single file
	 * @param file - File to search
	 * @param patterns - Patterns to match
	 * @param options - Matching options
	 * @returns Promise resolving to match results
	 */
	private async matchPatternsInFile(
		file: File,
		patterns: string[],
		options?: PatternMatcherOptions,
	): Promise<PatternMatchResult[]> {
		const results: PatternMatchResult[] = [];

		try {
			const content = await fs.readFile(file.path, "utf-8");
			const lines = content.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const lineNumber = i + 1;

				for (const pattern of patterns) {
					const match = this.matchPattern(pattern, line, options);
					if (match) {
						results.push({
							filePath: file.path,
							lineNumber,
							content: line,
							confidence: this.calculateConfidence(pattern, line),
						});
					}
				}
			}
		} catch (error) {
			console.warn(`Failed to analyze file ${file.path}:`, error);
		}

		return results;
	}

	/**
	 * Match a single pattern against content
	 * @param pattern - Pattern to match
	 * @param content - Content to search
	 * @param options - Matching options
	 * @returns True if matches
	 */
	private matchPattern(
		pattern: string,
		content: string,
		options?: PatternMatcherOptions,
	): boolean {
		const caseSensitive = options?.caseSensitive ?? false;
		const allowRegex = options?.allowRegex ?? false;

		// Try regex if enabled
		if (allowRegex) {
			try {
				const regex = caseSensitive
					? new RegExp(pattern)
					: new RegExp(pattern, "i");
				return regex.test(content);
			} catch {
				// Not a valid regex, fall through to string matching
			}
		}

		// String matching
		if (caseSensitive) {
			return content.includes(pattern);
		}
		return content.toLowerCase().includes(pattern.toLowerCase());
	}

	/**
	 * Calculate match confidence
	 * @param pattern - Pattern used
	 * @param content - Matched content
	 * @returns Confidence score (0-1)
	 */
	private calculateConfidence(pattern: string, content: string): number {
		const patternLower = pattern.toLowerCase();
		const contentLower = content.toLowerCase();

		// Exact match
		if (contentLower === patternLower) {
			return 1.0;
		}

		// Contains with word boundaries
		const wordBoundaryPattern = new RegExp(`\\b${pattern}\\b`, "i");
		if (wordBoundaryPattern.test(content)) {
			return 0.8;
		}

		// Partial match
		if (contentLower.includes(patternLower)) {
			return 0.5;
		}

		return 0.0;
	}

	/**
	 * Check if file should be analyzed
	 * @param file - File to check
	 * @param options - Options
	 * @returns True if should analyze
	 */
	private shouldAnalyzeFile(
		file: File,
		options?: PatternMatcherOptions,
	): boolean {
		// Skip if exceeds max file size
		if (options?.maxFileSize && file.size > options.maxFileSize) {
			return false;
		}

		// Skip binary files unless included
		if (!options?.includeBinaryFiles && this.isBinaryFile(file)) {
			return false;
		}

		// Only analyze source files
		return this.isSourceFile(file);
	}

	/**
	 * Check if file is binary
	 * @param file - File to check
	 * @returns True if binary
	 */
	private isBinaryFile(file: File): boolean {
		// Common binary extensions
		const binaryExtensions = [
			"png",
			"jpg",
			"jpeg",
			"gif",
			"svg",
			"ico",
			"pdf",
			"zip",
			"tar",
			"gz",
			"exe",
			"dll",
			"so",
			"dylib",
		];

		return binaryExtensions.includes(file.extension.toLowerCase());
	}

	/**
	 * Check if file is source file
	 * @param file - File to check
	 * @returns True if source file
	 */
	private isSourceFile(file: File): boolean {
		const sourceExtensions = ["ts", "tsx", "js", "jsx", "css", "scss", "html"];
		return sourceExtensions.includes(file.extension.toLowerCase());
	}

	/**
	 * Match service pattern (class/function with Service suffix)
	 * @param files - Files to search
	 * @returns Files matching service pattern
	 */
	async matchServicePattern(files: File[]): Promise<File[]> {
		const servicePatterns = [
			"class\\s+\\w+Service",
			"export\\s+(?:class|function|const)\\s+\\w+Service",
			"interface\\s+\\w*Service",
		];

		const matches: File[] = [];

		for (const file of files) {
			const results = await this.matchPatternsInFile(file, servicePatterns, {
				allowRegex: true,
			});

			if (results.length > 0) {
				matches.push(file);
			}
		}

		return matches;
	}

	/**
	 * Match component pattern (React components)
	 * @param files - Files to search
	 * @returns Files matching component pattern
	 */
	async matchComponentPattern(files: File[]): Promise<File[]> {
		const componentPatterns = [
			"export\\s+(?:function|const)\\s+\\w+\\s*[:=]\\s*\\(.*?\\)\\s*=>\\s*{",
			"export\\s+default\\s+(?:function\\s+)?\\w+",
			"return\\s+<[A-Z]\\w*",
		];

		const matches: File[] = [];

		for (const file of files) {
			const results = await this.matchPatternsInFile(file, componentPatterns, {
				allowRegex: true,
			});

			if (results.length > 0) {
				matches.push(file);
			}
		}

		return matches;
	}

	/**
	 * Match API route pattern (Next.js API routes)
	 * @param files - Files to search
	 * @returns Files matching API route pattern
	 */
	async matchApiRoutePattern(files: File[]): Promise<File[]> {
		const apiPatterns = [
			"export\\s+(?:async\\s+)?function\\s+(?:GET|POST|PUT|DELETE|PATCH)",
			"export\\s*\\{\\s*(?:GET|POST|PUT|DELETE|PATCH)\\s*\\}",
			"type\\s*:\\s*['\"]route['\"]",
		];

		const matches: File[] = [];

		for (const file of files) {
			const results = await this.matchPatternsInFile(file, apiPatterns, {
				allowRegex: true,
			});

			if (results.length > 0) {
				matches.push(file);
			}
		}

		return matches;
	}
}
