import { describe, expect, it } from "vitest";
import { RecommendationGeneratorService } from "../../../src/lib/structure-analysis/services/RecommendationGenerator.js";

describe("RecommendationGeneratorService", () => {
	it("generates recommendations for duplications with sufficient score", () => {
		const svc = new RecommendationGeneratorService();
		const structure: any = {
			totalFiles: 0,
			totalDirectories: 0,
			duplications: [
				{
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
		};

		const recs = svc.generate(structure);
		expect(recs.length).toBeGreaterThan(0);
		expect(recs[0].type).toBe("consolidation");
	});
});
