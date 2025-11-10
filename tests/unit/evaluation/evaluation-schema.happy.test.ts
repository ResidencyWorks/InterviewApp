import { describe, expect, it } from "vitest";
import { evaluateTranscript } from "@/domain/evaluation/evaluation-engine";
import {
	type ICategoryChip,
	validateEvaluationResult,
} from "@/domain/evaluation/evaluation-schema";

describe("evaluation schema happy path", () => {
	it("validates an evaluation result from engine", async () => {
		const transcript =
			"I led the migration reducing latency by 35% and costs by 20%.";
		const result = await evaluateTranscript(transcript);
		const validated = validateEvaluationResult(result);
		expect(validated.overall_score).toBeGreaterThan(0);
		expect(validated.overall_score).toBeLessThanOrEqual(100);
		expect(validated.category_chips).toHaveLength(7);
		expect(validated.duration_s).toBeGreaterThan(0);
		expect(validated.words).toBeGreaterThan(0);
		expect(validated.wpm).toBeGreaterThan(0);
		expect(validated.practice_rule).toBeDefined();
		expect(typeof validated.practice_rule).toBe("string");

		// Verify each category chip has required fields
		validated.category_chips.forEach((chip: ICategoryChip) => {
			expect(chip.id).toBeDefined();
			expect(chip.name).toBeDefined();
			expect(["PASS", "FLAG"]).toContain(chip.passFlag);
			expect(chip.note).toBeDefined();
		});
	});
});
