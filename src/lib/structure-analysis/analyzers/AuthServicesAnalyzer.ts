/**
 * AuthServicesAnalyzer
 * @fileoverview Analyzes authentication services for duplications and inconsistencies
 */

import type { File } from "../entities/File.js";
import type { ServiceDuplication } from "../entities/ServiceDuplication.js";
import { createServiceDuplication } from "../entities/ServiceDuplication.js";
import type { StructuralInconsistency } from "../entities/StructuralInconsistency.js";
import { createStructuralInconsistency } from "../entities/StructuralInconsistency.js";
import { PatternMatcher } from "../services/PatternMatcher.js";

/**
 * Authentication service analysis result
 */
export interface AuthServicesAnalysisResult {
	/**
	 * Authentication service files found
	 */
	authFiles: File[];

	/**
	 * Duplications found
	 */
	duplications: ServiceDuplication[];

	/**
	 * Inconsistencies found
	 */
	inconsistencies: StructuralInconsistency[];

	/**
	 * Analysis summary
	 */
	summary: {
		totalAuthFiles: number;
		duplicationCount: number;
		inconsistencyCount: number;
		severityBreakdown: {
			low: number;
			medium: number;
			high: number;
			critical: number;
		};
	};
}

/**
 * Authentication services analyzer
 */
export class AuthServicesAnalyzer {
	private patternMatcher = new PatternMatcher();

	/**
	 * Analyze authentication services
	 * @param files - Files to analyze
	 * @returns Promise resolving to analysis result
	 */
	async analyzeAuthServices(
		files: File[],
	): Promise<AuthServicesAnalysisResult> {
		// Find authentication-related files
		const authFiles = await this.findAuthFiles(files);

		// Analyze for duplications
		const duplications = await this.analyzeDuplications(authFiles);

		// Analyze for inconsistencies
		const inconsistencies = await this.analyzeInconsistencies(authFiles);

		// Calculate summary
		const summary = this.calculateSummary(
			authFiles,
			duplications,
			inconsistencies,
		);

		return {
			authFiles,
			duplications,
			inconsistencies,
			summary,
		};
	}

	/**
	 * Find authentication-related files
	 * @param files - All files to search
	 * @returns Promise resolving to auth files
	 */
	private async findAuthFiles(files: File[]): Promise<File[]> {
		const authPatterns = [
			"auth",
			"authentication",
			"login",
			"logout",
			"signin",
			"signout",
			"session",
			"token",
			"jwt",
			"oauth",
			"supabase",
		];

		const authFiles: File[] = [];

		for (const file of files) {
			const fileName = file.name.toLowerCase();
			const filePath = file.path.toLowerCase();

			// Check if file is auth-related by name or path
			const isAuthFile = authPatterns.some(
				(pattern) => fileName.includes(pattern) || filePath.includes(pattern),
			);

			if (isAuthFile) {
				authFiles.push(file);
			}
		}

		// Also check for auth service patterns in source files
		const sourceFiles = files.filter((f) =>
			["ts", "tsx", "js", "jsx"].includes(f.extension.toLowerCase()),
		);

		const servicePatterns = [
			"class\\s+\\w*Auth\\w*Service",
			"export\\s+(?:class|function|const)\\s+\\w*Auth\\w*",
			"interface\\s+\\w*Auth\\w*",
			"type\\s+\\w*Auth\\w*",
		];

		for (const file of sourceFiles) {
			const results = await this.patternMatcher.matchPatterns(
				[file],
				servicePatterns,
				{
					allowRegex: true,
				},
			);

			if (results.length > 0 && !authFiles.includes(file)) {
				authFiles.push(file);
			}
		}

		return authFiles;
	}

	/**
	 * Analyze duplications in auth files
	 * @param authFiles - Auth files to analyze
	 * @returns Promise resolving to duplications
	 */
	private async analyzeDuplications(
		authFiles: File[],
	): Promise<ServiceDuplication[]> {
		const duplications: ServiceDuplication[] = [];

		// Group files by similar functionality
		const groups = this.groupAuthFilesByFunctionality(authFiles);

		for (const group of groups) {
			if (group.length > 1) {
				const duplication = this.createDuplicationFromGroup(group);
				if (duplication) {
					duplications.push(duplication);
				}
			}
		}

		return duplications;
	}

	/**
	 * Group auth files by functionality
	 * @param authFiles - Auth files to group
	 * @returns Grouped files
	 */
	private groupAuthFilesByFunctionality(authFiles: File[]): File[][] {
		const groups: File[][] = [];
		const processed = new Set<string>();

		for (const file of authFiles) {
			if (processed.has(file.path)) {
				continue;
			}

			const group = [file];
			processed.add(file.path);

			// Find similar files
			for (const otherFile of authFiles) {
				if (processed.has(otherFile.path)) {
					continue;
				}

				if (this.areFilesSimilar(file, otherFile)) {
					group.push(otherFile);
					processed.add(otherFile.path);
				}
			}

			groups.push(group);
		}

		return groups;
	}

	/**
	 * Check if two files are similar
	 * @param file1 - First file
	 * @param file2 - Second file
	 * @returns True if similar
	 */
	private areFilesSimilar(file1: File, file2: File): boolean {
		// Check by name similarity
		const name1 = file1.name.toLowerCase();
		const name2 = file2.name.toLowerCase();

		// Check for common auth patterns
		const authPatterns = ["auth", "login", "session", "token"];
		const hasCommonPattern = authPatterns.some(
			(pattern) => name1.includes(pattern) && name2.includes(pattern),
		);

		if (hasCommonPattern) {
			return true;
		}

		// Check by path similarity
		const path1 = file1.path.toLowerCase();
		const path2 = file2.path.toLowerCase();

		// If both are in auth-related directories
		const authDirs = ["auth", "authentication", "login"];
		const inSameAuthDir = authDirs.some(
			(dir) => path1.includes(dir) && path2.includes(dir),
		);

		return inSameAuthDir;
	}

	/**
	 * Create duplication from file group
	 * @param group - File group
	 * @returns Service duplication or null
	 */
	private createDuplicationFromGroup(group: File[]): ServiceDuplication | null {
		if (group.length < 2) {
			return null;
		}

		const locations = group.map((f) => f.path);
		const serviceName = this.extractServiceName(group[0]);

		// Calculate overlap percentage (simplified)
		const overlapPercentage = this.calculateOverlapPercentage(group);

		// Determine severity
		const severity = this.determineDuplicationSeverity(
			group,
			overlapPercentage,
		);

		// Determine effort and impact
		const consolidationEffort = this.determineConsolidationEffort(group);
		const consolidationImpact = this.determineConsolidationImpact(group);

		return createServiceDuplication({
			serviceName,
			locations,
			duplicationType: "implementation",
			overlapPercentage,
			severity,
			consolidationEffort,
			consolidationImpact,
		});
	}

	/**
	 * Extract service name from file
	 * @param file - File to extract name from
	 * @returns Service name
	 */
	private extractServiceName(file: File): string {
		const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
		return `${name.charAt(0).toUpperCase() + name.slice(1)}Service`;
	}

	/**
	 * Calculate overlap percentage
	 * @param group - File group
	 * @returns Overlap percentage
	 */
	private calculateOverlapPercentage(group: File[]): number {
		// Simplified calculation based on file names and paths
		const names = group.map((f) => f.name.toLowerCase());
		const paths = group.map((f) => f.path.toLowerCase());

		let commonElements = 0;
		const totalElements = names.length + paths.length;

		// Check for common name patterns
		const authPatterns = ["auth", "login", "session", "token"];
		for (const pattern of authPatterns) {
			const hasPattern = names.some((name) => name.includes(pattern));
			if (hasPattern) {
				commonElements += names.filter((name) => name.includes(pattern)).length;
			}
		}

		// Check for common path patterns
		const pathPatterns = ["auth", "authentication"];
		for (const pattern of pathPatterns) {
			const hasPattern = paths.some((path) => path.includes(pattern));
			if (hasPattern) {
				commonElements += paths.filter((path) => path.includes(pattern)).length;
			}
		}

		return Math.min(100, (commonElements / totalElements) * 100);
	}

	/**
	 * Determine duplication severity
	 * @param group - File group
	 * @param overlapPercentage - Overlap percentage
	 * @returns Severity level
	 */
	private determineDuplicationSeverity(
		group: File[],
		overlapPercentage: number,
	): ServiceDuplication["severity"] {
		if (group.length >= 4 && overlapPercentage > 80) {
			return "critical";
		}
		if (group.length >= 3 && overlapPercentage > 60) {
			return "high";
		}
		if (group.length >= 2 && overlapPercentage > 40) {
			return "medium";
		}
		return "low";
	}

	/**
	 * Determine consolidation effort
	 * @param group - File group
	 * @returns Effort level
	 */
	private determineConsolidationEffort(
		group: File[],
	): ServiceDuplication["consolidationEffort"] {
		if (group.length >= 4) {
			return "high";
		}
		if (group.length >= 3) {
			return "medium";
		}
		return "low";
	}

	/**
	 * Determine consolidation impact
	 * @param group - File group
	 * @returns Impact level
	 */
	private determineConsolidationImpact(
		_group: File[],
	): ServiceDuplication["consolidationImpact"] {
		// Auth services are critical, so consolidation has high impact
		return "high";
	}

	/**
	 * Analyze inconsistencies in auth files
	 * @param authFiles - Auth files to analyze
	 * @returns Promise resolving to inconsistencies
	 */
	private async analyzeInconsistencies(
		authFiles: File[],
	): Promise<StructuralInconsistency[]> {
		const inconsistencies: StructuralInconsistency[] = [];

		// Check naming conventions
		const namingInconsistencies = this.checkNamingConventions(authFiles);
		inconsistencies.push(...namingInconsistencies);

		// Check architectural patterns
		const architecturalInconsistencies =
			await this.checkArchitecturalPatterns(authFiles);
		inconsistencies.push(...architecturalInconsistencies);

		return inconsistencies;
	}

	/**
	 * Check naming conventions
	 * @param authFiles - Auth files to check
	 * @returns Naming inconsistencies
	 */
	private checkNamingConventions(authFiles: File[]): StructuralInconsistency[] {
		const inconsistencies: StructuralInconsistency[] = [];

		// Check for inconsistent naming patterns
		const kebabCaseFiles = authFiles.filter((f) => f.name.includes("-"));
		const pascalCaseFiles = authFiles.filter((f) => /^[A-Z]/.test(f.name));
		const camelCaseFiles = authFiles.filter((f) => /^[a-z]/.test(f.name));

		if (
			kebabCaseFiles.length > 0 &&
			(pascalCaseFiles.length > 0 || camelCaseFiles.length > 0)
		) {
			const locations = [
				...kebabCaseFiles,
				...pascalCaseFiles,
				...camelCaseFiles,
			].map((f) => f.path);

			inconsistencies.push(
				createStructuralInconsistency({
					type: "naming",
					description: "Inconsistent naming conventions across auth services",
					locations,
					expectedPattern: "kebab-case",
					actualPattern: "mixed-case",
					impact: "medium",
					fixEffort: "low",
				}),
			);
		}

		return inconsistencies;
	}

	/**
	 * Check architectural patterns
	 * @param authFiles - Auth files to check
	 * @returns Architectural inconsistencies
	 */
	private async checkArchitecturalPatterns(
		authFiles: File[],
	): Promise<StructuralInconsistency[]> {
		const inconsistencies: StructuralInconsistency[] = [];

		// Check for interface consistency
		const interfacePatterns = [
			"interface\\s+\\w*Auth\\w*",
			"export\\s+interface\\s+\\w*Auth\\w*",
		];

		const hasInterfaces = await Promise.all(
			authFiles.map(async (file) => {
				const results = await this.patternMatcher.matchPatterns(
					[file],
					interfacePatterns,
					{
						allowRegex: true,
					},
				);
				return results.length > 0;
			}),
		);

		const interfaceCount = hasInterfaces.filter(Boolean).length;
		if (interfaceCount > 0 && interfaceCount < authFiles.length) {
			const locations = authFiles.map((f) => f.path);

			inconsistencies.push(
				createStructuralInconsistency({
					type: "interface",
					description: "Inconsistent interface usage across auth services",
					locations,
					expectedPattern: "All services implement interfaces",
					actualPattern: "Mixed interface usage",
					impact: "medium",
					fixEffort: "medium",
				}),
			);
		}

		return inconsistencies;
	}

	/**
	 * Calculate analysis summary
	 * @param authFiles - Auth files
	 * @param duplications - Duplications found
	 * @param inconsistencies - Inconsistencies found
	 * @returns Analysis summary
	 */
	private calculateSummary(
		authFiles: File[],
		duplications: ServiceDuplication[],
		inconsistencies: StructuralInconsistency[],
	) {
		const severityBreakdown = {
			low: 0,
			medium: 0,
			high: 0,
			critical: 0,
		};

		// Count duplications by severity
		for (const dup of duplications) {
			severityBreakdown[dup.severity]++;
		}

		// Count inconsistencies by impact
		for (const inc of inconsistencies) {
			if (inc.impact === "high") {
				severityBreakdown.high++;
			} else if (inc.impact === "medium") {
				severityBreakdown.medium++;
			} else {
				severityBreakdown.low++;
			}
		}

		return {
			totalAuthFiles: authFiles.length,
			duplicationCount: duplications.length,
			inconsistencyCount: inconsistencies.length,
			severityBreakdown,
		};
	}
}
