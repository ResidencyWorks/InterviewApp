import type { EvaluationRequest } from "../../domain/evaluation/ai-evaluation-schema";
import { evaluationQueue } from "../../infrastructure/bullmq/queue";

/**
 * Enqueues an evaluation job to the BullMQ queue.
 * @param request - The evaluation request containing requestId, text, audio_url, and metadata.
 * @returns The jobId of the enqueued job.
 */
export async function enqueueEvaluation(
	request: EvaluationRequest,
): Promise<string> {
	const job = await evaluationQueue.add("evaluate", request, {
		jobId: request.requestId, // Use requestId as jobId for idempotency
	});

	return job.id ?? request.requestId;
}
