import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthService } from "@/features/auth/application/services/server-auth-service";
import { getServerDatabaseService } from "@/infrastructure/db/database-service";

const SaveEvaluationSchema = z.object({
	id: z.string().uuid().optional(),
	user_id: z.string().uuid().optional(),
	content_pack_id: z.string().uuid().optional().nullable(),
	response_text: z.string().optional(),
	response_audio_url: z.string().url().optional(),
	response_type: z.enum(["text", "audio"]),
	duration_seconds: z.number().int().min(0).optional(),
	word_count: z.number().int().min(0).optional(),
	wpm: z.number().min(0).optional(),
	categories: z.record(z.string(), z.number()),
	feedback: z.string().optional(),
	score: z.number().min(0).max(100).optional(),
	status: z
		.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
		.default("COMPLETED"),
});

export async function POST(request: NextRequest) {
	try {
		const auth = await getServerAuthService();
		const user = await auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "UNAUTHORIZED", message: "Authentication required" },
				{ status: 401 },
			);
		}

		const json = await request.json();
		const parsed = SaveEvaluationSchema.safeParse(json);

		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "VALIDATION_ERROR",
					message: "Invalid evaluation payload",
					details: parsed.error.flatten(),
				},
				{ status: 422 },
			);
		}

		const payload = parsed.data;

		// Normalize status casing to DB enum expectations
		const status = payload.status.toUpperCase() as
			| "PENDING"
			| "PROCESSING"
			| "COMPLETED"
			| "FAILED";

		const db = await getServerDatabaseService();

		const insertPayload = {
			id: payload.id,
			user_id: payload.user_id || user.id,
			content_pack_id: payload.content_pack_id ?? null,
			response_text: payload.response_text,
			response_audio_url: payload.response_audio_url,
			response_type: payload.response_type,
			duration_seconds: payload.duration_seconds ?? null,
			word_count: payload.word_count ?? null,
			wpm: payload.wpm ?? null,
			categories: payload.categories,
			feedback: payload.feedback ?? null,
			score: payload.score ?? null,
			status,
		};

		const result = await db.insert("evaluation_results", insertPayload, {
			returning: "*",
		});

		if (!result.success) {
			return NextResponse.json(
				{
					error: "DB_ERROR",
					message: result.error || "Failed to save evaluation",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{
				success: true,
				data: result.data,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("/api/evaluations POST error", error);
		return NextResponse.json(
			{ error: "INTERNAL_SERVER_ERROR", message: "Unexpected error" },
			{ status: 500 },
		);
	}
}
