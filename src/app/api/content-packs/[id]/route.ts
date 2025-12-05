/**
 * Content Pack Detail API Route
 *
 * GET /api/content-packs/[id] - Get full content pack details
 * DELETE /api/content-packs/[id] - Delete a content pack
 */

import { type NextRequest, NextResponse } from "next/server";
import type { ContentPack } from "@/features/booking/domain/entities/ContentPack";
import { createFilesystemContentPackRepository } from "@/features/booking/infrastructure/filesystem/ContentPackRepository";
import { createSupabaseContentPackRepository } from "@/features/booking/infrastructure/supabase/ContentPackRepository";
import { createClient } from "@/infrastructure/supabase/server";
import type { Tables } from "@/types/database";

/**
 * GET /api/content-packs/[id]
 * Get full content pack details including content
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: contentPackId } = await params;

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

		// Fetch the content pack with full content
		const repository = createSupabaseContentPackRepository(supabase);
		let contentPack: ContentPack | null;

		try {
			contentPack = await repository.findById(contentPackId);
		} catch (_error) {
			// Fallback to filesystem repository
			const fsRepository = createFilesystemContentPackRepository();
			contentPack = await fsRepository.findById(contentPackId);
		}

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

		// Return full content pack including content field
		return NextResponse.json({
			data: {
				id: contentPack.id,
				version: contentPack.version,
				name: contentPack.name,
				description: contentPack.description,
				schemaVersion: contentPack.schemaVersion,
				status: contentPack.status,
				content: contentPack.content, // Include full content
				metadata: contentPack.metadata,
				createdAt: contentPack.createdAt.toISOString(),
				updatedAt: contentPack.updatedAt.toISOString(),
				activatedAt: contentPack.activatedAt?.toISOString(),
				activatedBy: contentPack.activatedBy,
				uploadedBy: contentPack.uploadedBy,
				fileSize: contentPack.fileSize,
				checksum: contentPack.checksum,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error fetching content pack:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to fetch content pack",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/content-packs/[id]
 * Delete a content pack
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: contentPackId } = await params;

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

		// Check if content pack is activated
		const repository = createSupabaseContentPackRepository(supabase);
		let contentPack: ContentPack | null;

		try {
			contentPack = await repository.findById(contentPackId);
		} catch (_error) {
			// Fallback to filesystem repository
			const fsRepository = createFilesystemContentPackRepository();
			contentPack = await fsRepository.findById(contentPackId);
		}

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

		// Prevent deletion of activated content packs
		if (contentPack.status === "activated") {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message:
						"Cannot delete an activated content pack. Please deactivate it first.",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Delete the content pack
		try {
			await repository.delete(contentPackId);
		} catch (_error) {
			// Fallback to filesystem repository
			const fsRepository = createFilesystemContentPackRepository();
			await fsRepository.delete(contentPackId);
		}

		return NextResponse.json({
			message: "Content pack deleted successfully",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error deleting content pack:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to delete content pack",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
