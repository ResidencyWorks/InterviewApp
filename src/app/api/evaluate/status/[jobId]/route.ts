import { type NextRequest, NextResponse } from "next/server";
import { evaluationQueue } from "../../../../../infrastructure/bullmq/queue";
import { getByJobId } from "../../../../../infrastructure/supabase/evaluation_store";

type StatusRouteParams = { jobId: string };

export async function GET(
	_req: NextRequest,
	context: { params: StatusRouteParams | Promise<StatusRouteParams> },
) {
	const { jobId } = await context.params;

	console.log(`[Status API] Checking status for jobId: ${jobId}`);

	// 1. Check DB first for completed result (authoritative and persistent)
	let storedResult = null;
	try {
		storedResult = await getByJobId(jobId);
		console.log(
			`[Status API] DB lookup result:`,
			storedResult ? "FOUND" : "NOT FOUND",
		);
	} catch (error) {
		console.error(`[Status API] DB lookup error:`, error);
	}

	if (storedResult) {
		return NextResponse.json({
			jobId,
			requestId: storedResult.requestId,
			status: "completed",
			result: storedResult,
			error: null,
			poll_after_ms: 0,
		});
	}

	// 2. Job not in DB, check if it's still in the queue (active/pending)
	let job = null;
	try {
		job = await evaluationQueue.getJob(jobId);
	} catch (error) {
		// Redis connection error - if job isn't in DB, we can't check queue status
		console.error("Failed to check job queue:", error);
		// Since job is not in DB (checked above) and we can't check queue, return 404
		return NextResponse.json(
			{
				error: "Job not found",
				details: "Unable to verify job status",
			},
			{ status: 404 },
		);
	}

	if (!job) {
		// Job not in queue and not in DB - it doesn't exist or has expired
		return NextResponse.json({ error: "Job not found" }, { status: 404 });
	}

	const requestId = job.data.requestId;

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
