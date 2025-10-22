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

export const metricScoreSchema = z.object({
	id: z.string(),
	label: z.string(),
	weight: z.number().min(0).max(1),
});

export const categoryScoreSchema = z.object({
	category: z.enum(CATEGORY_IDS),
	score: z.number().min(0).max(5),
});

export const evaluationMetricsSchema = z.object({
	clarity: z.number().min(0).max(1),
	impact: z.number().min(0).max(1),
	specificity: z.number().min(0).max(1),
	structure: z.number().min(0).max(1),
	empathy: z.number().min(0).max(1),
	agency: z.number().min(0).max(1),
	reflection: z.number().min(0).max(1),
});

export const evaluationSummarySchema = z.object({
	bullets: z.array(z.string()).min(1).max(5),
	practiceRule: z.string(),
});

export const evaluationResultSchema = z.object({
	totalScore: z.number().min(0).max(5),
	metrics: evaluationMetricsSchema,
	categories: z.array(categoryScoreSchema).length(CATEGORY_IDS.length),
	summary: evaluationSummarySchema,
});

export type IEvaluationMetrics = z.infer<typeof evaluationMetricsSchema>;
export type ICategoryScore = z.infer<typeof categoryScoreSchema>;
export type IEvaluationSummary = z.infer<typeof evaluationSummarySchema>;
export type IEvaluationResult = z.infer<typeof evaluationResultSchema>;

export function validateEvaluationResult(value: unknown): IEvaluationResult {
	const parsed = evaluationResultSchema.parse(value);
	return parsed;
}
