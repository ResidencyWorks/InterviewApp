import type { CleanupRecommendation } from "../entities/CleanupRecommendation.js";

export class RecommendationReportGenerator {
	generate(recommendations: CleanupRecommendation[]) {
		return {
			generatedAt: new Date().toISOString(),
			total: recommendations.length,
			byPriority: recommendations.reduce<Record<string, number>>((acc, r) => {
				acc[r.priority] = (acc[r.priority] ?? 0) + 1;
				return acc;
			}, {}),
			items: recommendations.map((r) => ({
				id: r.id,
				title: r.title,
				type: r.type,
				priority: r.priority,
				effort: r.effort,
				impact: r.impact,
			})),
		};
	}
}
