import { describe, expect, it } from "vitest";
import { contentPackValidationService } from "@/lib/services/content-pack-validation";

function makeValidPack() {
	return {
		content: {
			categories: [
				{
					id: "cat1",
					name: "General",
					description: "Basics",
					weight: 0.5,
					criteria: ["c1"],
				},
			],
			description: "A valid content pack",
			evaluation_criteria: {
				clarity: { description: "desc", factors: ["f1"], weight: 0.25 },
				content: { description: "desc", factors: ["f1"], weight: 0.25 },
				delivery: { description: "desc", factors: ["f1"], weight: 0.25 },
				structure: { description: "desc", factors: ["f1"], weight: 0.25 },
			},
			metadata: {
				author: "test",
				created_at: new Date().toISOString(),
				language: "en",
				tags: ["tag"],
				target_audience: ["junior"],
				updated_at: new Date().toISOString(),
			},
			name: "Pack",
			questions: [
				{
					category_id: "cat1",
					difficulty: "easy",
					id: "q1",
					text: "Tell me about yourself",
					time_limit: 60,
					tips: ["Be concise"],
					type: "behavioral",
				},
			],
			version: "1.0.0",
		},
		created_at: new Date().toISOString(),
		id: "id1",
		is_active: false,
		name: "Pack",
		updated_at: new Date().toISOString(),
		version: "1.0.0",
	};
}

describe("content security validation", () => {
	it("flags script-like content", async () => {
		const pack = makeValidPack();
		pack.content.description = "<script>alert('x')</script>";
		const result = await contentPackValidationService.validateContentPack(pack);
		expect(result.valid).toBe(false);
	});

	it("warns on excessive questions", async () => {
		const pack = makeValidPack();
		pack.content.questions = Array.from({ length: 2001 }).map((_, i) => ({
			category_id: "cat1",
			difficulty: "easy",
			id: `q${i + 1}`,
			text: "x",
			time_limit: 30,
			tips: ["t"],
			type: "behavioral",
		}));
		const result = await contentPackValidationService.validateContentPack(pack);
		expect(result.warnings.length).toBeGreaterThan(0);
	});
});
