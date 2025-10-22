import { describe, expect, it } from "vitest";
import { evaluationResultSchema } from "../src/lib/evaluation/evaluation-schema";

describe("evaluation schema failure path", () => {
	it("rejects invalid score and category length", async () => {
		const invalid = {
			totalScore: 6, // invalid: > 5
			metrics: {
				clarity: 1,
				impact: 1,
				specificity: 1,
				structure: 1,
				empathy: 1,
				agency: 1,
				reflection: 1,
			},
			categories: [], // invalid: should be length 7
			summary: { bullets: ["ok"], practiceRule: "rule" },
		};
		expect(() => evaluationResultSchema.parse(invalid)).toThrowError();
	});
});
