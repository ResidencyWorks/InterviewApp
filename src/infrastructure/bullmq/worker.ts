import { type Job, Worker } from "bullmq";
import type {
	EvaluationRequest,
	EvaluationResult,
} from "../../domain/evaluation/ai-evaluation-schema";
import { EvaluationResultSchema } from "../../domain/evaluation/ai-evaluation-schema";
import { evaluateTranscript } from "../openai/gpt_evaluator";
import { transcribeAudio } from "../openai/whisper";
import { captureEvent } from "../posthog";
import { getByRequestId, upsertResult } from "../supabase/evaluation_store";
import { connection, EVALUATION_QUEUE_NAME } from "./queue";

/**
 * BullMQ worker that processes evaluation jobs.
 * Handles transcription (if audio_url provided), GPT evaluation, validation, persistence, and analytics.
 */
export const evaluationWorker = new Worker<EvaluationRequest>(
	EVALUATION_QUEUE_NAME,
	async (job: Job<EvaluationRequest>) => {
		const startTime = Date.now();
		const { requestId, text, audio_url } = job.data;

		console.log(`[Worker] Processing job ${job.id} for request ${requestId}`);

		try {
			// T022: Idempotency guard - check if already processed
			const existingResult = await getByRequestId(requestId);
			if (existingResult) {
				console.log(
					`[Worker] Request ${requestId} already processed, skipping`,
				);

				// Emit events with cached data
				captureEvent("job_completed", {
					jobId: job.id,
					requestId,
					durationMs: existingResult.durationMs,
					tokensUsed: existingResult.tokensUsed ?? null,
					cached: true,
				});

				captureEvent("score_returned", {
					requestId,
					score: existingResult.score,
					cached: true,
				});

				return existingResult;
			}

			let transcript = text || "";
			let transcriptionDurationMs = 0;

			// T018: Transcribe audio if provided
			if (audio_url && !text) {
				console.log(`[Worker] Transcribing audio from ${audio_url}`);
				const transcriptionResult = await transcribeAudio(audio_url);
				transcript = transcriptionResult.transcript;
				transcriptionDurationMs = transcriptionResult.durationMs;
				console.log(
					`[Worker] Transcription completed in ${transcriptionDurationMs}ms`,
				);
			}

			// Validate transcript exists
			if (!transcript) {
				throw new Error("No transcript available for evaluation");
			}

			// T019: Evaluate with GPT-4
			console.log(
				`[Worker] Evaluating transcript (${transcript.length} chars)`,
			);
			const evaluation = await evaluateTranscript(transcript);
			console.log(
				`[Worker] Evaluation completed: score=${evaluation.score}, tokens=${evaluation.tokensUsed ?? "N/A"}`,
			);

			// Calculate total duration
			const durationMs = Date.now() - startTime;

			// Build result object
			const result: EvaluationResult = {
				requestId,
				jobId: job.id ?? requestId,
				score: evaluation.score,
				feedback: evaluation.feedback,
				what_changed: evaluation.what_changed,
				practice_rule: evaluation.practice_rule,
				durationMs,
				tokensUsed: evaluation.tokensUsed,
			};

			// Validate result against schema
			EvaluationResultSchema.parse(result);

			// Persist to database
			await upsertResult(result);
			console.log(`[Worker] Result persisted for request ${requestId}`);

			// Emit analytics events
			captureEvent("job_completed", {
				jobId: job.id,
				requestId,
				durationMs,
				transcriptionDurationMs,
				tokensUsed: result.tokensUsed ?? null,
				hadAudio: !!audio_url,
				cached: false,
			});

			captureEvent("score_returned", {
				requestId,
				score: result.score,
				cached: false,
			});

			console.log(`[Worker] Job ${job.id} completed successfully`);
			return result;
		} catch (error) {
			const durationMs = Date.now() - startTime;
			console.error(`[Worker] Job ${job.id} failed:`, error);

			// Emit failure event
			captureEvent("job_failed", {
				jobId: job.id,
				requestId,
				durationMs,
				error: error instanceof Error ? error.message : String(error),
			});

			throw error;
		}
	},
	{
		connection,
		concurrency: 1, // Process one job at a time for simplicity
	},
);

// Handle worker events
evaluationWorker.on("completed", (job) => {
	console.log(`[Worker] Job ${job.id} completed`);
});

evaluationWorker.on("failed", (job, err) => {
	console.error(`[Worker] Job ${job?.id} failed:`, err);
});

evaluationWorker.on("error", (err) => {
	console.error("[Worker] Worker error:", err);
});

console.log(
	`[Worker] Evaluation worker started, listening to queue: ${EVALUATION_QUEUE_NAME}`,
);
