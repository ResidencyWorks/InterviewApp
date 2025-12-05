import { type NextRequest, NextResponse } from "next/server";
import { evaluationQueue } from "@/infrastructure/bullmq/queue";
import { getByJobId } from "@/infrastructure/supabase/evaluation_store";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createNotFoundResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ submissionId: string }> },
) {
	try {
		// Authentication - Use Supabase session-based auth
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createUnauthorizedResponse("Authentication required");
		}

		const { submissionId } = await params;

		if (!submissionId) {
			return createErrorResponse(
				"Submission ID is required",
				"MISSING_SUBMISSION_ID",
				400,
			);
		}

		// Try to get the job from BullMQ first
		const job = await evaluationQueue.getJob(submissionId);

		console.log(
			`[Status] Checking job ${submissionId}, found in queue:`,
			!!job,
		);

		if (!job) {
			// Job not found in queue, check if result is in database
			console.log(
				`[Status] Job not in queue, checking database for ${submissionId}`,
			);
			const result = await getByJobId(submissionId);
			console.log(`[Status] Database result for ${submissionId}:`, !!result);

			if (result) {
				// Result exists in database - evaluation completed
				console.log(`[Status] Returning completed result for ${submissionId}`);
				return NextResponse.json({
					submissionId,
					status: "completed",
					progress: 100,
					result: result,
					createdAt: result.createdAt || new Date().toISOString(),
				});
			}

			// Not in queue or database
			console.log(
				`[Status] Job ${submissionId} not found in queue or database`,
			);
			return createNotFoundResponse("Evaluation job");
		}

		// Job exists in queue - check its state
		const state = await job.getState();
		const progress = job.progress;
		const returnValue = await job.returnvalue;

		console.log(
			`[Status] Job ${submissionId} state: ${state}, progress: ${progress}, hasReturnValue: ${!!returnValue}`,
		);

		let status: string;
		let result = null;

		switch (state) {
			case "completed":
				// Try to get result from database
				console.log(
					`[Status] Job completed, fetching from database for ${submissionId}`,
				);
				result = await getByJobId(submissionId);
				console.log(`[Status] Database result found: ${!!result}`);

				// If not in database yet, try the return value from the job
				if (!result && returnValue) {
					console.log(
						`[Status] Using return value from job for ${submissionId}`,
					);
					result = returnValue;
				}
				status = "completed";
				break;
			case "failed":
				status = "failed";
				console.log(`[Status] Job ${submissionId} failed`);
				break;
			case "active":
				status = "processing";
				console.log(`[Status] Job ${submissionId} is active/processing`);
				break;
			case "waiting":
			case "delayed":
				status = "queued";
				console.log(`[Status] Job ${submissionId} is queued/waiting`);
				break;
			default:
				status = state;
				console.log(`[Status] Job ${submissionId} has unknown state: ${state}`);
		}

		return NextResponse.json({
			submissionId,
			status,
			progress: typeof progress === "number" ? progress : 0,
			result: result,
			createdAt: new Date(job.timestamp).toISOString(),
		});
	} catch (error) {
		console.error("Error in status endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
