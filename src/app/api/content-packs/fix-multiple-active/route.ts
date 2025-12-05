/**
 * One-time fix endpoint to deactivate multiple active content packs
 * This should only be needed once to fix the current state
 */

import { NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";

export async function POST() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{
					error: "UNAUTHORIZED",
					message: "Authentication required",
					timestamp: new Date().toISOString(),
				},
				{ status: 401 },
			);
		}

		// Only allow admin users
		const userMetadata = user.user_metadata as
			| Record<string, unknown>
			| null
			| undefined;
		const role =
			typeof userMetadata?.role === "string"
				? (userMetadata.role as string)
				: "user";

		if (role !== "admin") {
			return NextResponse.json(
				{
					error: "FORBIDDEN",
					message: "Admin access required",
					timestamp: new Date().toISOString(),
				},
				{ status: 403 },
			);
		}

		// Get all activated content packs
		const { data: activatedPacks, error: fetchError } = await supabase
			.from("content_packs")
			.select("id, name, version")
			.eq("status", "activated");

		if (fetchError) {
			throw new Error(`Failed to fetch activated packs: ${fetchError.message}`);
		}

		const count = activatedPacks?.length || 0;

		if (count === 0) {
			return NextResponse.json({
				message: "No activated content packs found",
				count: 0,
				timestamp: new Date().toISOString(),
			});
		}

		if (count === 1) {
			return NextResponse.json({
				message: "Only one content pack is activated (correct state)",
				count: 1,
				activePack: activatedPacks[0],
				timestamp: new Date().toISOString(),
			});
		}

		// Multiple packs are activated - deactivate all but the most recently activated
		const { data: sortedPacks, error: sortError } = await supabase
			.from("content_packs")
			.select("id, name, version, activated_at")
			.eq("status", "activated")
			.order("activated_at", { ascending: false });

		if (sortError) {
			throw new Error(`Failed to sort packs: ${sortError.message}`);
		}

		if (!sortedPacks || sortedPacks.length === 0) {
			return NextResponse.json({
				message: "No packs to process",
				count: 0,
				timestamp: new Date().toISOString(),
			});
		}

		// Keep the most recently activated, deactivate the rest
		const keepPack = sortedPacks[0];
		const deactivatePacks = sortedPacks.slice(1);

		// Deactivate all except the most recent
		const { error: updateError } = await supabase
			.from("content_packs")
			.update({
				status: "valid",
				activated_at: null,
				activated_by: null,
				updated_at: new Date().toISOString(),
			})
			.in(
				"id",
				deactivatePacks.map((p) => p.id),
			);

		if (updateError) {
			throw new Error(`Failed to deactivate packs: ${updateError.message}`);
		}

		return NextResponse.json({
			message: "Successfully fixed multiple active content packs",
			totalFound: count,
			kept: {
				id: keepPack.id,
				name: keepPack.name,
				version: keepPack.version,
			},
			deactivated: deactivatePacks.map((p) => ({
				id: p.id,
				name: p.name,
				version: p.version,
			})),
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error fixing multiple active packs:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to fix multiple active packs",
				details: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
