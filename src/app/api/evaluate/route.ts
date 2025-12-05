/**
 * API endpoint for AI/ASR evaluation (M3 feature: 001-ai-asr-eval)
 * Accepts text or audio_url, validates input, and orchestrates evaluation via BullMQ.
 * Supports hybrid sync/async response: waits up to syncTimeoutMs for completion, else returns 202.
 */

import { QueueEvents } from "bullmq";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import { evaluationConfig } from "../../../config";
import { EvaluationRequestSchema } from "../../../domain/evaluation/ai-evaluation-schema";
import { evaluationQueue } from "../../../infrastructure/bullmq/queue";
import { getByRequestId } from "../../../infrastructure/supabase/evaluation_store";
import { enqueueEvaluation } from "../../../services/evaluation/enqueue";

export async function POST(req: NextRequest) {
	// 1. Authentication - Use Supabase session-based auth
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	try {
		// 2. Parse and validate request body (handle both JSON and FormData)
		const contentType = req.headers.get("content-type") || "";
		let body: Record<string, unknown>;

		if (contentType.includes("multipart/form-data")) {
			// Handle FormData (audio uploads)
			const formData = await req.formData();
			const questionId = formData.get("questionId") as string;
			const userId = formData.get("userId") as string;
			const metadataStr = formData.get("metadata") as string;
			const audioFile = formData.get("audioFile") as File;

			if (!audioFile) {
				return NextResponse.json(
					{ error: "Audio file is required for audio submissions" },
					{ status: 400 },
				);
			}

			// Parse metadata
			const metadata = metadataStr ? JSON.parse(metadataStr) : {};

			// Upload audio file to Supabase Storage
			const fileName = `audio-${questionId}-${Date.now()}.wav`;
			const filePath = `evaluations/${userId}/${fileName}`;

			const arrayBuffer = await audioFile.arrayBuffer();
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("recordings")
				.upload(filePath, arrayBuffer, {
					contentType: audioFile.type || "audio/wav",
					upsert: false,
				});

			if (uploadError) {
				console.error("Failed to upload audio file:", uploadError);
				return NextResponse.json(
					{
						error: "Failed to upload audio file",
						details: uploadError.message,
					},
					{ status: 500 },
				);
			}

			// Get public URL for the uploaded file
			const { data: urlData } = supabase.storage
				.from("recordings")
				.getPublicUrl(uploadData.path);

			// Generate a proper UUID for requestId
			const requestId = crypto.randomUUID();

			body = {
				requestId,
				audio_url: urlData.publicUrl,
				userId,
				metadata,
			};
		} else {
			// Handle JSON
			body = await req.json();
		}

		const parseResult = EvaluationRequestSchema.safeParse(body);

		if (!parseResult.success) {
			console.error("Evaluation request validation failed:", {
				body,
				errors: parseResult.error.format(),
			});
			return NextResponse.json(
				{
					error: "Invalid request",
					details: parseResult.error.format(),
				},
				{ status: 400 },
			);
		}

		const request = parseResult.data;
		const derivedUserId =
			request.userId ??
			(typeof request.metadata?.userId === "string"
				? (request.metadata.userId as string)
				: undefined);
		const requestWithUser = derivedUserId
			? { ...request, userId: derivedUserId }
			: request;

		// 3. Idempotency check - return existing result if found
		const existingResult = await getByRequestId(request.requestId);
		if (existingResult) {
			return NextResponse.json(
				{
					jobId: existingResult.jobId,
					requestId: existingResult.requestId,
					status: "completed",
					result: existingResult,
				},
				{ status: 200 },
			);
		}

		// 4. Enqueue job for evaluation
		let jobId = await enqueueEvaluation(requestWithUser);

		// 5. Attempt sync evaluation (wait for completion up to syncTimeoutMs)
		try {
			const job = await evaluationQueue.getJob(jobId);
			if (!job) {
				// Job was immediately consumed and completed? Check DB again
				const result = await getByRequestId(request.requestId);
				if (result) {
					return NextResponse.json(
						{
							jobId: result.jobId,
							requestId: result.requestId,
							status: "completed",
							result,
						},
						{ status: 200 },
					);
				}

				// Job not found and no result - shouldn't happen, but return 202
				return NextResponse.json(
					{
						jobId,
						requestId: request.requestId,
						status: "queued",
						poll_url: `/api/evaluate/status/${jobId}`,
					},
					{ status: 202 },
				);
			}

			// Create QueueEvents for listening to job completion
			const queueEvents = new QueueEvents(evaluationQueue.name, {
				connection: evaluationQueue.opts.connection,
			});

			try {
				// If the job already has a recorded failure (from a previous worker run),
				// remove it and enqueue a fresh job so the worker can reprocess cleanly.
				if (job.failedReason) {
					console.warn(
						`[Evaluate API] Job ${jobId} has recorded failure:`,
						job.failedReason,
					);
					try {
						await job.remove();
						jobId = await enqueueEvaluation(requestWithUser);
						console.info(
							`[Evaluate API] Re-enqueued job ${jobId} after removing failed record`,
						);
					} catch (requeueError) {
						console.error(
							`[Evaluate API] Failed to requeue job ${jobId}:`,
							requeueError,
						);
					}
					return NextResponse.json(
						{
							jobId,
							requestId: request.requestId,
							status: "queued",
							poll_url: `/api/evaluate/status/${jobId}`,
						},
						{ status: 202 },
					);
				}

				// Wait for job completion with timeout
				await job.waitUntilFinished(
					queueEvents,
					evaluationConfig.syncTimeoutMs,
				);

				// Job completed within timeout - fetch from DB
				const completedResult = await getByRequestId(request.requestId);
				if (completedResult) {
					return NextResponse.json(
						{
							jobId: completedResult.jobId,
							requestId: completedResult.requestId,
							status: "completed",
							result: completedResult,
						},
						{ status: 200 },
					);
				}

				// Job completed but not in DB yet (race condition) - return 202
				return NextResponse.json(
					{
						jobId,
						requestId: request.requestId,
						status: "processing",
						poll_url: `/api/evaluate/status/${jobId}`,
					},
					{ status: 202 },
				);
			} finally {
				await queueEvents.close();
			}
		} catch (error) {
			// Timeout or job failed during sync wait
			if (error instanceof Error && error.message.includes("timed out")) {
				// Timeout - return 202 with polling instructions
				return NextResponse.json(
					{
						jobId,
						requestId: request.requestId,
						status: "queued",
						poll_url: `/api/evaluate/status/${jobId}`,
					},
					{ status: 202 },
				);
			}

			// Job failed - check if error was persisted
			const failedResult = await getByRequestId(request.requestId);
			if (failedResult) {
				return NextResponse.json(
					{
						jobId: failedResult.jobId,
						requestId: failedResult.requestId,
						status: "failed",
						error: {
							code: "evaluation_failed",
							message: "Evaluation job failed",
						},
					},
					{ status: 500 },
				);
			}

			// Re-throw if not a known error
			throw error;
		}
	} catch (error) {
		const stack = error instanceof Error ? error.stack : undefined;
		console.error("Evaluation endpoint error:", error, stack ?? null);
		console.error("Evaluation endpoint error (trace):", new Error().stack);
		// captureException(error as Error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
