/**
 * Feedback entity representing AI-generated feedback for a submission
 */

import { z } from "zod";

/**
 * Feedback schema for validation
 */
export const FeedbackSchema = z.object({
	id: z.string().uuid("Invalid feedback ID format"),
	submissionId: z.string().uuid("Invalid submission ID format"),
	score: z
		.number()
		.min(0, "Score must be at least 0")
		.max(100, "Score must be at most 100"),
	feedback: z
		.string()
		.min(10, "Feedback must be at least 10 characters")
		.max(1000, "Feedback must be at most 1000 characters"),
	strengths: z.array(z.string()).max(5, "Maximum 5 strengths allowed"),
	improvements: z.array(z.string()).max(5, "Maximum 5 improvements allowed"),
	generatedAt: z.date(),
	model: z.string().min(1, "Model name is required"),
	processingTimeMs: z.number().positive("Processing time must be positive"),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

/**
 * Create a new feedback instance
 */
export function createFeedback(data: {
	id: string;
	submissionId: string;
	score: number;
	feedback: string;
	strengths: string[];
	improvements: string[];
	model: string;
	processingTimeMs: number;
}): Feedback {
	const feedback: Feedback = {
		id: data.id,
		submissionId: data.submissionId,
		score: data.score,
		feedback: data.feedback,
		strengths: data.strengths,
		improvements: data.improvements,
		generatedAt: new Date(),
		model: data.model,
		processingTimeMs: data.processingTimeMs,
	};

	return FeedbackSchema.parse(feedback);
}

/**
 * Validate feedback data
 */
export function validateFeedback(data: unknown): Feedback {
	return FeedbackSchema.parse(data);
}

/**
 * Get feedback quality level based on score
 */
export function getQualityLevel(
	feedback: Feedback,
): "excellent" | "good" | "fair" | "poor" {
	if (feedback.score >= 90) return "excellent";
	if (feedback.score >= 75) return "good";
	if (feedback.score >= 60) return "fair";
	return "poor";
}

/**
 * Get feedback summary for display
 */
export function getFeedbackSummary(feedback: Feedback): {
	score: number;
	qualityLevel: string;
	hasStrengths: boolean;
	hasImprovements: boolean;
	processingTime: string;
} {
	return {
		score: feedback.score,
		qualityLevel: getQualityLevel(feedback),
		hasStrengths: feedback.strengths.length > 0,
		hasImprovements: feedback.improvements.length > 0,
		processingTime: `${feedback.processingTimeMs}ms`,
	};
}
