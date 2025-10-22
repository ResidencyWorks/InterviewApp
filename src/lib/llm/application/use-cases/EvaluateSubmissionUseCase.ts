/**
 * Use case for evaluating interview submissions
 */

import type { EvaluationRequest } from "../../domain/entities/EvaluationRequest";
import type { EvaluationStatusEntity } from "../../domain/entities/EvaluationStatus";
import type { Feedback } from "../../domain/entities/Feedback";
import type { Submission } from "../../domain/entities/Submission";
import { getContentForProcessing } from "../../domain/entities/Submission";
import {
	LLMServiceError,
	ValidationError,
} from "../../domain/errors/LLMErrors";
import type { ISpeechAdapter } from "../../domain/interfaces/ISpeechAdapter";
import type { ITextAdapter } from "../../domain/interfaces/ITextAdapter";
import type { IFeedbackService } from "../../domain/services/FeedbackService";
import type { IStatusTrackingService } from "../../domain/services/StatusTrackingService";

/**
 * Evaluation result
 */
export interface EvaluationResult {
	submission: Submission;
	feedback: Feedback;
	evaluationRequest: EvaluationRequest;
	status: EvaluationStatusEntity;
	processingTimeMs: number;
}

/**
 * Evaluation request input
 */
export interface EvaluationRequestInput {
	content: string;
	audioUrl?: string;
	questionId: string;
	userId: string;
	metadata?: Record<string, unknown>;
}

/**
 * Evaluate submission use case
 */
export class EvaluateSubmissionUseCase {
	constructor(
		private speechAdapter: ISpeechAdapter,
		private textAdapter: ITextAdapter,
		private feedbackService: IFeedbackService,
		private statusTrackingService: IStatusTrackingService,
		private maxRetries: number = 3,
	) {}

	/**
	 * Execute the evaluation use case
	 */
	async execute(input: EvaluationRequestInput): Promise<EvaluationResult> {
		const startTime = Date.now();

		try {
			// Create submission
			const submission = this.createSubmission(input);

			// Create evaluation request
			const evaluationRequest =
				this.feedbackService.createEvaluationRequest(submission);

			// Create initial status
			const status = this.statusTrackingService.createStatus(submission.id, {
				userId: submission.userId,
				questionId: submission.questionId,
				hasAudio: Boolean(submission.audioUrl),
			});

			// Update status to processing
			const processingStatus = this.statusTrackingService.updateStatus(
				status.id,
				{
					status: "processing",
					progress: 10,
					message: "Starting evaluation process",
				},
			);

			// Process the submission with progress updates
			const analysisResult = await this.processSubmissionWithProgress(
				submission,
				processingStatus.id,
			);

			// Create feedback
			const feedback = this.feedbackService.createFeedback(
				submission,
				analysisResult,
			);

			// Update evaluation request to completed
			const completedRequest = this.feedbackService.updateEvaluationStatus(
				evaluationRequest,
				"completed",
			);

			// Update status to completed
			const completedStatus = this.statusTrackingService.updateStatus(
				processingStatus.id,
				{
					status: "completed",
					progress: 100,
					message: "Evaluation completed successfully",
				},
			);

			const processingTimeMs = Date.now() - startTime;

			return {
				submission,
				feedback,
				evaluationRequest: completedRequest,
				status: completedStatus,
				processingTimeMs,
			};
		} catch (error) {
			console.error("❌ EvaluateSubmissionUseCase error:", {
				error: error instanceof Error ? error.message : "Unknown error",
				errorType: error?.constructor?.name,
				questionId: input.questionId,
				userId: input.userId,
				hasContent: Boolean(input.content),
				hasAudio: Boolean(input.audioUrl),
			});

			// Handle errors and update status
			throw this.handleEvaluationError(error, input, startTime);
		}
	}

	/**
	 * Process submission with progress tracking
	 */
	private async processSubmissionWithProgress(
		submission: Submission,
		statusId: string,
	): Promise<{
		score: number;
		feedback: string;
		strengths: string[];
		improvements: string[];
		model: string;
		processingTimeMs: number;
		transcriptionTimeMs?: number;
		analysisTimeMs?: number;
	}> {
		const processingStartTime = Date.now();

		// Get content for processing
		const contentInfo = getContentForProcessing(submission);
		let textContent = submission.content;
		let transcriptionTimeMs: number | undefined;
		let analysisTimeMs: number | undefined;

		// If it's audio, transcribe it first
		if (contentInfo.type === "audio") {
			console.log("🎵 Processing audio content:", {
				audioUrl: `${contentInfo.content.substring(0, 50)}...`,
				contentType: contentInfo.type,
			});

			// Update progress for audio processing
			this.statusTrackingService.updateStatus(statusId, {
				progress: 20,
				message: "Transcribing audio content...",
			});

			const transcriptionStartTime = Date.now();

			// Validate audio format
			const audioFormat = this.getAudioFormat(contentInfo.content);
			if (!this.speechAdapter.supportsFormat(audioFormat)) {
				throw new ValidationError("Unsupported audio format", {
					audioUrl: [
						`Audio format '${audioFormat}' is not supported. Supported formats: ${this.speechAdapter.getSupportedFormats().join(", ")}`,
					],
				});
			}

			const transcription = await this.speechAdapter.transcribe(
				contentInfo.content,
				{
					language: "en", // Default to English, could be made configurable
					responseFormat: "json",
					temperature: 0.0, // More deterministic transcription
				},
			);

			textContent = transcription.text;
			transcriptionTimeMs = Date.now() - transcriptionStartTime;

			console.log("📝 Audio transcription completed:", {
				transcriptionTimeMs,
				textLength: textContent.length,
				textPreview:
					textContent.substring(0, 100) +
					(textContent.length > 100 ? "..." : ""),
			});

			// Validate transcription result
			if (!textContent || textContent.trim().length === 0) {
				throw new ValidationError("Audio transcription failed", {
					audioUrl: ["No text was transcribed from the audio file"],
				});
			}

			// Update progress after transcription
			this.statusTrackingService.updateStatus(statusId, {
				progress: 50,
				message: "Audio transcription completed, analyzing content...",
			});
		} else {
			// Update progress for text processing
			this.statusTrackingService.updateStatus(statusId, {
				progress: 30,
				message: "Analyzing text content...",
			});
		}

		// Analyze the text content
		console.log("🧠 Starting text analysis:", {
			textLength: textContent.length,
			questionId: submission.questionId,
			userId: submission.userId,
			hasMetadata: Boolean(submission.metadata),
		});

		const analysisStartTime = Date.now();
		const analysisResult = await this.textAdapter.analyze(textContent, {
			questionId: submission.questionId,
			userId: submission.userId,
			context: submission.metadata
				? JSON.stringify(submission.metadata)
				: undefined,
		});
		analysisTimeMs = Date.now() - analysisStartTime;

		console.log("🎯 Text analysis completed:", {
			analysisTimeMs,
			score: analysisResult.score,
			feedbackLength: analysisResult.feedback.length,
			strengthsCount: analysisResult.strengths.length,
			improvementsCount: analysisResult.improvements.length,
			model: this.textAdapter.getModelName(),
		});

		// Update progress after analysis
		this.statusTrackingService.updateStatus(statusId, {
			progress: 80,
			message: "Generating feedback...",
		});

		const processingTimeMs = Date.now() - processingStartTime;

		return {
			score: analysisResult.score,
			feedback: analysisResult.feedback,
			strengths: analysisResult.strengths,
			improvements: analysisResult.improvements,
			model: this.textAdapter.getModelName(),
			processingTimeMs,
			transcriptionTimeMs,
			analysisTimeMs,
		};
	}

	/**
	 * Create submission from input
	 */
	private createSubmission(input: EvaluationRequestInput): Submission {
		// Validate input
		if (!input.content && !input.audioUrl) {
			throw new ValidationError("Content or audio URL is required", {
				content: ["Either content or audioUrl must be provided"],
				audioUrl: ["Either content or audioUrl must be provided"],
			});
		}

		if (!input.questionId) {
			throw new ValidationError("Question ID is required", {
				questionId: ["Question ID cannot be empty"],
			});
		}

		if (!input.userId) {
			throw new ValidationError("User ID is required", {
				userId: ["User ID cannot be empty"],
			});
		}

		// Generate submission ID
		const submissionId = this.generateId();

		return {
			id: submissionId,
			userId: input.userId,
			content: input.content || "", // Will be populated from audio transcription if needed
			audioUrl: input.audioUrl,
			questionId: input.questionId,
			submittedAt: new Date(),
			metadata: input.metadata,
		};
	}

	/**
	 * Handle evaluation errors
	 */
	private handleEvaluationError(
		error: unknown,
		input: EvaluationRequestInput,
		startTime: number,
	): Error {
		if (error instanceof LLMServiceError || error instanceof ValidationError) {
			return error;
		}

		// Convert unknown errors to LLM service errors
		if (error instanceof Error) {
			return new LLMServiceError(`Evaluation failed: ${error.message}`, error, {
				userId: input.userId,
				questionId: input.questionId,
				hasAudio: Boolean(input.audioUrl),
				processingTimeMs: Date.now() - startTime,
			});
		}

		return new LLMServiceError("Unknown error during evaluation", error, {
			userId: input.userId,
			questionId: input.questionId,
			hasAudio: Boolean(input.audioUrl),
			processingTimeMs: Date.now() - startTime,
		});
	}

	/**
	 * Get audio format from URL
	 */
	private getAudioFormat(audioUrl: string): string {
		try {
			const url = new URL(audioUrl);
			const pathname = url.pathname;
			const extension = pathname.split(".").pop()?.toLowerCase();
			return extension || "unknown";
		} catch {
			return "unknown";
		}
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		// Use crypto.randomUUID() if available, otherwise fallback to timestamp + random
		if (typeof crypto !== "undefined" && crypto.randomUUID) {
			return crypto.randomUUID();
		}

		// Fallback for environments without crypto.randomUUID
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Update max retries
	 */
	updateMaxRetries(maxRetries: number): void {
		this.maxRetries = maxRetries;
	}

	/**
	 * Get current max retries
	 */
	getMaxRetries(): number {
		return this.maxRetries;
	}
}
