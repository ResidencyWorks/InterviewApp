import { describe, expect, it } from "vitest";
import { ProjectStructureAnalyzer } from "../../../src/lib/structure-analysis/services/ProjectStructureAnalyzer.js";

describe("StructureAnalysis Integration", () => {
	it("analyzes multiple directories without throwing", async () => {
		const analyzer = new ProjectStructureAnalyzer();
		const result = await analyzer.analyze({
			directories: ["src/", "app/"],
			targetDirectories: ["src/", "app/"],
		} as any);
		expect(result).toBeTruthy();
		expect(result.structure).toBeTruthy();
	});
});
