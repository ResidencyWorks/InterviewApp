import { describe, expect, it } from "vitest";
import type { ProjectStructure } from "@/domain/structure-analysis/entities/ProjectStructure";
import { RecommendationGeneratorService } from "@/domain/structure-analysis/services/RecommendationGenerator";

describe("RecommendationGeneratorService", () => {
	it("generates recommendations for duplications with sufficient score", () => {
		const svc = new RecommendationGeneratorService();
		const structure = {
			id: "test-structure",
			totalFiles: 0,
			totalDirectories: 0,
			analysisTimestamp: new Date(),
			duplications: [
				{
					id: "dup-1",
					serviceName: "AuthService",
					locations: ["a.ts", "b.ts"],
					duplicationType: "implementation",
					overlapPercentage: 85,
					severity: "high",
					consolidationEffort: "medium",
					consolidationImpact: "high",
				},
			],
			inconsistencies: [],
			recommendations: [],
			directories: [],
		} satisfies ProjectStructure;

		const recs = svc.generate(structure);
		expect(recs.length).toBeGreaterThan(0);
		expect(recs[0].type).toBe("consolidation");
	});
});
