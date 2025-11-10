/**
 * Submission entity representing a user's interview submission
 */

import { z } from "zod";

/**
 * Submission schema for validation
 */
export const SubmissionSchema = z.object({
	id: z.string().uuid("Invalid submission ID format"),
	userId: z.string().min(1, "User ID is required"),
	content: z.string().min(10, "Content must be at least 10 characters"),
	audioUrl: z.string().url("Invalid audio URL format").optional(),
	questionId: z.string().min(1, "Question ID is required"),
	submittedAt: z.date(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Submission = z.infer<typeof SubmissionSchema>;

/**
 * Create a new submission
 */
export function createSubmission(data: {
	id: string;
	userId: string;
	content: string;
	audioUrl?: string;
	questionId: string;
	metadata?: Record<string, unknown>;
}): Submission {
	const submission: Submission = {
		id: data.id,
		userId: data.userId,
		content: data.content,
		audioUrl: data.audioUrl,
		questionId: data.questionId,
		submittedAt: new Date(),
		metadata: data.metadata,
	};

	return SubmissionSchema.parse(submission);
}

/**
 * Validate submission data
 */
export function validateSubmission(data: unknown): Submission {
	return SubmissionSchema.parse(data);
}

/**
 * Check if submission has audio content
 */
export function hasAudio(submission: Submission): boolean {
	return Boolean(submission.audioUrl);
}

/**
 * Get submission content for processing
 * Returns audio URL if present, otherwise returns text content
 */
export function getContentForProcessing(submission: Submission): {
	type: "text" | "audio";
	content: string;
} {
	if (submission.audioUrl) {
		return {
			type: "audio",
			content: submission.audioUrl,
		};
	}

	return {
		type: "text",
		content: submission.content,
	};
}
