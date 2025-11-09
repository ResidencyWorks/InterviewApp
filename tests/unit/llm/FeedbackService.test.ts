/**
 * Unit tests for FeedbackService
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { Submission } from "@/features/scheduling/llm/domain/entities/Submission";
import { ValidationError } from "@/features/scheduling/llm/domain/errors/LLMErrors";
import { FeedbackService } from "@/features/scheduling/llm/domain/services/FeedbackService";

describe("FeedbackService", () => {
	let feedbackService: FeedbackService;

	beforeEach(() => {
		feedbackService = new FeedbackService();
	});

	describe("createFeedback", () => {
		const mockSubmission: Submission = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			userId: "550e8400-e29b-41d4-a716-446655440001",
			content: "Test interview response",
			questionId: "q-123",
			submittedAt: new Date(),
		};

		it("should create feedback successfully", () => {
			const analysisResult = {
				score: 85,
				feedback: "Good response with clear examples",
				strengths: ["Clear communication", "Good examples"],
				improvements: ["More specific metrics"],
				model: "gpt-4",
				processingTimeMs: 1500,
			};

			const feedback = feedbackService.createFeedback(
				mockSubmission,
				analysisResult,
			);

			expect(feedback.id).toBeDefined();
			expect(feedback.submissionId).toBe(mockSubmission.id);
			expect(feedback.score).toBe(85);
			expect(feedback.feedback).toBe("Good response with clear examples");
			expect(feedback.strengths).toEqual([
				"Clear communication",
				"Good examples",
			]);
			expect(feedback.improvements).toEqual(["More specific metrics"]);
			expect(feedback.model).toBe("gpt-4");
		});

		it("should throw validation error for invalid score", () => {
			const analysisResult = {
				score: 150, // Invalid score > 100
				feedback: "Good response with clear examples",
				strengths: ["Clear communication"],
				improvements: ["More specific metrics"],
				model: "gpt-4",
				processingTimeMs: 1500,
			};

			expect(() => {
				feedbackService.createFeedback(mockSubmission, analysisResult);
			}).toThrow(ValidationError);
		});

		it("should throw validation error for short feedback", () => {
			const analysisResult = {
				score: 85,
				feedback: "Short", // Too short
				strengths: ["Clear communication"],
				improvements: ["More specific metrics"],
				model: "gpt-4",
				processingTimeMs: 1500,
			};

			expect(() => {
				feedbackService.createFeedback(mockSubmission, analysisResult);
			}).toThrow(ValidationError);
		});

		it("should throw validation error for empty strengths", () => {
			const analysisResult = {
				score: 85,
				feedback: "Good response with clear examples",
				strengths: [], // Empty strengths
				improvements: ["More specific metrics"],
				model: "gpt-4",
				processingTimeMs: 1500,
			};

			expect(() => {
				feedbackService.createFeedback(mockSubmission, analysisResult);
			}).toThrow(ValidationError);
		});

		it("should throw validation error for empty improvements", () => {
			const analysisResult = {
				score: 85,
				feedback: "Good response with clear examples",
				strengths: ["Clear communication"],
				improvements: [], // Empty improvements
				model: "gpt-4",
				processingTimeMs: 1500,
			};

			expect(() => {
				feedbackService.createFeedback(mockSubmission, analysisResult);
			}).toThrow(ValidationError);
		});
	});

	describe("createEvaluationRequest", () => {
		const mockSubmission: Submission = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			userId: "550e8400-e29b-41d4-a716-446655440001",
			content: "Test interview response",
			questionId: "q-123",
			submittedAt: new Date(),
		};

		it("should create evaluation request successfully", () => {
			const request = feedbackService.createEvaluationRequest(mockSubmission);

			expect(request.id).toBeDefined();
			expect(request.submissionId).toBe(mockSubmission.id);
			expect(request.status).toBe("pending");
			expect(request.requestedAt).toBeInstanceOf(Date);
		});
	});

	describe("updateEvaluationStatus", () => {
		const mockSubmission: Submission = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			userId: "550e8400-e29b-41d4-a716-446655440001",
			content: "Test interview response",
			questionId: "q-123",
			submittedAt: new Date(),
		};

		it("should update evaluation status", () => {
			const request = feedbackService.createEvaluationRequest(mockSubmission);
			const updatedRequest = feedbackService.updateEvaluationStatus(
				request,
				"processing",
			);

			expect(updatedRequest.status).toBe("processing");
			expect(updatedRequest.requestedAt).toBeInstanceOf(Date);
		});

		it("should update status with error message", () => {
			const request = feedbackService.createEvaluationRequest(mockSubmission);
			const updatedRequest = feedbackService.updateEvaluationStatus(
				request,
				"failed",
				"API timeout",
			);

			expect(updatedRequest.status).toBe("failed");
			expect(updatedRequest.errorMessage).toBe("API timeout");
		});
	});

	describe("canRetryEvaluation", () => {
		const mockSubmission: Submission = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			userId: "550e8400-e29b-41d4-a716-446655440001",
			content: "Test interview response",
			questionId: "q-123",
			submittedAt: new Date(),
		};

		it("should allow retry when under max retries", () => {
			const request = feedbackService.createEvaluationRequest(mockSubmission);
			const canRetry = feedbackService.canRetryEvaluation(request, 3);

			expect(canRetry).toBe(true);
		});

		it("should not allow retry when at max retries", () => {
			const request = feedbackService.createEvaluationRequest(mockSubmission);
			// Simulate multiple retries
			request.retryCount = 3;
			const canRetry = feedbackService.canRetryEvaluation(request, 3);

			expect(canRetry).toBe(false);
		});
	});

	describe("getFeedbackMetrics", () => {
		it("should return feedback quality metrics", () => {
			const mockFeedback = {
				id: "550e8400-e29b-41d4-a716-446655440002",
				submissionId: "550e8400-e29b-41d4-a716-446655440000",
				score: 85,
				feedback: "Good response with clear examples",
				strengths: ["Clear communication", "Good examples"],
				improvements: ["More specific metrics"],
				model: "gpt-4",
				processingTimeMs: 1500,
				generatedAt: new Date(),
			};

			const metrics = feedbackService.getFeedbackMetrics(mockFeedback);

			expect(metrics).toHaveProperty("qualityLevel");
			expect(metrics).toHaveProperty("hasStrengths");
			expect(metrics).toHaveProperty("hasImprovements");
			expect(metrics).toHaveProperty("processingEfficiency");
			expect(metrics.hasStrengths).toBe(true);
			expect(metrics.hasImprovements).toBe(true);
		});
	});

	describe("validateFeedback", () => {
		it("should validate feedback successfully", () => {
			const mockFeedback = {
				id: "550e8400-e29b-41d4-a716-446655440002",
				submissionId: "550e8400-e29b-41d4-a716-446655440000",
				score: 85,
				feedback: "Good response with clear examples",
				strengths: ["Clear communication"],
				improvements: ["More specific metrics"],
				model: "gpt-4",
				processingTimeMs: 1500,
				generatedAt: new Date(),
			};

			const validatedFeedback = feedbackService.validateFeedback(mockFeedback);

			expect(validatedFeedback).toEqual(mockFeedback);
		});

		it("should throw error for invalid feedback", () => {
			const invalidFeedback = {
				score: 150, // Invalid score
				feedback: "Short", // Too short
			};

			expect(() => {
				feedbackService.validateFeedback(invalidFeedback);
			}).toThrow();
		});
	});
});
