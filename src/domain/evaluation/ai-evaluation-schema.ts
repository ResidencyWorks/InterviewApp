import { z } from "zod";

export const EvaluationRequestSchema = z
	.object({
		requestId: z.uuid(),
		text: z.string().optional(),
		audio_url: z.url().startsWith("https://").optional(),
		userId: z.uuid().optional(),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.refine((data) => data.text || data.audio_url, {
		message: "Either 'text' or 'audio_url' must be provided",
	});

export const EvaluationResultSchema = z.object({
	requestId: z.uuid(),
	jobId: z.string(),
	score: z.number().min(0).max(100),
	feedback: z.string().min(1).max(5000),
	what_changed: z.string().max(2000),
	practice_rule: z.string().max(1000),
	durationMs: z.number().int().nonnegative(),
	transcription: z.string().optional(),
	metrics: z.record(z.string(), z.unknown()).optional(),
	tokensUsed: z.number().int().nonnegative().optional(),
	createdAt: z.string().optional(),
});

export type EvaluationRequest = z.infer<typeof EvaluationRequestSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
