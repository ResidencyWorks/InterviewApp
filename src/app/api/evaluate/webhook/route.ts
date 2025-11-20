import { type NextRequest, NextResponse } from "next/server";
import { evaluationConfig } from "../../../../config";
import { EvaluationResultSchema } from "../../../../domain/evaluation/ai-evaluation-schema";
import { upsertResult } from "../../../../infrastructure/supabase/evaluation_store";

export async function POST(req: NextRequest) {
	// 1. Validate Webhook Token
	const token = req.headers.get("X-Evaluate-Webhook-Token");
	if (!token || token !== evaluationConfig.webhookSecret) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await req.json();

		// 2. Validate Payload (Expect EvaluationResult or Error)
		// If it's a success payload, it should match EvaluationResultSchema
		// The contract says payload matches Polling Response (200 OK)
		// { jobId, requestId, status, result, error, ... }

		if (body.status === "completed" && body.result) {
			const parseResult = EvaluationResultSchema.safeParse(body.result);
			if (parseResult.success) {
				// 3. Persist Result (Idempotency)
				await upsertResult(parseResult.data);
			} else {
				console.error("Webhook payload validation failed:", parseResult.error);
				return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
			}
		}

		return NextResponse.json({ received: true }, { status: 200 });
	} catch (error) {
		console.error("Webhook processing failed:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
