/**
 * AnalyticsServicesAnalyzer
 * @fileoverview Analyzes analytics services for duplications and inconsistencies
 */

import type { File } from "../entities/File.js";
import type { ServiceDuplication } from "../entities/ServiceDuplication.js";
import { createServiceDuplication } from "../entities/ServiceDuplication.js";
import type { StructuralInconsistency } from "../entities/StructuralInconsistency.js";
import { createStructuralInconsistency } from "../entities/StructuralInconsistency.js";
import { PatternMatcher } from "../services/PatternMatcher.js";

/**
 * Analytics service analysis result
 */
export interface AnalyticsServicesAnalysisResult {
	/**
	 * Analytics service files found
	 */
	analyticsFiles: File[];

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
		totalAnalyticsFiles: number;
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
 * Analytics services analyzer
 */
export class AnalyticsServicesAnalyzer {
	private patternMatcher = new PatternMatcher();

	/**
	 * Analyze analytics services
	 * @param files - Files to analyze
	 * @returns Promise resolving to analysis result
	 */
	async analyzeAnalyticsServices(
		files: File[],
	): Promise<AnalyticsServicesAnalysisResult> {
		// Find analytics-related files
		const analyticsFiles = await this.findAnalyticsFiles(files);

		// Analyze for duplications
		const duplications = await this.analyzeDuplications(analyticsFiles);

		// Analyze for inconsistencies
		const inconsistencies = await this.analyzeInconsistencies(analyticsFiles);

		// Calculate summary
		const summary = this.calculateSummary(
			analyticsFiles,
			duplications,
			inconsistencies,
		);

		return {
			analyticsFiles,
			duplications,
			inconsistencies,
			summary,
		};
	}

	/**
	 * Find analytics-related files
	 * @param files - All files to search
	 * @returns Promise resolving to analytics files
	 */
	private async findAnalyticsFiles(files: File[]): Promise<File[]> {
		const analyticsPatterns = [
			"analytics",
			"tracking",
			"metrics",
			"telemetry",
			"posthog",
			"sentry",
			"monitoring",
			"logging",
			"events",
			"vitals",
			"performance",
		];

		const analyticsFiles: File[] = [];

		for (const file of files) {
			const fileName = file.name.toLowerCase();
			const filePath = file.path.toLowerCase();

			// Check if file is analytics-related by name or path
			const isAnalyticsFile = analyticsPatterns.some(
				(pattern) => fileName.includes(pattern) || filePath.includes(pattern),
			);

			if (isAnalyticsFile) {
				analyticsFiles.push(file);
			}
		}

		// Also check for analytics service patterns in source files
		const sourceFiles = files.filter((f) =>
			["ts", "tsx", "js", "jsx"].includes(f.extension.toLowerCase()),
		);

		const servicePatterns = [
			"class\\s+\\w*Analytics\\w*Service",
			"export\\s+(?:class|function|const)\\s+\\w*Analytics\\w*",
			"interface\\s+\\w*Analytics\\w*",
			"type\\s+\\w*Analytics\\w*",
			"posthog",
			"sentry",
		];

		for (const file of sourceFiles) {
			const results = await this.patternMatcher.matchPatterns(
				[file],
				servicePatterns,
				{
					allowRegex: true,
				},
			);

			if (results.length > 0 && !analyticsFiles.includes(file)) {
				analyticsFiles.push(file);
			}
		}

		return analyticsFiles;
	}

	/**
	 * Analyze duplications in analytics files
	 * @param analyticsFiles - Analytics files to analyze
	 * @returns Promise resolving to duplications
	 */
	private async analyzeDuplications(
		analyticsFiles: File[],
	): Promise<ServiceDuplication[]> {
		const duplications: ServiceDuplication[] = [];

		// Group files by similar functionality
		const groups = this.groupAnalyticsFilesByFunctionality(analyticsFiles);

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
	 * Group analytics files by functionality
	 * @param analyticsFiles - Analytics files to group
	 * @returns Grouped files
	 */
	private groupAnalyticsFilesByFunctionality(analyticsFiles: File[]): File[][] {
		const groups: File[][] = [];
		const processed = new Set<string>();

		for (const file of analyticsFiles) {
			if (processed.has(file.path)) {
				continue;
			}

			const group = [file];
			processed.add(file.path);

			// Find similar files
			for (const otherFile of analyticsFiles) {
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

		// Check for common analytics patterns
		const analyticsPatterns = [
			"analytics",
			"tracking",
			"metrics",
			"posthog",
			"sentry",
		];
		const hasCommonPattern = analyticsPatterns.some(
			(pattern) => name1.includes(pattern) && name2.includes(pattern),
		);

		if (hasCommonPattern) {
			return true;
		}

		// Check by path similarity
		const path1 = file1.path.toLowerCase();
		const path2 = file2.path.toLowerCase();

		// If both are in analytics-related directories
		const analyticsDirs = ["analytics", "tracking", "monitoring"];
		const inSameAnalyticsDir = analyticsDirs.some(
			(dir) => path1.includes(dir) && path2.includes(dir),
		);

		return inSameAnalyticsDir;
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
		const analyticsPatterns = [
			"analytics",
			"tracking",
			"metrics",
			"posthog",
			"sentry",
		];
		for (const pattern of analyticsPatterns) {
			const hasPattern = names.some((name) => name.includes(pattern));
			if (hasPattern) {
				commonElements += names.filter((name) => name.includes(pattern)).length;
			}
		}

		// Check for common path patterns
		const pathPatterns = ["analytics", "tracking", "monitoring"];
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
		group: File[],
	): ServiceDuplication["consolidationImpact"] {
		// Analytics services are important for monitoring, so consolidation has medium-high impact
		return group.length >= 3 ? "high" : "medium";
	}

	/**
	 * Analyze inconsistencies in analytics files
	 * @param analyticsFiles - Analytics files to analyze
	 * @returns Promise resolving to inconsistencies
	 */
	private async analyzeInconsistencies(
		analyticsFiles: File[],
	): Promise<StructuralInconsistency[]> {
		const inconsistencies: StructuralInconsistency[] = [];

		// Check naming conventions
		const namingInconsistencies = this.checkNamingConventions(analyticsFiles);
		inconsistencies.push(...namingInconsistencies);

		// Check architectural patterns
		const architecturalInconsistencies =
			await this.checkArchitecturalPatterns(analyticsFiles);
		inconsistencies.push(...architecturalInconsistencies);

		// Check event tracking patterns
		const eventTrackingInconsistencies =
			await this.checkEventTrackingPatterns(analyticsFiles);
		inconsistencies.push(...eventTrackingInconsistencies);

		return inconsistencies;
	}

	/**
	 * Check naming conventions
	 * @param analyticsFiles - Analytics files to check
	 * @returns Naming inconsistencies
	 */
	private checkNamingConventions(
		analyticsFiles: File[],
	): StructuralInconsistency[] {
		const inconsistencies: StructuralInconsistency[] = [];

		// Check for inconsistent naming patterns
		const kebabCaseFiles = analyticsFiles.filter((f) => f.name.includes("-"));
		const pascalCaseFiles = analyticsFiles.filter((f) => /^[A-Z]/.test(f.name));
		const camelCaseFiles = analyticsFiles.filter((f) => /^[a-z]/.test(f.name));

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
					description:
						"Inconsistent naming conventions across analytics services",
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
	 * @param analyticsFiles - Analytics files to check
	 * @returns Architectural inconsistencies
	 */
	private async checkArchitecturalPatterns(
		analyticsFiles: File[],
	): Promise<StructuralInconsistency[]> {
		const inconsistencies: StructuralInconsistency[] = [];

		// Check for interface consistency
		const interfacePatterns = [
			"interface\\s+\\w*Analytics\\w*",
			"export\\s+interface\\s+\\w*Analytics\\w*",
		];

		const hasInterfaces = await Promise.all(
			analyticsFiles.map(async (file) => {
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
		if (interfaceCount > 0 && interfaceCount < analyticsFiles.length) {
			const locations = analyticsFiles.map((f) => f.path);

			inconsistencies.push(
				createStructuralInconsistency({
					type: "interface",
					description: "Inconsistent interface usage across analytics services",
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
	 * Check event tracking patterns
	 * @param analyticsFiles - Analytics files to check
	 * @returns Event tracking inconsistencies
	 */
	private async checkEventTrackingPatterns(
		analyticsFiles: File[],
	): Promise<StructuralInconsistency[]> {
		const inconsistencies: StructuralInconsistency[] = [];

		// Check for consistent event tracking patterns
		const eventPatterns = [
			"track\\s*\\(",
			"capture\\s*\\(",
			"identify\\s*\\(",
			"posthog\\.capture",
			"sentry\\.capture",
		];

		const hasEventTracking = await Promise.all(
			analyticsFiles.map(async (file) => {
				const results = await this.patternMatcher.matchPatterns(
					[file],
					eventPatterns,
					{
						allowRegex: true,
					},
				);
				return results.length > 0;
			}),
		);

		const trackingCount = hasEventTracking.filter(Boolean).length;
		if (trackingCount > 0 && trackingCount < analyticsFiles.length) {
			const locations = analyticsFiles.map((f) => f.path);

			inconsistencies.push(
				createStructuralInconsistency({
					type: "architecture",
					description:
						"Inconsistent event tracking patterns across analytics services",
					locations,
					expectedPattern: "Consistent event tracking interface",
					actualPattern: "Mixed tracking implementations",
					impact: "high",
					fixEffort: "medium",
				}),
			);
		}

		return inconsistencies;
	}

	/**
	 * Calculate analysis summary
	 * @param analyticsFiles - Analytics files
	 * @param duplications - Duplications found
	 * @param inconsistencies - Inconsistencies found
	 * @returns Analysis summary
	 */
	private calculateSummary(
		analyticsFiles: File[],
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
			totalAnalyticsFiles: analyticsFiles.length,
			duplicationCount: duplications.length,
			inconsistencyCount: inconsistencies.length,
			severityBreakdown,
		};
	}
}
