import { z } from "zod";
import type { IContentPack } from "./types";

export const contentPackSchema = z.object({
	name: z.string().min(1),
	version: z.string().min(1),
	categories: z.array(z.string().min(1)).min(1),
	metrics: z
		.array(
			z.object({
				id: z.string().min(1),
				label: z.string().min(1),
				weight: z.number().min(0).max(1),
			}),
		)
		.min(1),
	prompts: z.object({
		refactor_summary: z.string().min(1),
		scoring_rules: z.string().min(1),
	}),
});

export type ContentPackInput = z.infer<typeof contentPackSchema>;

export function validateContentPack(value: unknown): IContentPack {
	return contentPackSchema.parse(value);
}
