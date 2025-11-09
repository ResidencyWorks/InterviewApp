/**
 * StructuralInconsistency entity
 * @fileoverview Represents inconsistencies in architectural patterns across the codebase
 */

/**
 * Type of inconsistency
 */
export type InconsistencyType =
	| "naming"
	| "architecture"
	| "interface"
	| "error-handling"
	| "dependency";

/**
 * Level of impact or effort
 */
export type ImpactEffortLevel = "low" | "medium" | "high";

/**
 * Inconsistency in architectural patterns
 */
export interface StructuralInconsistency {
	/**
	 * Unique identifier for the inconsistency
	 */
	id: string;

	/**
	 * Type of inconsistency
	 */
	type: InconsistencyType;

	/**
	 * Description of the inconsistency
	 */
	description: string;

	/**
	 * File paths where inconsistency occurs
	 */
	locations: string[];

	/**
	 * Expected architectural pattern
	 */
	expectedPattern: string;

	/**
	 * Actual pattern being used
	 */
	actualPattern: string;

	/**
	 * Impact on maintainability
	 */
	impact: ImpactEffortLevel;

	/**
	 * Effort required to fix
	 */
	fixEffort: ImpactEffortLevel;

	/**
	 * Detected timestamp
	 */
	detectedAt?: Date;

	/**
	 * Suggested fix
	 */
	suggestedFix?: string;
}

/**
 * Validation rules
 */
const VALID_INCONSISTENCY_TYPES: InconsistencyType[] = [
	"naming",
	"architecture",
	"interface",
	"error-handling",
	"dependency",
];

const VALID_IMPACT_LEVELS: ImpactEffortLevel[] = ["low", "medium", "high"];

/**
 * Check if inconsistency type is valid
 * @param type - Type to validate
 * @returns True if valid
 */
export function isValidInconsistencyType(
	type: string,
): type is InconsistencyType {
	return VALID_INCONSISTENCY_TYPES.includes(type as InconsistencyType);
}

/**
 * Check if impact level is valid
 * @param level - Level to validate
 * @returns True if valid
 */
export function isValidImpactLevel(level: string): level is ImpactEffortLevel {
	return VALID_IMPACT_LEVELS.includes(level as ImpactEffortLevel);
}

/**
 * Create a new StructuralInconsistency instance
 * @param options - Inconsistency options
 * @returns New StructuralInconsistency instance
 */
export function createStructuralInconsistency(
	options: Partial<StructuralInconsistency> & {
		type: InconsistencyType;
		description: string;
		locations: string[];
		expectedPattern: string;
		actualPattern: string;
		impact: ImpactEffortLevel;
		fixEffort: ImpactEffortLevel;
	},
): StructuralInconsistency {
	return {
		id: options.id ?? crypto.randomUUID(),
		type: options.type,
		description: options.description,
		locations: options.locations,
		expectedPattern: options.expectedPattern,
		actualPattern: options.actualPattern,
		impact: options.impact,
		fixEffort: options.fixEffort,
		detectedAt: options.detectedAt ?? new Date(),
		suggestedFix: options.suggestedFix,
	};
}

/**
 * Calculate fix priority score
 * @param inconsistency - Inconsistency to score
 * @returns Priority score
 */
export function calculateFixPriority(
	inconsistency: StructuralInconsistency,
): number {
	const impactWeight = { low: 1, medium: 2, high: 3 };
	const effortWeight = { low: 1, medium: 2, high: 3 };

	const impact = impactWeight[inconsistency.impact];
	const effort = effortWeight[inconsistency.fixEffort];

	return impact * 2 - effort;
}

/**
 * Check if inconsistency is critical
 * @param inconsistency - Inconsistency to check
 * @returns True if critical
 */
export function isCriticalInconsistency(
	inconsistency: StructuralInconsistency,
): boolean {
	return (
		inconsistency.impact === "high" &&
		inconsistency.type === "architecture" &&
		inconsistency.locations.length > 3
	);
}

/**
 * Get priority label for display
 * @param inconsistency - Inconsistency to label
 * @returns Priority label
 */
export function getPriorityLabel(
	inconsistency: StructuralInconsistency,
): string {
	const score = calculateFixPriority(inconsistency);
	if (score >= 4) {
		return "urgent";
	}
	if (score >= 1) {
		return "high";
	}
	return "low";
}
