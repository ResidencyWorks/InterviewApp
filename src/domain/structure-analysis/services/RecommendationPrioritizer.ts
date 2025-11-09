import type { CleanupRecommendation } from "../entities/CleanupRecommendation";
import { ImpactEffortCalculator } from "./ImpactEffortCalculator";

export class RecommendationPrioritizer {
	private calculator = new ImpactEffortCalculator();

	prioritize(recs: CleanupRecommendation[]): CleanupRecommendation[] {
		return [...recs].sort((a, b) => this.score(b) - this.score(a));
	}

	private score(rec: CleanupRecommendation): number {
		return this.calculator.score({
			impact: rec.impact,
			effort: rec.effort,
			severity:
				rec.priority === "critical"
					? "critical"
					: rec.priority === "high"
						? "high"
						: rec.priority === "medium"
							? "medium"
							: "low",
		});
	}
}
