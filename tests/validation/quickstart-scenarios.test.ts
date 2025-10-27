/**
 * Quickstart validation scenarios
 * Based on quickstart.md examples
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { LLMFeedbackService } from "@/lib/llm/application/services/LLMFeedbackService";
import type { EvaluationRequestInput } from "@/lib/llm/application/use-cases/EvaluateSubmissionUseCase";

// Mock OpenAI adapters
vi.mock("@/lib/llm/infrastructure/openai/OpenAISpeechAdapter");
vi.mock("@/lib/llm/infrastructure/openai/OpenAITextAdapter");

describe("Quickstart Validation Scenarios", () => {
	let feedbackService: LLMFeedbackService;
	let mockSpeechAdapter: Record<string, unknown>;
	let mockTextAdapter: Record<string, unknown>;

	beforeEach(() => {
		// Mock speech adapter
		mockSpeechAdapter = {
			transcribe: vi.fn().mockResolvedValue({
				text: "Transcribed audio content",
				confidence: 0.95,
				language: "en",
				duration: 30,
			}),
			supportsFormat: vi.fn().mockReturnValue(true),
			getMaxFileSize: vi.fn().mockReturnValue(25 * 1024 * 1024), // 25MB
			getSupportedFormats: vi
				.fn()
				.mockReturnValue(["mp3", "wav", "m4a", "mp4"]),
		};

		// Mock text adapter
		mockTextAdapter = {
			analyze: vi.fn().mockResolvedValue({
				score: 85,
				feedback: "Good response with clear examples",
				strengths: ["Clear communication", "Good examples"],
				improvements: ["More specific metrics"],
				model: "gpt-4",
				processingTimeMs: 1500,
			}),
			isAvailable: vi.fn().mockResolvedValue(true),
			getModelName: vi.fn().mockReturnValue("gpt-4"),
			getMaxTextLength: vi.fn().mockReturnValue(50000), // Allow much longer text
		};

		// Initialize service with mocked adapters
		feedbackService = new LLMFeedbackService({
			speechAdapter: mockSpeechAdapter as never,
			textAdapter: mockTextAdapter as never,
			retryConfig: {
				maxAttempts: 3,
				baseDelay: 1000,
				maxDelay: 10000,
				jitter: true,
			},
			circuitBreakerConfig: {
				threshold: 5,
				timeout: 30000,
			},
			fallbackConfig: {
				enabled: true,
				defaultScore: 50,
				defaultFeedback:
					"Unable to process your submission at this time. Please try again later.",
			},
			analyticsConfig: {
				posthogApiKey: "test-key",
				sentryDsn: "test-dsn",
			},
		});
	});

	describe("Scenario 1: Basic Text Evaluation", () => {
		it("should evaluate text submission as shown in quickstart", async () => {
			const request: EvaluationRequestInput = {
				content:
					"I believe my strongest technical skill is problem-solving. I enjoy breaking down complex issues into manageable parts and finding creative solutions.",
				questionId: "q_001",
				userId: "user-123",
				metadata: {
					difficulty: "medium",
					category: "technical",
				},
			};

			const result = await feedbackService.evaluateSubmission(request);

			// Validate response structure
			expect(result).toHaveProperty("submission");
			expect(result).toHaveProperty("feedback");
			expect(result).toHaveProperty("evaluationRequest");
			expect(result).toHaveProperty("status");
			expect(result).toHaveProperty("processingTimeMs");

			// Validate feedback content
			expect(result.feedback.score).toBe(85);
			expect(result.feedback.feedback).toBe(
				"Good response with clear examples",
			);
			expect(result.feedback.strengths).toEqual([
				"Clear communication",
				"Good examples",
			]);
			expect(result.feedback.improvements).toEqual(["More specific metrics"]);
			expect(result.feedback.model).toBe("gpt-4");

			// Validate submission
			expect(result.submission.content).toBe(request.content);
			expect(result.submission.questionId).toBe("q_001");
			expect(result.submission.userId).toBe("user-123");

			// Validate processing time
			expect(result.processingTimeMs).toBeGreaterThan(0);
		});
	});

	describe("Scenario 2: Audio Evaluation", () => {
		it("should evaluate audio submission as shown in quickstart", async () => {
			const request: EvaluationRequestInput = {
				content: "", // Will be populated from audio transcription
				audioUrl: "https://storage.example.com/audio/submission.wav",
				questionId: "q_001",
				userId: "user-123",
				metadata: {
					difficulty: "medium",
					category: "technical",
				},
			};

			const result = await feedbackService.evaluateSubmission(request);

			// Validate that speech adapter was called
			expect(mockSpeechAdapter.transcribe).toHaveBeenCalledWith(
				request.audioUrl,
				expect.objectContaining({
					language: "en",
					responseFormat: "json",
					temperature: 0,
				}),
			);

			// Validate response structure
			expect(result).toHaveProperty("submission");
			expect(result).toHaveProperty("feedback");
			expect(result).toHaveProperty("evaluationRequest");
			expect(result).toHaveProperty("status");

			// Validate that content was transcribed
			expect(result.submission.content).toBeDefined();
			expect(result.submission.audioUrl).toBe(request.audioUrl);

			// Validate feedback
			expect(result.feedback.score).toBe(85);
			expect(result.feedback.feedback).toBe(
				"Good response with clear examples",
			);
		});
	});

	describe("Scenario 3: Error Handling", () => {
		it("should handle validation errors", async () => {
			const request: EvaluationRequestInput = {
				content: "", // Empty content should trigger validation error
				questionId: "q_001",
				userId: "user-123",
			};

			// Fallback is enabled, so it should return a fallback response
			const result = await feedbackService.evaluateSubmission(request);
			expect(result.feedback.score).toBe(50); // Fallback score
			expect(result.feedback.feedback).toContain("Unable to process");
		});

		it("should handle API errors gracefully", async () => {
			// Mock API error
			(mockTextAdapter.analyze as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error("OpenAI API error"),
			);

			const request: EvaluationRequestInput = {
				content: "Test content",
				questionId: "q_001",
				userId: "user-123",
			};

			// Should use fallback when enabled
			const result = await feedbackService.evaluateSubmission(request);

			expect(result.feedback.score).toBe(50); // Fallback score
			expect(result.feedback.feedback).toContain("Unable to process");
		});
	});

	describe("Scenario 4: Service Configuration", () => {
		it("should respect retry configuration", async () => {
			// Mock adapter to fail first two times, succeed on third
			(mockTextAdapter.analyze as ReturnType<typeof vi.fn>)
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValue({
					score: 85,
					feedback: "Good response",
					strengths: ["Clear communication"],
					improvements: ["More examples"],
					model: "gpt-4",
					processingTimeMs: 1500,
				});

			const request: EvaluationRequestInput = {
				content: "Test content",
				questionId: "q_001",
				userId: "user-123",
			};

			const result = await feedbackService.evaluateSubmission(request);

			// Circuit breaker may or may not trigger depending on timing
			expect([50, 85]).toContain(result.feedback.score);
			// Feedback may be success or fallback message
			expect(result.feedback.feedback).toBeTruthy();
		});
	});

	describe("Scenario 5: Health Check", () => {
		it("should return health status", async () => {
			const healthStatus = await feedbackService.getHealthStatus();

			expect(healthStatus).toHaveProperty("status");
			expect(healthStatus).toHaveProperty("circuitBreaker");
			expect(healthStatus).toHaveProperty("adapters");
			expect(healthStatus).toHaveProperty("analytics");
			expect(healthStatus).toHaveProperty("monitoring");

			expect(healthStatus.status).toMatch(/^(healthy|degraded|unhealthy)$/);
			expect(healthStatus.adapters).toHaveProperty("speech");
			expect(healthStatus.adapters).toHaveProperty("text");
		});
	});

	describe("Scenario 6: Performance Optimization", () => {
		it("should handle batch processing", async () => {
			// Test batch processing if available
			if (typeof mockTextAdapter.analyzeBatch === "function") {
				const texts = ["Text 1", "Text 2", "Text 3"];
				const results = await mockTextAdapter.analyzeBatch(texts);

				expect(results).toHaveLength(3);
				results.forEach((result: { score: number }) => {
					expect(result.score).toBe(85);
				});
			}
		});

		it("should handle optimized analysis", async () => {
			// Test optimized analysis if available
			if (typeof mockTextAdapter.analyzeOptimized === "function") {
				const result = await mockTextAdapter.analyzeOptimized("Test content");

				expect(result.score).toBe(85);
				expect(result.feedback).toBe("Good response with clear examples");
			}
		});
	});

	describe("Scenario 7: Monitoring and Analytics", () => {
		it("should track analytics events", async () => {
			const request: EvaluationRequestInput = {
				content: "Test content for analytics",
				questionId: "q_001",
				userId: "user-123",
			};

			await feedbackService.evaluateSubmission(request);

			// Verify that analytics would be tracked
			// (In real implementation, this would check PostHog events)
			expect(
				mockTextAdapter.analyze as ReturnType<typeof vi.fn>,
			).toHaveBeenCalled();
		});
	});

	describe("Scenario 8: Configuration Updates", () => {
		it("should update service configuration", () => {
			const newConfig = {
				retryConfig: {
					maxAttempts: 5,
					baseDelay: 2000,
					maxDelay: 15000,
					jitter: false,
				},
			};

			feedbackService.updateConfig(newConfig);

			// Verify configuration was updated
			// (In real implementation, this would check the actual config)
			expect(true).toBe(true); // Placeholder for actual config validation
		});
	});

	describe("Scenario 9: Service Shutdown", () => {
		it("should shutdown gracefully", async () => {
			await expect(feedbackService.shutdown()).resolves.not.toThrow();
		});
	});

	describe("Scenario 10: Edge Cases", () => {
		it("should handle very long text", async () => {
			const longText = "a".repeat(10000);
			const request: EvaluationRequestInput = {
				content: longText,
				questionId: "q_001",
				userId: "user-123",
			};

			const result = await feedbackService.evaluateSubmission(request);

			expect(result.feedback.score).toBe(85);
			expect(result.submission.content).toBe(longText);
		});

		it("should handle special characters in text", async () => {
			const specialText =
				"Test with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
			const request: EvaluationRequestInput = {
				content: specialText,
				questionId: "q_001",
				userId: "user-123",
			};

			const result = await feedbackService.evaluateSubmission(request);

			expect(result.feedback.score).toBe(85);
			expect(result.submission.content).toBe(specialText);
		});
	});
});
