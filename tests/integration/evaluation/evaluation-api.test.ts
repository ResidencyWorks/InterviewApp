import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/evaluate/route";

// Mock evaluateTranscript function
vi.mock("@/domain/evaluation/evaluation-engine", () => ({
	evaluateTranscript: vi.fn(),
}));

describe("/api/evaluate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should evaluate text response successfully", async () => {
		const mockEvaluationResult = {
			overall_score: 86,
			duration_s: 1.5,
			words: 12,
			wpm: 480,
			category_chips: [
				{
					id: "communication" as const,
					name: "Communication",
					passFlag: "PASS" as const,
					note: "Strong evidence of communication",
				},
				{
					id: "problem_solving" as const,
					name: "Problem Solving",
					passFlag: "PASS" as const,
					note: "Strong evidence of problem solving",
				},
				{
					id: "leadership" as const,
					name: "Leadership",
					passFlag: "FLAG" as const,
					note: "Limited demonstration of leadership",
				},
				{
					id: "collaboration" as const,
					name: "Collaboration",
					passFlag: "PASS" as const,
					note: "Strong evidence of collaboration",
				},
				{
					id: "adaptability" as const,
					name: "Adaptability",
					passFlag: "PASS" as const,
					note: "Strong evidence of adaptability",
				},
				{
					id: "ownership" as const,
					name: "Ownership",
					passFlag: "PASS" as const,
					note: "Strong evidence of ownership",
				},
				{
					id: "curiosity" as const,
					name: "Curiosity",
					passFlag: "PASS" as const,
					note: "Strong evidence of curiosity",
				},
			],
			what_changed: ["Add specific examples to support claims"],
			practice_rule: "Expand your answer with specific examples and metrics",
		};

		// Mock evaluateTranscript
		const { evaluateTranscript } = await import(
			"@/domain/evaluation/evaluation-engine"
		);
		vi.mocked(evaluateTranscript).mockResolvedValue(mockEvaluationResult);

		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				transcript: "This is a test response for evaluation",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toMatchObject({
			overall_score: mockEvaluationResult.overall_score,
			duration_s: mockEvaluationResult.duration_s,
			words: mockEvaluationResult.words,
			wpm: mockEvaluationResult.wpm,
		});
	});

	it("should evaluate audio response successfully", async () => {
		const mockEvaluationResult = {
			overall_score: 89,
			duration_s: 2.1,
			words: 15,
			wpm: 428,
			category_chips: [
				{
					id: "communication" as const,
					name: "Communication",
					passFlag: "PASS" as const,
					note: "Strong evidence of communication",
				},
				{
					id: "problem_solving" as const,
					name: "Problem Solving",
					passFlag: "PASS" as const,
					note: "Strong evidence of problem solving",
				},
				{
					id: "leadership" as const,
					name: "Leadership",
					passFlag: "PASS" as const,
					note: "Strong evidence of leadership",
				},
				{
					id: "collaboration" as const,
					name: "Collaboration",
					passFlag: "PASS" as const,
					note: "Strong evidence of collaboration",
				},
				{
					id: "adaptability" as const,
					name: "Adaptability",
					passFlag: "PASS" as const,
					note: "Strong evidence of adaptability",
				},
				{
					id: "ownership" as const,
					name: "Ownership",
					passFlag: "PASS" as const,
					note: "Strong evidence of ownership",
				},
				{
					id: "curiosity" as const,
					name: "Curiosity",
					passFlag: "PASS" as const,
					note: "Strong evidence of curiosity",
				},
			],
			what_changed: [],
			practice_rule:
				"Keep answers concise: aim for 2 minutes max (200-300 words)",
		};

		// Mock evaluateTranscript
		const { evaluateTranscript } = await import(
			"@/domain/evaluation/evaluation-engine"
		);
		vi.mocked(evaluateTranscript).mockResolvedValue(mockEvaluationResult);

		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				transcript: "Audio response content transcribed text",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.overall_score).toBe(89);
		expect(data.category_chips).toHaveLength(7);
	});

	it("should return 400 for missing transcript", async () => {
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Validation failed");
	});

	it("should return 400 for empty transcript", async () => {
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				transcript: "",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		// Empty transcript doesn't match the transcript fallback path, so it goes through validation
		expect(data.error).toBe("Validation failed");
	});

	it("should handle evaluation service errors", async () => {
		// Mock evaluateTranscript to throw an error
		const { evaluateTranscript } = await import(
			"@/domain/evaluation/evaluation-engine"
		);
		vi.mocked(evaluateTranscript).mockRejectedValue(
			new Error("Evaluation error"),
		);

		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				transcript: "This is a test response",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe("Internal server error");
	});

	it("should handle malformed JSON", async () => {
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: "invalid json",
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Invalid request body");
	});

	it("should return evaluation result with all fields", async () => {
		const mockEvaluationResult = {
			overall_score: 81,
			duration_s: 1.2,
			words: 8,
			wpm: 400,
			category_chips: [
				{
					id: "communication" as const,
					name: "Communication",
					passFlag: "PASS" as const,
					note: "Strong evidence of communication",
				},
				{
					id: "problem_solving" as const,
					name: "Problem Solving",
					passFlag: "PASS" as const,
					note: "Strong evidence of problem solving",
				},
				{
					id: "leadership" as const,
					name: "Leadership",
					passFlag: "FLAG" as const,
					note: "Limited demonstration of leadership",
				},
				{
					id: "collaboration" as const,
					name: "Collaboration",
					passFlag: "PASS" as const,
					note: "Strong evidence of collaboration",
				},
				{
					id: "adaptability" as const,
					name: "Adaptability",
					passFlag: "PASS" as const,
					note: "Strong evidence of adaptability",
				},
				{
					id: "ownership" as const,
					name: "Ownership",
					passFlag: "PASS" as const,
					note: "Strong evidence of ownership",
				},
				{
					id: "curiosity" as const,
					name: "Curiosity",
					passFlag: "PASS" as const,
					note: "Strong evidence of curiosity",
				},
			],
			what_changed: ["Add specific examples to support claims"],
			practice_rule: "Expand your answer with specific examples and metrics",
		};

		// Mock evaluateTranscript
		const { evaluateTranscript } = await import(
			"@/domain/evaluation/evaluation-engine"
		);
		vi.mocked(evaluateTranscript).mockResolvedValue(mockEvaluationResult);

		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				transcript: "Test response",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(data.overall_score).toBe(81);
		expect(data.duration_s).toBe(1.2);
		expect(data.words).toBe(8);
		expect(data.wpm).toBe(400);
		expect(data.category_chips).toHaveLength(7);
		expect(data.what_changed).toBeDefined();
		expect(data.practice_rule).toBeDefined();
	});

	it("should handle long transcript evaluation", async () => {
		const mockEvaluationResult = {
			overall_score: 85,
			duration_s: 3.5,
			words: 500,
			wpm: 857,
			category_chips: [
				{
					id: "communication" as const,
					name: "Communication",
					passFlag: "PASS" as const,
					note: "Strong evidence of communication",
				},
				{
					id: "problem_solving" as const,
					name: "Problem Solving",
					passFlag: "PASS" as const,
					note: "Strong evidence of problem solving",
				},
				{
					id: "leadership" as const,
					name: "Leadership",
					passFlag: "PASS" as const,
					note: "Strong evidence of leadership",
				},
				{
					id: "collaboration" as const,
					name: "Collaboration",
					passFlag: "PASS" as const,
					note: "Strong evidence of collaboration",
				},
				{
					id: "adaptability" as const,
					name: "Adaptability",
					passFlag: "PASS" as const,
					note: "Strong evidence of adaptability",
				},
				{
					id: "ownership" as const,
					name: "Ownership",
					passFlag: "PASS" as const,
					note: "Strong evidence of ownership",
				},
				{
					id: "curiosity" as const,
					name: "Curiosity",
					passFlag: "PASS" as const,
					note: "Strong evidence of curiosity",
				},
			],
			what_changed: [],
			practice_rule:
				"Keep answers concise: aim for 2 minutes max (200-300 words)",
		};

		// Mock evaluateTranscript
		const { evaluateTranscript } = await import(
			"@/domain/evaluation/evaluation-engine"
		);
		vi.mocked(evaluateTranscript).mockResolvedValue(mockEvaluationResult);

		const longTranscript = "This is a very long transcript. ".repeat(20);
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				transcript: longTranscript,
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.overall_score).toBe(85);
		expect(data.words).toBeGreaterThan(100);
	});
});
