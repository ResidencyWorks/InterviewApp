/**
 * Content Pack Validation API Route
 *
 * Handles re-validation of existing content packs.
 * Provides detailed validation results with errors and warnings.
 */

import { type NextRequest, NextResponse } from "next/server";
import type { ContentPack } from "@/features/booking/domain/entities/ContentPack";
import { ContentPackStatus } from "@/features/booking/domain/entities/ContentPack";
import { createContentPackValidator } from "@/features/booking/domain/services/ContentPackValidator";
import { createFilesystemContentPackRepository } from "@/features/booking/infrastructure/filesystem/ContentPackRepository";
import { createSupabaseContentPackRepository } from "@/features/booking/infrastructure/supabase/ContentPackRepository";
import { createClient } from "@/infrastructure/supabase/server";
import type { Tables } from "@/types/database";

/**
 * POST /api/content-packs/[id]/validate
 * Re-validate an existing content pack
 */
export async function POST(
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

		// Find the content pack
		const repository = createSupabaseContentPackRepository(supabase);
		let contentPack: ContentPack | null = null;

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

		// Update status to validating
		try {
			await repository.update(contentPackId, {
				status: ContentPackStatus.VALIDATING,
			});
		} catch (_error) {
			// Fallback to filesystem repository
			const fsRepository = createFilesystemContentPackRepository();
			await fsRepository.update(contentPackId, {
				status: ContentPackStatus.VALIDATING,
			});
		}

		// Perform validation
		// The validator expects the full content pack structure (name, version, content, metadata)
		// not just the content field
		const validator = createContentPackValidator();
		const validationData = {
			version: contentPack.version,
			name: contentPack.name,
			description: contentPack.description,
			content: contentPack.content,
			metadata: contentPack.metadata,
		};
		const validationResult = await validator.validate(
			validationData,
			contentPack.schemaVersion,
		);

		// Update content pack status based on validation result
		const newStatus = validationResult.isValid
			? ContentPackStatus.VALID
			: ContentPackStatus.INVALID;

		try {
			await repository.update(contentPackId, { status: newStatus });
		} catch (_error) {
			// Fallback to filesystem repository
			const fsRepository = createFilesystemContentPackRepository();
			await fsRepository.update(contentPackId, { status: newStatus });
		}

		return NextResponse.json({
			data: validationResult,
		});
	} catch (error) {
		console.error("Error validating content pack:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to validate content pack",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
