import type { EvaluationResult } from "../../domain/evaluation/ai-evaluation-schema";
import { getSupabaseServiceRoleClient } from "../config/clients";

const TABLE_NAME = "evaluation_results";

export async function getByRequestId(
	requestId: string,
): Promise<EvaluationResult | null> {
	const supabase = getSupabaseServiceRoleClient();
	if (!supabase) {
		throw new Error("Supabase service role client not initialized");
	}

	const { data, error } = await supabase
		.from(TABLE_NAME)
		.select("*")
		.eq("request_id", requestId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// Not found
			return null;
		}
		throw new Error(`Failed to fetch evaluation result: ${error.message}`);
	}

	if (!data) return null;

	// Map DB columns to domain model
	return {
		requestId: data.request_id,
		jobId: data.job_id,
		score: Number(data.score),
		feedback: data.feedback,
		what_changed: data.what_changed,
		practice_rule: data.practice_rule,
		durationMs: data.duration_ms,
		tokensUsed: data.tokens_used ?? undefined,
		createdAt: data.created_at,
	};
}

export async function getByJobId(
	jobId: string,
): Promise<EvaluationResult | null> {
	const supabase = getSupabaseServiceRoleClient();
	if (!supabase) {
		throw new Error("Supabase service role client not initialized");
	}

	const { data, error } = await supabase
		.from(TABLE_NAME)
		.select("*")
		.eq("job_id", jobId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// Not found
			return null;
		}
		throw new Error(`Failed to fetch evaluation result: ${error.message}`);
	}

	if (!data) return null;

	// Map DB columns to domain model
	return {
		requestId: data.request_id,
		jobId: data.job_id,
		score: Number(data.score),
		feedback: data.feedback,
		what_changed: data.what_changed,
		practice_rule: data.practice_rule,
		durationMs: data.duration_ms,
		tokensUsed: data.tokens_used ?? undefined,
		createdAt: data.created_at,
	};
}

export async function upsertResult(result: EvaluationResult): Promise<void> {
	const supabase = getSupabaseServiceRoleClient();
	if (!supabase) {
		throw new Error("Supabase service role client not initialized");
	}

	// Map domain model to DB columns
	const dbRecord = {
		request_id: result.requestId,
		job_id: result.jobId,
		score: result.score,
		feedback: result.feedback,
		what_changed: result.what_changed,
		practice_rule: result.practice_rule,
		duration_ms: result.durationMs,
		tokens_used: result.tokensUsed ?? null,
		// created_at is handled by default now() on insert, but we can preserve it if provided
		...(result.createdAt ? { created_at: result.createdAt } : {}),
	};

	const { error } = await supabase
		.from(TABLE_NAME)
		.upsert(dbRecord, { onConflict: "request_id" });

	if (error) {
		throw new Error(`Failed to upsert evaluation result: ${error.message}`);
	}
}
