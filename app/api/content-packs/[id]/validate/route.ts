/**
 * Content Pack Validation API Route
 *
 * Handles re-validation of existing content packs.
 * Provides detailed validation results with errors and warnings.
 */

import { type NextRequest, NextResponse } from "next/server";
import type { ContentPack } from "@/lib/domain/entities/ContentPack";
import { ContentPackStatus } from "@/lib/domain/entities/ContentPack";
import { createContentPackValidator } from "@/lib/domain/services/ContentPackValidator";
import { createFilesystemContentPackRepository } from "@/lib/infrastructure/filesystem/ContentPackRepository";
import { createSupabaseContentPackRepository } from "@/lib/infrastructure/supabase/ContentPackRepository";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/**
 * POST /api/content-packs/[id]/validate
 * Re-validate an existing content pack
 */
export async function POST(
	_request: NextRequest,
	{ params }: { params: { id: string } },
) {
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

		// Check if user has admin role (PRO entitlement level)
		const { data: userData } = (await supabase
			.from("users")
			.select("entitlement_level")
			.eq("id", user.id)
			.single()) as {
			data: Pick<Tables<"users">, "entitlement_level"> | null;
			error: Error | null;
		};

		if (userData?.entitlement_level !== "PRO") {
			return NextResponse.json(
				{
					error: "FORBIDDEN",
					message: "Admin access required",
					timestamp: new Date().toISOString(),
				},
				{ status: 403 },
			);
		}

		const contentPackId = params.id;

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
		const validator = createContentPackValidator();
		const validationResult = await validator.validate(
			contentPack.content,
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
