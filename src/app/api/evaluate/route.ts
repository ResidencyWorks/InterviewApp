/**
 * API endpoint for evaluating interview submissions
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateTranscript } from "@/domain/evaluation/evaluation-engine";
import { validateEvaluationResult } from "@/domain/evaluation/evaluation-schema";
import { FakeASRService } from "@/features/scheduling/asr/FakeASRService";
import { createLLMFeedbackService } from "@/features/scheduling/llm/application/services/LLMFeedbackService";
import {
	CircuitBreakerError,
	LLMServiceError,
	ValidationError,
} from "@/features/scheduling/llm/domain/errors/LLMErrors";
import { OpenAISpeechAdapter } from "@/features/scheduling/llm/infrastructure/openai/OpenAISpeechAdapter";
import { OpenAITextAdapter } from "@/features/scheduling/llm/infrastructure/openai/OpenAITextAdapter";
import { parseConfig } from "@/features/scheduling/llm/types/config";
import {
	createErrorResponse,
	createRateLimitResponse,
} from "@/presentation/api/api-helpers";

// Simple in-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting check
 */
function checkRateLimit(
	request: NextRequest,
	maxRequests = 10,
	windowMs = 60000,
): NextResponse | null {
	const clientId = request.headers.get("x-forwarded-for") || "unknown";
	const now = Date.now();

	// Clean up expired entries
	for (const [key, value] of Array.from(rateLimitStore.entries())) {
		if (value.resetTime < now) {
			rateLimitStore.delete(key);
		}
	}

	const current = rateLimitStore.get(clientId);

	if (!current) {
		rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
		return null; // Rate limit passed
	}

	if (current.resetTime < now) {
		rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
		return null; // Rate limit passed
	}

	if (current.count >= maxRequests) {
		const retryAfter = Math.ceil((current.resetTime - now) / 1000);
		return createRateLimitResponse(retryAfter);
	}

	current.count++;
	return null; // Rate limit passed
}

/**
 * Request validation schema
 */
const EvaluateRequestSchema = z
	.object({
		content: z
			.string()
			.min(10, "Content must be at least 10 characters")
			.optional(),
		audioUrl: z
			.string()
			.refine(
				(val) => {
					if (!val) return true; // Optional field
					// Accept either valid URLs or base64 data URLs
					try {
						new URL(val);
						return true;
					} catch {
						// Check if it's a base64 data URL
						return val.startsWith("data:audio/");
					}
				},
				{
					message:
						"Must be a valid URL or base64 data URL starting with 'data:audio/'",
				},
			)
			.optional(),
		questionId: z.string().min(1, "Question ID is required"),
		userId: z.string().min(1, "User ID is required"),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.refine((data) => data.content || data.audioUrl, {
		message: "Either content or audioUrl must be provided",
		path: ["content", "audioUrl"],
	})
	.refine(
		(data) => {
			// If audioUrl is provided, validate it's a supported format
			if (data.audioUrl) {
				const supportedFormats = [
					"mp3",
					"mp4",
					"mpeg",
					"mpga",
					"m4a",
					"wav",
					"webm",
				];

				// Handle base64 data URLs
				if (data.audioUrl.startsWith("data:audio/")) {
					const mimeType = data.audioUrl.split(";")[0].replace("data:", "");
					return supportedFormats.some((format) => mimeType.includes(format));
				}

				// Handle regular URLs
				try {
					const url = new URL(data.audioUrl);
					const extension = url.pathname.split(".").pop()?.toLowerCase();
					return extension && supportedFormats.includes(extension);
				} catch {
					return false;
				}
			}
			return true;
		},
		{
			message:
				"Audio format not supported. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm",
			path: ["audioUrl"],
		},
	);

/**
 * POST /api/evaluate - Evaluate a submission
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Rate limiting check
		const rateLimitError = checkRateLimit(request, 10, 60000); // 10 requests per minute
		if (rateLimitError) {
			return rateLimitError;
		}

		// Check request size limit (2MB max for JSON, 25MB for multipart audio)
		const contentLength = request.headers.get("content-length");
		const contentType = request.headers.get("content-type");
		const isMultipart = contentType?.includes("multipart/form-data");
		const maxSize = isMultipart ? 25 * 1024 * 1024 : 2 * 1024 * 1024; // 25MB for audio, 2MB for JSON

		if (contentLength && parseInt(contentLength, 10) > maxSize) {
			return createErrorResponse(
				"Request payload too large",
				"PAYLOAD_TOO_LARGE",
				413,
			);
		}

		// Parse and validate request body (use clone to avoid disturbing original body in dev)
		let body: Record<string, unknown>;
		try {
			if (isMultipart) {
				// Handle FormData (audio upload) - don't clone formData, read it once
				const formData = await request.formData();
				const audioFile = formData.get("audioFile") as File | null;
				const questionId = formData.get("questionId") as string;
				const userId = formData.get("userId") as string;
				const metadataStr = formData.get("metadata") as string;

				let metadata = {};
				if (metadataStr) {
					try {
						metadata = JSON.parse(metadataStr);
					} catch {
						// Ignore metadata parse error
					}
				}

				if (!audioFile) {
					return createErrorResponse(
						"Audio file is required",
						"MISSING_AUDIO_FILE",
						400,
					);
				}

				console.log("📁 Received FormData with audio file:", {
					fileName: audioFile.name,
					fileSize: audioFile.size,
					fileType: audioFile.type,
					questionId,
					userId,
				});

				// Convert audio file to base64 data URL for processing
				let arrayBuffer: ArrayBuffer;
				try {
					arrayBuffer = await audioFile.arrayBuffer();
				} catch (bufferError) {
					console.error("Failed to read audio file buffer:", bufferError);
					return createErrorResponse(
						"Failed to read audio file",
						"AUDIO_READ_ERROR",
						400,
					);
				}

				const base64String = Buffer.from(arrayBuffer).toString("base64");
				const audioUrl = `data:${audioFile.type || "audio/wav"};base64,${base64String}`;

				body = {
					audioUrl,
					questionId,
					userId,
					metadata,
				};
			} else {
				// Handle JSON request - use clone for JSON to avoid body lock
				body = await request.clone().json();
			}
		} catch (parseError) {
			console.error("Failed to parse request body:", parseError);
			return createErrorResponse("Invalid request body", "INVALID_BODY", 400);
		}

		// Simple transcript-only fallback path for M0
		interface TranscriptOnlyBody {
			transcript: string;
		}
		const maybeTranscript = body as Partial<TranscriptOnlyBody>;
		if (
			typeof maybeTranscript.transcript === "string" &&
			maybeTranscript.transcript.trim().length > 0
		) {
			const result = await evaluateTranscript(maybeTranscript.transcript);
			const validated = validateEvaluationResult(result);
			return NextResponse.json(validated, { status: 200 });
		}

		// Check parsed body size
		const bodyString = JSON.stringify(body);
		if (bodyString.length > 2 * 1024 * 1024) {
			return createErrorResponse(
				"Request payload too large",
				"PAYLOAD_TOO_LARGE",
				413,
			);
		}

		const validatedData = EvaluateRequestSchema.parse(body);

		// Get configuration
		const config = parseConfig();

		// Log configuration details (without exposing sensitive data)
		console.log("⚙️ LLM Service Configuration:", {
			hasApiKey: Boolean(config.openai.apiKey),
			apiKeyLength: config.openai.apiKey?.length || 0,
			textModel: config.openai.textModel,
			whisperModel: config.openai.whisperModel,
			maxRetries: config.openai.maxRetries,
			timeout: config.openai.timeout,
			fallbackEnabled: config.fallback.enabled,
			fallbackScore: config.fallback.defaultScore,
			debug: config.debug,
		});

		// Initialize adapters
		const useFakeAsr =
			process.env.NEXT_PUBLIC_USE_FAKE_ASR === "true" ||
			process.env.USE_FAKE_ASR === "true";
		const speechAdapter = useFakeAsr
			? new FakeASRService({ minDelayMs: 300, maxDelayMs: 1200 })
			: new OpenAISpeechAdapter({
					apiKey: config.openai.apiKey,
					model: config.openai.whisperModel,
					timeout: config.openai.timeout,
					maxRetries: config.openai.maxRetries,
				});

		const textAdapter = new OpenAITextAdapter({
			apiKey: config.openai.apiKey,
			model: config.openai.textModel,
			timeout: config.openai.timeout,
			maxRetries: config.openai.maxRetries,
		});

		// Initialize LLM feedback service
		const feedbackService = createLLMFeedbackService({
			speechAdapter,
			textAdapter,
			retryConfig: config.retry,
			circuitBreakerConfig: config.circuitBreaker,
			fallbackConfig: config.fallback,
			analyticsConfig: config.analytics,
			debug: config.debug,
		});

		// Log evaluation request details
		console.log("🔍 Starting evaluation request:", {
			questionId: validatedData.questionId,
			userId: validatedData.userId,
			hasContent: Boolean(validatedData.content),
			hasAudio: Boolean(validatedData.audioUrl),
			contentLength: validatedData.content?.length || 0,
			audioUrlType: validatedData.audioUrl?.startsWith("data:")
				? "base64"
				: "url",
			metadata: validatedData.metadata,
		});

		// Evaluate the submission
		try {
			const result = await feedbackService.evaluateSubmission({
				content: validatedData.content || "",
				audioUrl: validatedData.audioUrl,
				questionId: validatedData.questionId,
				userId: validatedData.userId,
				metadata: validatedData.metadata,
			});

			// Log evaluation result details
			console.log("✅ Evaluation completed:", {
				submissionId: result.submission.id,
				score: result.feedback.score,
				processingTimeMs: result.processingTimeMs,
				model: result.feedback.model,
				status: result.status.status,
				hasStrengths: result.feedback.strengths.length > 0,
				hasImprovements: result.feedback.improvements.length > 0,
			});

			// Return successful response
			return NextResponse.json({
				success: true,
				data: {
					submissionId: result.submission.id,
					feedback: {
						id: result.feedback.id,
						score: result.feedback.score,
						feedback: result.feedback.feedback,
						strengths: result.feedback.strengths,
						improvements: result.feedback.improvements,
						generatedAt: result.feedback.generatedAt,
						model: result.feedback.model,
						processingTimeMs: result.feedback.processingTimeMs,
					},
					evaluationRequest: {
						id: result.evaluationRequest.id,
						status: result.evaluationRequest.status,
						requestedAt: result.evaluationRequest.requestedAt,
						retryCount: result.evaluationRequest.retryCount,
					},
					status: {
						id: result.status.id,
						status: result.status.status,
						progress: result.status.progress,
						message: result.status.message,
						startedAt: result.status.startedAt,
						updatedAt: result.status.updatedAt,
						completedAt: result.status.completedAt,
					},
					processingTimeMs: result.processingTimeMs,
				},
			});
		} catch (evaluateError) {
			console.error("❌ Evaluation failed:", evaluateError);
			if (evaluateError instanceof ValidationError) {
				return createErrorResponse(
					evaluateError.message,
					evaluateError.code,
					evaluateError.statusCode,
					evaluateError.details,
				);
			}
			if (evaluateError instanceof LLMServiceError) {
				return createErrorResponse(
					evaluateError.message,
					evaluateError.code,
					evaluateError.statusCode,
					{
						apiError: evaluateError.apiError,
					},
				);
			}
			if (evaluateError instanceof CircuitBreakerError) {
				return createErrorResponse(
					evaluateError.message,
					evaluateError.code,
					evaluateError.statusCode,
					{
						retryAfter: evaluateError.retryAfter,
					},
				);
			}
			return createErrorResponse("Evaluation failed", "EVALUATION_ERROR", 500, {
				message:
					evaluateError instanceof Error
						? evaluateError.message
						: String(evaluateError),
				stack: evaluateError instanceof Error ? evaluateError.stack : "",
			});
		}
	} catch (error) {
		// Handle validation errors
		if (error instanceof z.ZodError) {
			const validationErrors: Record<string, string[]> = {};
			error.issues.forEach((err) => {
				const path = err.path.join(".");
				if (!validationErrors[path]) {
					validationErrors[path] = [];
				}
				validationErrors[path].push(err.message);
			});

			return createErrorResponse(
				"Validation failed",
				"VALIDATION_ERROR",
				400,
				validationErrors,
			);
		}

		// Handle domain errors
		if (error instanceof ValidationError) {
			return createErrorResponse(
				error.message,
				error.code,
				error.statusCode,
				error.details,
			);
		}

		if (error instanceof LLMServiceError) {
			return createErrorResponse(error.message, error.code, error.statusCode, {
				apiError: error.apiError,
			});
		}

		if (error instanceof CircuitBreakerError) {
			return createErrorResponse(error.message, error.code, error.statusCode, {
				retryAfter: error.retryAfter,
			});
		}

		// Handle unexpected errors
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : "";
		console.error("❌ Unexpected error in evaluate endpoint:", {
			message: errorMessage,
			stack: errorStack,
			type: error instanceof Error ? error.name : typeof error,
		});
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}

/**
 * GET /api/evaluate - Get service health status
 */
export async function GET(): Promise<NextResponse> {
	try {
		// Get configuration
		const config = parseConfig();

		// Initialize adapters
		const speechAdapter = new OpenAISpeechAdapter({
			apiKey: config.openai.apiKey,
			model: config.openai.whisperModel,
			timeout: config.openai.timeout,
			maxRetries: config.openai.maxRetries,
		});

		const textAdapter = new OpenAITextAdapter({
			apiKey: config.openai.apiKey,
			model: config.openai.textModel,
			timeout: config.openai.timeout,
			maxRetries: config.openai.maxRetries,
		});

		// Initialize LLM feedback service
		const feedbackService = createLLMFeedbackService({
			speechAdapter,
			textAdapter,
			retryConfig: config.retry,
			circuitBreakerConfig: config.circuitBreaker,
			fallbackConfig: config.fallback,
			analyticsConfig: config.analytics,
			debug: config.debug,
		});

		// Get health status
		const healthStatus = await feedbackService.getHealthStatus();

		return NextResponse.json({
			success: true,
			data: {
				service: "llm-feedback-engine",
				version: "1.0.0",
				status: healthStatus.status,
				components: {
					circuitBreaker: {
						state: healthStatus.circuitBreaker,
					},
					adapters: healthStatus.adapters,
					analytics: healthStatus.analytics,
					monitoring: healthStatus.monitoring,
				},
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Error getting health status:", error);
		return createErrorResponse(
			"Failed to get health status",
			"HEALTH_CHECK_ERROR",
			500,
		);
	}
}
