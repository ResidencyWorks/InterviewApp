/**
 * Content Pack Deactivation API Route
 *
 * @fileoverview API endpoint for deactivating content packs
 */

import { type NextRequest, NextResponse } from "next/server";
import { ContentPackStatus } from "@/features/booking/domain/entities/ContentPack";
import { createSupabaseContentPackRepository } from "@/features/booking/infrastructure/supabase/ContentPackRepository";
import { createClient } from "@/infrastructure/supabase/server";
import type { Tables } from "@/types/database";

/**
 * POST /api/content-packs/[id]/deactivate
 * Deactivate a content pack
 */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: contentPackId } = await params;

		if (!contentPackId) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "Content pack ID is required",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

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

		// Authorize by admin role or PRO entitlement
		const { data: userData } = (await supabase
			.from("users")
			.select("entitlement_level")
			.eq("id", user.id)
			.single()) as {
			data: Pick<Tables<"users">, "entitlement_level"> | null;
			error: Error | null;
		};

		const userMetadata = user.user_metadata as
			| Record<string, unknown>
			| null
			| undefined;
		const role =
			typeof userMetadata?.role === "string"
				? (userMetadata.role as string)
				: "user";
		const isAdminRole = role === "admin" || role === "content_admin";
		const hasProEntitlement = userData?.entitlement_level === "PRO";

		if (!isAdminRole && !hasProEntitlement) {
			return NextResponse.json(
				{
					error: "FORBIDDEN",
					message: "Admin access required",
					timestamp: new Date().toISOString(),
				},
				{ status: 403 },
			);
		}

		// Find the content pack
		const repository = createSupabaseContentPackRepository(supabase);
		const contentPack = await repository.findById(contentPackId);

		if (!contentPack) {
			return NextResponse.json(
				{
					error: "NOT_FOUND",
					message: "Content pack not found",
					timestamp: new Date().toISOString(),
				},
				{ status: 404 },
			);
		}

		// Check if content pack is already deactivated
		if (contentPack.status !== "activated") {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "Content pack is not activated",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Deactivate the content pack by setting status to 'valid'
		const updatedContentPack = await repository.update(contentPackId, {
			status: ContentPackStatus.VALID,
			activatedAt: undefined,
			activatedBy: undefined,
		});

		if (!updatedContentPack) {
			return NextResponse.json(
				{
					error: "INTERNAL_SERVER_ERROR",
					message: "Failed to deactivate content pack",
					timestamp: new Date().toISOString(),
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{
				message: "Content pack deactivated successfully",
				data: {
					id: updatedContentPack.id,
					name: updatedContentPack.name,
					version: updatedContentPack.version,
					status: updatedContentPack.status,
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error deactivating content pack:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to deactivate content pack",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
