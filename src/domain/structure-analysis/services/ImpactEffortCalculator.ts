/**
 * ImpactEffortCalculator service
 */

export interface ImpactEffortInput {
	impact: "low" | "medium" | "high";
	effort: "low" | "medium" | "high";
	severity?: "low" | "medium" | "high" | "critical";
}

export class ImpactEffortCalculator {
	score(input: ImpactEffortInput): number {
		const impactWeight = { low: 1, medium: 2, high: 3 };
		const effortWeight = { low: 1, medium: 2, high: 3 };
		const severityWeight = { low: 0, medium: 1, high: 2, critical: 3 };
		const impact = impactWeight[input.impact];
		const effort = effortWeight[input.effort];
		const severity = severityWeight[input.severity ?? "low"];
		// Higher score is better to prioritize
		return impact * 3 + severity * 2 - effort;
	}
}
