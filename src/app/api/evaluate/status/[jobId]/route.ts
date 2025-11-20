import { type NextRequest, NextResponse } from "next/server";
import { evaluationQueue } from "../../../../../infrastructure/bullmq/queue";
import { getByRequestId } from "../../../../../infrastructure/supabase/evaluation_store";

export async function GET(
	_req: NextRequest,
	{ params }: { params: { jobId: string } },
) {
	const { jobId } = params;

	// 1. Check DB for completed result (authoritative for success)
	// Note: We don't have requestId here easily unless we query job first or it's passed.
	// But getByRequestId requires requestId.
	// The spec says "GET /api/evaluate/status/:jobId".
	// We need to look up the job in Queue to get the requestId, OR query DB by jobId.
	// Our store `getByRequestId` is by requestId.
	// Let's assume we can get the job from the queue to find the requestId.

	const job = await evaluationQueue.getJob(jobId);

	if (!job) {
		// If job is not in queue (expired/removed), check DB by jobId?
		// Our store currently only has `getByRequestId`.
		// We might need `getByJobId` or just rely on queue for recent jobs.
		// If job is gone from queue and not in DB (we can't check DB without requestId), it's 404.
		// Wait, we can add `getByJobId` to store or just fail if queue doesn't have it.
		// For now, let's assume if it's not in queue, we can't find it unless we add `getByJobId`.
		// Let's stick to queue first.
		return NextResponse.json({ error: "Job not found" }, { status: 404 });
	}

	const requestId = job.data.requestId;

	// Check DB for final result (idempotency/persistence)
	const storedResult = await getByRequestId(requestId);
	if (storedResult) {
		return NextResponse.json({
			jobId,
			requestId,
			status: "completed",
			result: storedResult,
			error: null,
			poll_after_ms: 0,
		});
	}

	// Check Queue Status
	const isFailed = await job.isFailed();
	const isCompleted = await job.isCompleted(); // It might be completed but not yet in DB (race) or DB read failed?
	const isActive = await job.isActive();

	let status = "queued";
	if (isFailed) status = "failed";
	else if (isActive) status = "processing";
	else if (isCompleted) status = "processing"; // If completed but not in DB yet, treat as processing/finishing

	let error = null;
	if (isFailed) {
		error = {
			code: "job_failed",
			message: job.failedReason || "Unknown error",
		};
	}

	return NextResponse.json({
		jobId,
		requestId,
		status,
		result: null,
		error,
		poll_after_ms: status === "failed" ? 0 : 3000,
	});
}
