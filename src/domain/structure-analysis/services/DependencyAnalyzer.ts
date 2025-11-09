/**
 * DependencyAnalyzer service
 * @fileoverview Analyzes file dependencies and import relationships
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { File } from "../entities/File";

/**
 * Dependency analysis options
 */
export interface DependencyAnalyzerOptions {
	/**
	 * Enable circular dependency detection
	 */
	detectCircularDependencies?: boolean;

	/**
	 * Enable unused dependency detection
	 */
	detectUnusedDependencies?: boolean;

	/**
	 * Enable external dependency analysis
	 */
	analyzeExternalDeps?: boolean;

	/**
	 * Ignore patterns for dependencies
	 */
	ignorePatterns?: string[];
}

/**
 * Dependency analysis result
 */
export interface DependencyAnalysisResult {
	/**
	 * Dependency graph (file -> dependencies[])
	 */
	dependencyGraph: Map<string, string[]>;

	/**
	 * Reverse dependency graph (file -> dependents[])
	 */
	reverseGraph: Map<string, string[]>;

	/**
	 * Circular dependencies found
	 */
	circularDependencies: string[][];

	/**
	 * Unused files (no dependents)
	 */
	unusedFiles: string[];

	/**
	 * External dependencies map
	 */
	externalDependencies: Map<string, string[]>;

	/**
	 * Analysis duration in milliseconds
	 */
	durationMs: number;
}

/**
 * Dependency analyzer service
 */
export class DependencyAnalyzer {
	/**
	 * Analyze file dependencies
	 * @param files - Files to analyze
	 * @param options - Analysis options
	 * @returns Promise resolving to dependency analysis result
	 */
	async analyzeDependencies(
		files: File[],
		options?: DependencyAnalyzerOptions,
	): Promise<DependencyAnalysisResult> {
		const startTime = Date.now();
		const dependencyGraph = new Map<string, string[]>();
		const reverseGraph = new Map<string, string[]>();
		const circularDependencies: string[][] = [];
		const unusedFiles: string[] = [];
		const externalDependencies = new Map<string, string[]>();

		// Build dependency graphs
		for (const file of files) {
			if (!this.isSourceFile(file)) {
				continue;
			}

			const deps = await this.extractDependencies(file);
			dependencyGraph.set(file.path, deps);

			// Build reverse graph
			for (const dep of deps) {
				if (!reverseGraph.has(dep)) {
					reverseGraph.set(dep, []);
				}
				reverseGraph.get(dep)?.push(file.path);
			}

			// Track external dependencies
			const externalDeps = deps.filter(
				(dep) => !this.isInternalFile(dep, files),
			);
			if (externalDeps.length > 0) {
				externalDependencies.set(file.path, externalDeps);
			}
		}

		// Detect circular dependencies if enabled
		if (options?.detectCircularDependencies) {
			for (const file of files) {
				const cycles = this.detectCircularDependency(
					file.path,
					dependencyGraph,
				);
				if (cycles.length > 0) {
					circularDependencies.push(...cycles);
				}
			}
		}

		// Detect unused files if enabled
		if (options?.detectUnusedDependencies) {
			for (const file of files) {
				if (!this.isSourceFile(file)) {
					continue;
				}
				const dependents = reverseGraph.get(file.path) || [];
				if (dependents.length === 0) {
					unusedFiles.push(file.path);
				}
			}
		}

		return {
			dependencyGraph,
			reverseGraph,
			circularDependencies,
			unusedFiles,
			externalDependencies,
			durationMs: Date.now() - startTime,
		};
	}

	/**
	 * Extract dependencies from a file
	 * @param file - File to analyze
	 * @returns Promise resolving to dependency paths
	 */
	private async extractDependencies(file: File): Promise<string[]> {
		const dependencies: string[] = [];

		try {
			const content = await fs.readFile(file.path, "utf-8");

			// Match import/require statements
			const importRegex =
				/(?:import|export)\s+(?:.*?\s+from\s+|require\()['"](.+?)['"]/g;

			let match: RegExpExecArray | null;
			match = importRegex.exec(content);
			while (match !== null) {
				const importPath = match[1];

				// Resolve relative paths
				const resolvedPath = this.resolveImportPath(file.path, importPath);
				if (resolvedPath) {
					dependencies.push(resolvedPath);
				}
				match = importRegex.exec(content);
			}
		} catch (error) {
			console.warn(`Failed to read file ${file.path}:`, error);
		}

		return dependencies;
	}

	/**
	 * Resolve import path to file path
	 * @param fromPath - Source file path
	 * @param importPath - Import path
	 * @returns Resolved file path or null
	 */
	private resolveImportPath(
		fromPath: string,
		importPath: string,
	): string | null {
		const dir = path.dirname(fromPath);

		// Skip external dependencies
		if (importPath.startsWith("http://") || importPath.startsWith("https://")) {
			return null;
		}

		// Handle relative imports
		if (importPath.startsWith(".")) {
			const resolved = path.resolve(dir, importPath);

			// Try with extensions
			for (const ext of ["", ".ts", ".tsx", ".js", ".jsx"]) {
				const candidate = resolved + ext;
				if (this.fileExists(candidate)) {
					return candidate;
				}
			}

			// Try as directory with index
			const candidate = path.join(resolved, "index.ts");
			if (this.fileExists(candidate)) {
				return candidate;
			}
		}

		// Handle absolute imports (within src/)
		if (importPath.startsWith("@/") || importPath.startsWith("~/")) {
			const cleanPath = importPath.replace(/^@|^~/, "");
			const rootPath = this.findSrcRoot(fromPath);
			if (rootPath) {
				const resolved = path.join(rootPath, cleanPath);

				// Try with extensions
				for (const ext of ["", ".ts", ".tsx", ".js", ".jsx"]) {
					const candidate = resolved + ext;
					if (this.fileExists(candidate)) {
						return candidate;
					}
				}
			}
		}

		return null;
	}

	/**
	 * Detect circular dependencies
	 * @param startPath - Starting path
	 * @param dependencyGraph - Dependency graph
	 * @returns Array of circular paths
	 */
	private detectCircularDependency(
		startPath: string,
		dependencyGraph: Map<string, string[]>,
	): string[][] {
		const cycles: string[][] = [];
		const visited = new Set<string>();
		const recursionStack: string[] = [];

		const dfs = (currentPath: string): void => {
			visited.add(currentPath);
			recursionStack.push(currentPath);

			const dependencies = dependencyGraph.get(currentPath) || [];
			for (const dep of dependencies) {
				if (recursionStack.includes(dep)) {
					// Found a cycle
					const cycleStart = recursionStack.indexOf(dep);
					cycles.push([...recursionStack.slice(cycleStart), dep]);
				} else if (!visited.has(dep)) {
					dfs(dep);
				}
			}

			recursionStack.pop();
		};

		dfs(startPath);
		return cycles;
	}

	/**
	 * Check if file is source file
	 * @param file - File to check
	 * @returns True if source file
	 */
	private isSourceFile(file: File): boolean {
		return ["ts", "tsx", "js", "jsx"].includes(file.extension.toLowerCase());
	}

	/**
	 * Check if file is internal (within project)
	 * @param filePath - File path to check
	 * @param files - All project files
	 * @returns True if internal
	 */
	private isInternalFile(filePath: string, files: File[]): boolean {
		return files.some((f) => f.path === filePath);
	}

	/**
	 * Check if file exists synchronously
	 * @param filePath - File path to check
	 * @returns True if exists
	 */
	private fileExists(filePath: string): boolean {
		try {
			return require("node:fs").existsSync(filePath);
		} catch {
			return false;
		}
	}

	/**
	 * Find src root directory
	 * @param filePath - Current file path
	 * @returns Src root path or null
	 */
	private findSrcRoot(filePath: string): string | null {
		const parts = filePath.split(path.sep);
		const srcIndex = parts.indexOf("src");
		if (srcIndex !== -1) {
			return parts.slice(0, srcIndex + 1).join(path.sep);
		}
		return null;
	}

	/**
	 * Get files that depend on a given file
	 * @param filePath - File to check
	 * @param reverseGraph - Reverse dependency graph
	 * @returns Array of dependent file paths
	 */
	getDependents(
		filePath: string,
		reverseGraph: Map<string, string[]>,
	): string[] {
		return reverseGraph.get(filePath) || [];
	}

	/**
	 * Get files that a given file depends on
	 * @param filePath - File to check
	 * @param dependencyGraph - Dependency graph
	 * @returns Array of dependency file paths
	 */
	getDependencies(
		filePath: string,
		dependencyGraph: Map<string, string[]>,
	): string[] {
		return dependencyGraph.get(filePath) || [];
	}
}
