import type { CleanupRecommendation } from "../entities/CleanupRecommendation.js";

export class MigrationPlanGenerator {
	generate(recommendation: CleanupRecommendation): {
		steps: string[];
		estimateHours: number;
	} {
		const steps = [
			"Create migration branch",
			"Implement unified service",
			"Replace imports and run tests",
			"Document changes and deploy",
		];
		const estimateHours = Math.max(
			2,
			Math.ceil(recommendation.files.length / 3),
		);
		return { steps, estimateHours };
	}
}
