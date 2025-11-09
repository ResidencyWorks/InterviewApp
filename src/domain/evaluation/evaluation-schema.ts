import { z } from "zod";

export const CATEGORY_IDS = [
	"communication",
	"problem_solving",
	"leadership",
	"collaboration",
	"adaptability",
	"ownership",
	"curiosity",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

// ResidencyWorks contract schema
export const categoryChipSchema = z.object({
	id: z.enum(CATEGORY_IDS),
	name: z.string().min(1),
	passFlag: z.enum(["PASS", "FLAG"]),
	note: z.string().min(1),
});

export const evaluationResultSchema = z.object({
	overall_score: z.number().min(0).max(100),
	duration_s: z.number().min(0),
	words: z.number().min(0),
	wpm: z.number().min(0),
	category_chips: z.array(categoryChipSchema).length(CATEGORY_IDS.length),
	what_changed: z.array(z.string()).min(0).max(3),
	practice_rule: z.string().min(1),
});

export type ICategoryChip = z.infer<typeof categoryChipSchema>;
export type IEvaluationResult = z.infer<typeof evaluationResultSchema>;

export function validateEvaluationResult(value: unknown): IEvaluationResult {
	const parsed = evaluationResultSchema.parse(value);
	return parsed;
}
