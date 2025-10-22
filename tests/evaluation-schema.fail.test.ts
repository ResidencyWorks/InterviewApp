import { describe, expect, it } from "vitest";
import { evaluationResultSchema } from "../src/lib/evaluation/evaluation-schema";

describe("evaluation schema failure path", () => {
	it("rejects invalid overall_score (> 100)", () => {
		const invalid = {
			overall_score: 150, // invalid: > 100
			duration_s: 10,
			words: 100,
			wpm: 150,
			category_chips: [
				{
					id: "communication",
					name: "Communication",
					passFlag: "PASS",
					note: "Good",
				},
				{
					id: "problem_solving",
					name: "Problem Solving",
					passFlag: "PASS",
					note: "Good",
				},
				{
					id: "leadership",
					name: "Leadership",
					passFlag: "PASS",
					note: "Good",
				},
				{
					id: "collaboration",
					name: "Collaboration",
					passFlag: "PASS",
					note: "Good",
				},
				{
					id: "adaptability",
					name: "Adaptability",
					passFlag: "PASS",
					note: "Good",
				},
				{
					id: "ownership",
					name: "Ownership",
					passFlag: "PASS",
					note: "Good",
				},
				{
					id: "curiosity",
					name: "Curiosity",
					passFlag: "PASS",
					note: "Good",
				},
			],
			what_changed: [],
			practice_rule: "Practice more",
		};
		expect(() => evaluationResultSchema.parse(invalid)).toThrowError();
	});

	it("rejects invalid category_chips length", () => {
		const invalid = {
			overall_score: 75,
			duration_s: 10,
			words: 100,
			wpm: 150,
			category_chips: [], // invalid: should be exactly 7
			what_changed: [],
			practice_rule: "Practice more",
		};
		expect(() => evaluationResultSchema.parse(invalid)).toThrowError();
	});

	it("rejects invalid passFlag value", () => {
		const invalid = {
			overall_score: 75,
			duration_s: 10,
			words: 100,
			wpm: 150,
			category_chips: [
				{
					id: "communication",
					name: "Communication",
					passFlag: "UNKNOWN", // invalid: not PASS or FLAG
					note: "Good",
				},
			],
			what_changed: [],
			practice_rule: "Practice more",
		};
		expect(() => evaluationResultSchema.parse(invalid)).toThrowError();
	});
});
