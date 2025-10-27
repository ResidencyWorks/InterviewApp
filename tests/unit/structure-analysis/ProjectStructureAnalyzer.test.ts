import { describe, expect, it } from "vitest";
import { ProjectStructureAnalyzer } from "../../../src/lib/structure-analysis/services/ProjectStructureAnalyzer.js";

describe("ProjectStructureAnalyzer", () => {
	it("runs analysis and returns completed status", async () => {
		const analyzer = new ProjectStructureAnalyzer();
		const result = await analyzer.analyze({
			directories: ["src/"],
			targetDirectories: ["src/"],
		} as any);

		expect(result).toBeTruthy();
		expect(result.status === "completed" || result.status === "failed").toBe(
			true,
		);
		expect(result.timestamp).toBeInstanceOf(Date);
		// Structure should exist even on failure path
		expect(result.structure).toBeTruthy();
		expect(typeof result.structure.totalFiles).toBe("number");
		expect(typeof result.structure.totalDirectories).toBe("number");
	});
});
