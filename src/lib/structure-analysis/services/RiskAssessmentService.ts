/**
 * RiskAssessmentService
 */

export interface RiskInput {
	changeSurface: "small" | "medium" | "large";
	securitySensitivity: "low" | "medium" | "high";
	rollbackEase: "easy" | "moderate" | "hard";
}

export class RiskAssessmentService {
	assess(input: RiskInput): { risk: "low" | "medium" | "high"; score: number } {
		const surface = { small: 1, medium: 2, large: 3 }[input.changeSurface];
		const security = { low: 1, medium: 2, high: 3 }[input.securitySensitivity];
		const rollback = { easy: 1, moderate: 2, hard: 3 }[input.rollbackEase];
		const score = surface * 1.5 + security * 2 + rollback * 1.2;
		return { risk: score >= 7 ? "high" : score >= 4 ? "medium" : "low", score };
	}
}
