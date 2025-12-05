import type { Database } from "@/types/database";
import type { EvaluationResult } from "../../domain/evaluation/ai-evaluation-schema";
import { getSupabaseServiceRoleClient } from "../config/clients";

const TABLE_NAME = "evaluation_results";
type EvaluationResultsRow =
	Database["public"]["Tables"]["evaluation_results"]["Row"];

function mapRowToEvaluationResult(
	data: EvaluationResultsRow,
): EvaluationResult {
	return {
		requestId: data.request_id,
		jobId: data.job_id,
		score: data.score,
		feedback: data.feedback,
		what_changed: data.what_changed,
		practice_rule: data.practice_rule,
		durationMs: data.duration_ms,
		tokensUsed: data.tokens_used ?? undefined,
		createdAt: data.created_at ?? undefined,
	};
}

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

	return mapRowToEvaluationResult(data);
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

	return mapRowToEvaluationResult(data);
}

export async function upsertResult(
	result: EvaluationResult,
	userId: string | null = null,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const supabase = getSupabaseServiceRoleClient();
	if (!supabase) {
		throw new Error("Supabase service role client not initialized");
	}

	// Extract question_id and content_pack_id from metadata
	const questionId =
		typeof metadata?.questionId === "string" ? metadata.questionId : "unknown";
	const contentPackId =
		typeof metadata?.contentPackId === "string" ? metadata.contentPackId : null;
	const responseType =
		typeof metadata?.responseType === "string" ? metadata.responseType : null;

	const dbRecord: Database["public"]["Tables"]["evaluation_results"]["Insert"] =
		{
			request_id: result.requestId,
			job_id: result.jobId,
			user_id: userId ?? null,
			question_id: questionId,
			content_pack_id: contentPackId,
			score: result.score,
			feedback: result.feedback,
			what_changed: result.what_changed,
			practice_rule: result.practice_rule,
			duration_ms: result.durationMs,
			tokens_used: result.tokensUsed ?? null,
			response_type: responseType,
			transcription: result.transcription ?? null,
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
