import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	EvaluationRequestSchema,
	EvaluationResultSchema,
} from "../../src/domain/evaluation/ai-evaluation-schema";

// Test-First (T033): Schema file not yet implemented; these tests should fail
// until `src/domain/evaluation/ai-evaluation-schema.ts` is created with correct Zod schemas.
// This enforces test-first discipline.

describe("Evaluation Schemas (Test-First)", () => {
	it("rejects request with neither text nor audio_url", () => {
		const request = { requestId: randomUUID() };
		const result = EvaluationRequestSchema.safeParse(request);
		expect(result.success).toBe(false);
	});

	it("accepts request with text", () => {
		const request = { requestId: randomUUID(), text: "Clear concise answer" };
		const result = EvaluationRequestSchema.safeParse(request);
		expect(result.success).toBe(true);
	});

	it("rejects invalid audio_url (non-https)", () => {
		const request = {
			requestId: randomUUID(),
			audio_url: "ftp://example.com/file.mp3",
		};
		const result = EvaluationRequestSchema.safeParse(request);
		expect(result.success).toBe(false);
	});

	it("rejects result with score > 100", () => {
		const resultObj = {
			requestId: randomUUID(),
			jobId: "eval:123",
			score: 150,
			feedback: "Too long feedback but main issue is score.",
			what_changed: "Reduced filler words",
			practice_rule: "Pause before responding",
			durationMs: 1200,
			tokensUsed: 300,
		};
		const result = EvaluationResultSchema.safeParse(resultObj);
		expect(result.success).toBe(false);
	});

	it("accepts minimal valid result", () => {
		const valid = {
			requestId: randomUUID(),
			jobId: "eval:456",
			score: 80,
			feedback: "Good pacing and clarity.",
			what_changed: "Fewer filler words",
			practice_rule: "Pause ~300ms before answers",
			durationMs: 987,
		};
		const result = EvaluationResultSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});
});
