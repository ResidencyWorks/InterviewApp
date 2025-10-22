import { describe, expect, it } from "vitest";
import { PerformanceTrends } from "@/lib/analytics/PerformanceTrends";

describe("Performance monitoring", () => {
	it("computes moving average", () => {
		const trends = new PerformanceTrends();
		[100, 200, 300].forEach((v) => {
			trends.addPoint(v);
		});
		expect(Math.round(trends.getMovingAverage(3))).toBe(200);
	});
});
