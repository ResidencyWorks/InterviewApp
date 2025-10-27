/**
 * CleanupRecommendation entity
 * @fileoverview Represents specific actions to improve project structure
 */

/**
 * Type of recommendation
 */
export type RecommendationType =
	| "consolidation"
	| "refactoring"
	| "cleanup"
	| "restructure"
	| "optimization";

/**
 * Priority level for recommendations
 */
export type PriorityLevel = "low" | "medium" | "high" | "critical";

/**
 * Effort or impact level
 */
export type EffortImpactLevel = "low" | "medium" | "high";

/**
 * Recommendation risk information
 */
export interface RecommendationRisk {
	/**
	 * Risk description
	 */
	risk: string;

	/**
	 * Mitigation strategy
	 */
	mitigation: string;

	/**
	 * Likelihood (0-1)
	 */
	likelihood?: number;

	/**
	 * Impact severity
	 */
	impact?: "low" | "medium" | "high";
}

/**
 * File modification action
 */
export interface FileModificationAction {
	/**
	 * File path
	 */
	path: string;

	/**
	 * Action type
	 */
	action: "modify" | "delete" | "create" | "merge" | "split";

	/**
	 * Specific changes to make
	 */
	changes: string[];

	/**
	 * Line numbers if applicable
	 */
	lineNumbers?: {
		start: number;
		end: number;
	};
}

/**
 * Implementation step
 */
export interface ImplementationStep {
	/**
	 * Step number
	 */
	order: number;

	/**
	 * Step description
	 */
	description: string;

	/**
	 * Step type
	 */
	type: "create" | "modify" | "delete" | "test" | "migrate";

	/**
	 * Estimated time in minutes
	 */
	estimatedTime?: number;
}

/**
 * Cleanup recommendation
 */
export interface CleanupRecommendation {
	/**
	 * Unique identifier for the recommendation
	 */
	id: string;

	/**
	 * Short title of the recommendation
	 */
	title: string;

	/**
	 * Detailed description of the recommendation
	 */
	description: string;

	/**
	 * Type of recommendation
	 */
	type: RecommendationType;

	/**
	 * Priority level
	 */
	priority: PriorityLevel;

	/**
	 * Implementation effort
	 */
	effort: EffortImpactLevel;

	/**
	 * Expected impact
	 */
	impact: EffortImpactLevel;

	/**
	 * Files to be modified
	 */
	files: string[] | FileModificationAction[];

	/**
	 * Implementation steps
	 */
	steps: string[] | ImplementationStep[];

	/**
	 * Potential risks and mitigation strategies
	 */
	risks: RecommendationRisk[];

	/**
	 * Dependencies on other recommendations
	 */
	dependencies?: string[];

	/**
	 * Resource requirements
	 */
	resourceRequirements?: {
		time: number; // in minutes
		expertise?: string[];
		tools?: string[];
	};

	/**
	 * Timestamp when recommendation was generated
	 */
	generatedAt?: Date;
}

/**
 * Validation rules
 */
const VALID_RECOMMENDATION_TYPES: RecommendationType[] = [
	"consolidation",
	"refactoring",
	"cleanup",
	"restructure",
	"optimization",
];

const VALID_PRIORITY_LEVELS: PriorityLevel[] = [
	"low",
	"medium",
	"high",
	"critical",
];

const _VALID_EFFORT_LEVELS: EffortImpactLevel[] = ["low", "medium", "high"];

/**
 * Check if recommendation type is valid
 * @param type - Type to validate
 * @returns True if valid
 */
export function isValidRecommendationType(
	type: string,
): type is RecommendationType {
	return VALID_RECOMMENDATION_TYPES.includes(type as RecommendationType);
}

/**
 * Check if priority level is valid
 * @param level - Level to validate
 * @returns True if valid
 */
export function isValidPriorityLevel(level: string): level is PriorityLevel {
	return VALID_PRIORITY_LEVELS.includes(level as PriorityLevel);
}

/**
 * Create a new CleanupRecommendation instance
 * @param options - Recommendation options
 * @returns New CleanupRecommendation instance
 */
export function createCleanupRecommendation(
	options: Partial<CleanupRecommendation> & {
		title: string;
		description: string;
		type: RecommendationType;
		priority: PriorityLevel;
		effort: EffortImpactLevel;
		impact: EffortImpactLevel;
		files: string[] | FileModificationAction[];
		steps: string[] | ImplementationStep[];
		risks: RecommendationRisk[];
	},
): CleanupRecommendation {
	return {
		id: options.id ?? crypto.randomUUID(),
		title: options.title,
		description: options.description,
		type: options.type,
		priority: options.priority,
		effort: options.effort,
		impact: options.impact,
		files: options.files,
		steps: options.steps,
		risks: options.risks,
		dependencies: options.dependencies ?? [],
		resourceRequirements: options.resourceRequirements,
		generatedAt: options.generatedAt ?? new Date(),
	};
}

/**
 * Calculate recommendation value score
 * @param recommendation - Recommendation to score
 * @returns Value score
 */
export function calculateRecommendationValue(
	recommendation: CleanupRecommendation,
): number {
	const priorityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
	const impactWeight = { low: 1, medium: 2, high: 3 };
	const effortWeight = { low: 3, medium: 2, high: 1 };

	const priority = priorityWeight[recommendation.priority];
	const impact = impactWeight[recommendation.impact];
	const effort = effortWeight[recommendation.effort];

	// Value = (Priority * Impact) / Effort
	return (priority * impact) / effort;
}

/**
 * Check if recommendation is quick win
 * @param recommendation - Recommendation to check
 * @returns True if quick win
 */
export function isQuickWin(recommendation: CleanupRecommendation): boolean {
	return recommendation.effort === "low" && recommendation.impact !== "low";
}

/**
 * Check if recommendation is critical
 * @param recommendation - Recommendation to check
 * @returns True if critical
 */
export function isCriticalRecommendation(
	recommendation: CleanupRecommendation,
): boolean {
	return (
		recommendation.priority === "critical" ||
		(recommendation.impact === "high" &&
			recommendation.type === "consolidation")
	);
}
