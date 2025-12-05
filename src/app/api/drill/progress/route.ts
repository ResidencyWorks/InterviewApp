/**
 * API endpoint for managing drill progress
 * GET - Fetch user's drill progress
 * POST - Update drill progress
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";

export async function GET(request: NextRequest) {
	try {
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

		// Get drill_id from query params
		const searchParams = request.nextUrl.searchParams;
		const drillId = searchParams.get("drill_id");

		if (!drillId) {
			return NextResponse.json(
				{ error: "drill_id is required" },
				{ status: 400 },
			);
		}

		// Fetch progress for this drill
		const { data: progress, error } = await (supabase as any)
			.from("drill_progress")
			.select("*")
			.eq("user_id", user.id)
			.eq("drill_id", drillId)
			.single();

		if (error && error.code !== "PGRST116") {
			// PGRST116 = no rows returned
			console.error("Error fetching drill progress:", error);
			return NextResponse.json(
				{ error: "Failed to fetch progress" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ progress: progress || null });
	} catch (error) {
		console.error("Drill progress API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
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

		const body = await request.json();
		const {
			drill_id,
			current_question_id,
			total_questions,
			completed_questions,
			completed,
		} = body;

		if (!drill_id || !current_question_id || total_questions === undefined) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Upsert progress
		const progressData = {
			user_id: user.id,
			drill_id,
			current_question_id,
			total_questions,
			completed_questions: completed_questions || 0,
			last_activity_at: new Date().toISOString(),
			completed_at: completed ? new Date().toISOString() : null,
		};

		const { data: progress, error } = await (supabase as any)
			.from("drill_progress")
			.upsert(progressData, {
				onConflict: "user_id,drill_id",
			})
			.select()
			.single();

		if (error) {
			console.error("Error updating drill progress:", error);
			return NextResponse.json(
				{ error: "Failed to update progress" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ progress });
	} catch (error) {
		console.error("Drill progress API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
