import { describe, expect, it } from "vitest";
import { evaluateTranscript } from "../src/lib/evaluation/evaluation-engine";
import { validateEvaluationResult } from "../src/lib/evaluation/evaluation-schema";

describe("evaluation schema happy path", () => {
	it("validates an evaluation result from engine", async () => {
		const transcript =
			"I led the migration reducing latency by 35% and costs by 20%.";
		const result = await evaluateTranscript(transcript);
		const validated = validateEvaluationResult(result);
		expect(validated.totalScore).toBeGreaterThan(0);
		expect(validated.categories).toHaveLength(7);
	});
});
