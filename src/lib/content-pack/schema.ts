import { z } from "zod";
import type { IContentPack } from "./types";

const contentPackCriteriaSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	weight: z.number().min(0).max(1),
	description: z.string().min(1),
});

const contentPackQuestionSchema = z.object({
	id: z.string().min(1),
	text: z.string().min(1),
	type: z.string().min(1),
});

const contentPackEvaluationCriteriaSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	description: z.string().min(1),
	criteria: z.array(contentPackCriteriaSchema).min(1),
	questions: z.array(contentPackQuestionSchema).min(1),
});

const contentPackCategorySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
});

const contentPackMetadataSchema = z
	.object({
		author: z.string().optional(),
		tags: z.array(z.string()).optional(),
		compatibility: z
			.object({
				minVersion: z.string().optional(),
				maxVersion: z.string().optional(),
				features: z.array(z.string()).optional(),
			})
			.optional(),
	})
	.optional();

export const contentPackSchema = z.object({
	name: z.string().min(1),
	version: z.string().min(1),
	description: z.string().optional(),
	content: z.object({
		evaluations: z.array(contentPackEvaluationCriteriaSchema).min(1),
		categories: z.array(contentPackCategorySchema).min(1),
	}),
	metadata: contentPackMetadataSchema,
});

export type ContentPackInput = z.infer<typeof contentPackSchema>;

export function validateContentPack(value: unknown): IContentPack {
	return contentPackSchema.parse(value);
}
