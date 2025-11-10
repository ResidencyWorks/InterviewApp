/**
 * ServiceDuplication entity
 * @fileoverview Represents instances where similar functionality is implemented multiple times
 */

/**
 * Type of duplication
 */
export type DuplicationType =
	| "interface"
	| "implementation"
	| "logic"
	| "utility";

/**
 * Severity level
 */
export type SeverityLevel = "low" | "medium" | "high" | "critical";

/**
 * Effort or impact level
 */
export type EffortImpactLevel = "low" | "medium" | "high";

/**
 * Instance where similar functionality is implemented multiple times
 */
export interface ServiceDuplication {
	/**
	 * Unique identifier for the duplication
	 */
	id: string;

	/**
	 * Name of the duplicated service
	 */
	serviceName: string;

	/**
	 * File paths where the service is implemented
	 */
	locations: string[];

	/**
	 * Type of duplication
	 */
	duplicationType: DuplicationType;

	/**
	 * Percentage of overlapping functionality (0-100)
	 */
	overlapPercentage: number;

	/**
	 * Severity level
	 */
	severity: SeverityLevel;

	/**
	 * Estimated effort to consolidate
	 */
	consolidationEffort: EffortImpactLevel;

	/**
	 * Impact of consolidation
	 */
	consolidationImpact: EffortImpactLevel;

	/**
	 * Detailed analysis of common elements
	 */
	commonElements?: string[];

	/**
	 * Detailed analysis of unique elements
	 */
	uniqueElements?: string[];

	/**
	 * Timestamp when duplication was detected
	 */
	detectedAt?: Date;
}

/**
 * Validation rules for ServiceDuplication
 */
const VALID_DUPLICATION_TYPES: DuplicationType[] = [
	"interface",
	"implementation",
	"logic",
	"utility",
];

const VALID_SEVERITY_LEVELS: SeverityLevel[] = [
	"low",
	"medium",
	"high",
	"critical",
];

const VALID_EFFORT_LEVELS: EffortImpactLevel[] = ["low", "medium", "high"];

/**
 * Check if duplication type is valid
 * @param type - Type to validate
 * @returns True if valid
 */
export function isValidDuplicationType(type: string): type is DuplicationType {
	return VALID_DUPLICATION_TYPES.includes(type as DuplicationType);
}

/**
 * Check if severity level is valid
 * @param level - Level to validate
 * @returns True if valid
 */
export function isValidSeverityLevel(level: string): level is SeverityLevel {
	return VALID_SEVERITY_LEVELS.includes(level as SeverityLevel);
}

/**
 * Check if effort level is valid
 * @param level - Level to validate
 * @returns True if valid
 */
export function isValidEffortLevel(level: string): level is EffortImpactLevel {
	return VALID_EFFORT_LEVELS.includes(level as EffortImpactLevel);
}

/**
 * Create a new ServiceDuplication instance
 * @param options - Duplication options
 * @returns New ServiceDuplication instance
 */
export function createServiceDuplication(
	options: Partial<ServiceDuplication> & {
		serviceName: string;
		locations: string[];
		duplicationType: DuplicationType;
		overlapPercentage: number;
		severity: SeverityLevel;
		consolidationEffort: EffortImpactLevel;
		consolidationImpact: EffortImpactLevel;
	},
): ServiceDuplication {
	return {
		id: options.id ?? crypto.randomUUID(),
		serviceName: options.serviceName,
		locations: options.locations,
		duplicationType: options.duplicationType,
		overlapPercentage: Math.max(0, Math.min(100, options.overlapPercentage)),
		severity: options.severity,
		consolidationEffort: options.consolidationEffort,
		consolidationImpact: options.consolidationImpact,
		commonElements: options.commonElements ?? [],
		uniqueElements: options.uniqueElements ?? [],
		detectedAt: options.detectedAt ?? new Date(),
	};
}

/**
 * Calculate consolidation priority score
 * @param duplication - Duplication to score
 * @returns Priority score (higher = more urgent)
 */
export function calculateConsolidationPriority(
	duplication: ServiceDuplication,
): number {
	const severityWeight = {
		low: 1,
		medium: 2,
		high: 3,
		critical: 4,
	};
	const impactWeight = {
		low: 1,
		medium: 2,
		high: 3,
	};

	return (
		severityWeight[duplication.severity] +
		impactWeight[duplication.consolidationImpact] -
		impactWeight[duplication.consolidationEffort] +
		duplication.overlapPercentage / 20
	);
}

/**
 * Check if duplication should be addressed immediately
 * @param duplication - Duplication to check
 * @returns True if critical
 */
export function isCriticalDuplication(
	duplication: ServiceDuplication,
): boolean {
	return (
		duplication.severity === "critical" && duplication.overlapPercentage > 80
	);
}
