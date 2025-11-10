export interface OptimizationRecommendation {
	id: string;
	title: string;
	detail: string;
	impact: "low" | "medium" | "high";
}

export class PerformanceOptimizer {
	recommend(input: {
		lcpMs?: number;
		cls?: number;
		bundleKb?: number;
	}): OptimizationRecommendation[] {
		const recs: OptimizationRecommendation[] = [];
		if ((input.lcpMs ?? 0) > 2500) {
			recs.push({
				id: "image-optimization",
				title: "Optimize hero image",
				detail: "Use next/image, add preload, and compress large assets.",
				impact: "high",
			});
		}
		if ((input.cls ?? 0) > 0.1) {
			recs.push({
				id: "reserve-space",
				title: "Reserve space for dynamic content",
				detail: "Set width/height and avoid layout-shifting font swaps.",
				impact: "medium",
			});
		}
		if ((input.bundleKb ?? 0) > 300) {
			recs.push({
				id: "code-splitting",
				title: "Reduce bundle size",
				detail: "Leverage dynamic imports and modularize icon libraries.",
				impact: "medium",
			});
		}
		return recs;
	}
}
