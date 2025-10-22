/**
 * Unit tests for OpenAITextAdapter
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	LLMServiceError,
	ValidationError,
} from "@/lib/llm/domain/errors/LLMErrors";
import type { TextAdapterConfig } from "@/lib/llm/domain/interfaces/ITextAdapter";
import { OpenAITextAdapter } from "@/lib/llm/infrastructure/openai/OpenAITextAdapter";

// Mock OpenAI
vi.mock("openai", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: vi.fn(),
				},
			},
		})),
	};
});

describe("OpenAITextAdapter", () => {
	let adapter: OpenAITextAdapter;
	let mockConfig: TextAdapterConfig;
	let mockOpenAI: any;

	beforeEach(async () => {
		mockConfig = {
			apiKey: "test-api-key",
			model: "gpt-4",
			timeout: 30000,
			maxRetries: 3,
		};

		// Mock OpenAI client
		mockOpenAI = {
			chat: {
				completions: {
					create: vi.fn(),
				},
			},
		};

		// Mock the OpenAI constructor
		const { default: OpenAI } = await import("openai");
		vi.mocked(OpenAI).mockImplementation(() => mockOpenAI);

		adapter = new OpenAITextAdapter(mockConfig);
	});

	describe("analyze", () => {
		it("should analyze text successfully", async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								score: 85,
								feedback: "Good response with clear examples",
								strengths: ["Clear communication", "Good examples"],
								improvements: ["More specific metrics"],
							}),
						},
					},
				],
				usage: {
					total_tokens: 150,
					prompt_tokens: 100,
					completion_tokens: 50,
				},
			};

			mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

			const result = await adapter.analyze("Test interview response");

			expect(result.score).toBe(85);
			expect(result.feedback).toBe("Good response with clear examples");
			expect(result.strengths).toEqual([
				"Clear communication",
				"Good examples",
			]);
			expect(result.improvements).toEqual(["More specific metrics"]);
		});

		it("should throw validation error for empty text", async () => {
			await expect(adapter.analyze("")).rejects.toThrow(ValidationError);
			await expect(adapter.analyze("   ")).rejects.toThrow(ValidationError);
		});

		it("should throw validation error for text too long", async () => {
			const longText = "a".repeat(100000); // Very long text
			await expect(adapter.analyze(longText)).rejects.toThrow(ValidationError);
		});

		it("should handle OpenAI API errors", async () => {
			mockOpenAI.chat.completions.create.mockRejectedValue(
				new Error("OpenAI API error"),
			);

			await expect(adapter.analyze("Test text")).rejects.toThrow(
				LLMServiceError,
			);
		});

		it("should handle malformed response", async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: "Invalid JSON response",
						},
					},
				],
			};

			mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

			await expect(adapter.analyze("Test text")).rejects.toThrow(
				LLMServiceError,
			);
		});
	});

	describe("analyzeBatch", () => {
		it("should analyze multiple texts in batch", async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								score: 85,
								feedback: "Good response",
								strengths: ["Clear communication"],
								improvements: ["More examples"],
							}),
						},
					},
				],
				usage: {
					total_tokens: 150,
					prompt_tokens: 100,
					completion_tokens: 50,
				},
			};

			mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

			const texts = ["Text 1", "Text 2", "Text 3"];
			const results = await adapter.analyzeBatch(texts);

			expect(results).toHaveLength(3);
			results.forEach((result) => {
				expect(result.score).toBe(85);
				expect(result.feedback).toBe("Good response");
			});
		});

		it("should return empty array for empty input", async () => {
			const results = await adapter.analyzeBatch([]);
			expect(results).toEqual([]);
		});

		it("should handle batch processing errors", async () => {
			mockOpenAI.chat.completions.create.mockRejectedValue(
				new Error("Batch processing error"),
			);

			const texts = ["Text 1", "Text 2"];
			await expect(adapter.analyzeBatch(texts)).rejects.toThrow(
				LLMServiceError,
			);
		});
	});

	describe("analyzeOptimized", () => {
		it("should use optimized timeout", async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								score: 85,
								feedback: "Good response",
								strengths: ["Clear communication"],
								improvements: ["More examples"],
							}),
						},
					},
				],
				usage: {
					total_tokens: 150,
					prompt_tokens: 100,
					completion_tokens: 50,
				},
			};

			mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

			const result = await adapter.analyzeOptimized("Test text");

			expect(result.score).toBe(85);
			expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: 15000, // Optimized timeout
				}),
			);
		});
	});

	describe("getPerformanceMetrics", () => {
		it("should return performance metrics", () => {
			const metrics = adapter.getPerformanceMetrics();

			expect(metrics).toHaveProperty("averageResponseTime");
			expect(metrics).toHaveProperty("successRate");
			expect(metrics).toHaveProperty("batchProcessingEfficiency");
		});
	});

	describe("configuration", () => {
		it("should update configuration", () => {
			const newConfig = { model: "gpt-3.5-turbo", timeout: 15000 };
			adapter.updateConfig(newConfig);

			const config = adapter.getConfig();
			expect(config.model).toBe("gpt-3.5-turbo");
			expect(config.timeout).toBe(15000);
		});

		it("should return current configuration", () => {
			const config = adapter.getConfig();
			expect(config).toEqual(mockConfig);
		});
	});

	describe("isAvailable", () => {
		it("should check if adapter is available", async () => {
			// Mock a successful API call
			mockOpenAI.chat.completions.create.mockResolvedValue({
				choices: [{ message: { content: "test" } }],
			});

			const isAvailable = await adapter.isAvailable();
			expect(isAvailable).toBe(true);
		});

		it("should return false when adapter is not available", async () => {
			// Mock a failed API call
			mockOpenAI.chat.completions.create.mockRejectedValue(
				new Error("API not available"),
			);

			const isAvailable = await adapter.isAvailable();
			expect(isAvailable).toBe(false);
		});
	});

	describe("getModelName", () => {
		it("should return model name", () => {
			const modelName = adapter.getModelName();
			expect(modelName).toBe("gpt-4");
		});
	});
});
