import type { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/presentation/api/api-helpers";

export async function GET(_request: NextRequest): Promise<NextResponse> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return createErrorResponse("Authentication required", "UNAUTHORIZED", 401);
	}

	try {
		// Fetch the active content pack
		const { data: activePack, error } = await supabase
			.from("content_packs")
			.select("id, name, version, content, status")
			.eq("status", "activated")
			.single();

		console.log("Active content pack query result:", { activePack, error });

		if (error) {
			if (error.code === "PGRST116") {
				// No active content pack found - let's check what packs exist
				const { data: allPacks } = await supabase
					.from("content_packs")
					.select("id, name, status")
					.order("created_at", { ascending: false })
					.limit(5);

				console.log("No active pack found. Recent packs:", allPacks);

				return createSuccessResponse({
					evaluations: [],
					contentPack: null,
					message: "No active content pack found",
				});
			}
			throw new Error(`Failed to fetch active content pack: ${error.message}`);
		}

		// Extract evaluations from the content pack
		const content = activePack.content as {
			evaluations?: Array<{
				id: string;
				title: string;
				description: string;
				criteria: Array<{
					id: string;
					name: string;
					weight: number;
					description: string;
				}>;
				questions: Array<{
					id: string;
					text: string;
					type: string;
				}>;
			}>;
		};

		const evaluations = content.evaluations || [];

		console.log("Extracted evaluations:", {
			count: evaluations.length,
			evaluations: evaluations.map((e) => ({
				id: e.id,
				title: e.title,
				questionCount: e.questions?.length,
			})),
		});

		return createSuccessResponse({
			evaluations,
			contentPack: {
				id: activePack.id,
				name: activePack.name,
				version: activePack.version,
			},
		});
	} catch (error) {
		console.error("Error fetching active content pack evaluations:", error);
		return createErrorResponse(
			"Failed to fetch evaluations",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
