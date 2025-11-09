import type { CleanupRecommendation } from "../entities/CleanupRecommendation";

export class ConsolidationStrategyPlanner {
	plan(_recommendation: CleanupRecommendation): string[] {
		const steps: string[] = [];
		steps.push("Identify source of truth service");
		steps.push("Define contract and interfaces");
		steps.push("Refactor duplicate services to use the unified service");
		steps.push("Add tests for critical paths");
		steps.push("Remove deprecated code");
		return steps;
	}
}
