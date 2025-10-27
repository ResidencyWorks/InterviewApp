import type { CleanupRecommendation } from "../entities/CleanupRecommendation";
import { createCleanupRecommendation } from "../entities/CleanupRecommendation";
import type { ProjectStructure } from "../entities/ProjectStructure";
import { ImpactEffortCalculator } from "./ImpactEffortCalculator";

export class RecommendationGeneratorService {
	private calculator = new ImpactEffortCalculator();

	generate(structure: ProjectStructure): CleanupRecommendation[] {
		const recs: CleanupRecommendation[] = [];
		for (const dup of structure.duplications) {
			const score = this.calculator.score({
				impact: dup.consolidationImpact,
				effort: dup.consolidationEffort,
				severity: dup.severity,
			});
			if (score >= 4) {
				recs.push(
					createCleanupRecommendation({
						title: `Consolidate ${dup.serviceName}`,
						description: `Consolidate duplicated implementations of ${dup.serviceName}.`,
						type: "consolidation",
						priority:
							dup.severity === "critical"
								? "critical"
								: dup.severity === "high"
									? "high"
									: "medium",
						effort: dup.consolidationEffort,
						impact: dup.consolidationImpact,
						files: dup.locations,
						steps: [
							"Define unified interface",
							"Refactor implementations to single service",
							"Update imports and remove duplicates",
						],
						risks: [
							{
								risk: "Behavior change",
								mitigation: "Add unit and integration tests",
							},
						],
					}),
				);
			}
		}
		return recs;
	}
}
