/**
 * Content Packs API Route
 *
 * Handles content pack CRUD operations including upload, listing, and retrieval.
 * Implements proper authentication, validation, and error handling.
 */

import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createContentPack } from "@/lib/domain/entities/ContentPack";
import { createContentPackValidator } from "@/lib/domain/services/ContentPackValidator";
import { createFilesystemContentPackRepository } from "@/lib/infrastructure/filesystem/ContentPackRepository";
import { createSupabaseContentPackRepository } from "@/lib/infrastructure/supabase/ContentPackRepository";
import { createClient } from "@/lib/supabase/server";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * GET /api/content-packs
 * List content packs with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
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

		// Authorize by admin role or PRO entitlement
		const { data: userData } = await supabase
			.from("users")
			.select("entitlement_level")
			.eq("id", user.id)
			.single();

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

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const limit = parseInt(searchParams.get("limit") || "20", 10);
		const offset = parseInt(searchParams.get("offset") || "0", 10);
		const sortBy = searchParams.get("sortBy") || "createdAt";
		const sortOrder = searchParams.get("sortOrder") || "desc";

		// Validate pagination parameters
		if (limit < 1 || limit > 100) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "Limit must be between 1 and 100",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		if (offset < 0) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "Offset must be 0 or greater",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		const repository = createSupabaseContentPackRepository(supabase);

		try {
			console.log("ContentPacks API: Querying with options:", {
				status: status || undefined,
				limit,
				offset,
				sortBy: sortBy as "createdAt" | "updatedAt" | "name" | "version",
				sortOrder: sortOrder as "asc" | "desc",
			});

			const [contentPacks, totalCount] = await Promise.all([
				repository.findAll({
					status: status || undefined,
					limit,
					offset,
					sortBy: sortBy as "createdAt" | "updatedAt" | "name" | "version",
					sortOrder: sortOrder as "asc" | "desc",
				}),
				repository.count({ status: status || undefined }),
			]);

			console.log("ContentPacks API: Query results:", {
				contentPacksCount: contentPacks.length,
				totalCount,
				contentPacks: contentPacks.map((p) => ({
					id: p.id,
					name: p.name,
					status: p.status,
				})),
			});

			return NextResponse.json({
				data: contentPacks,
				pagination: {
					limit,
					offset,
					total: totalCount,
					hasMore: offset + limit < totalCount,
				},
			});
		} catch (_error) {
			// Fallback to filesystem repository
			const fsRepository = createFilesystemContentPackRepository();
			const contentPacks = await fsRepository.findAll({
				status: status || undefined,
				limit,
				offset,
				sortBy: sortBy as "createdAt" | "updatedAt" | "name" | "version",
				sortOrder: sortOrder as "asc" | "desc",
			});

			return NextResponse.json({
				data: contentPacks,
				pagination: {
					limit,
					offset,
					total: contentPacks.length,
					hasMore: false,
				},
			});
		}
	} catch (error) {
		console.error("Error listing content packs:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to list content packs",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/content-packs
 * Upload a new content pack file
 */
export async function POST(request: NextRequest) {
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

		// Authorize by admin role or PRO entitlement
		const { data: userData } = await supabase
			.from("users")
			.select("entitlement_level")
			.eq("id", user.id)
			.single();

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

		const formData = await request.formData();
		const file = formData.get("file") as File;
		const name = formData.get("name") as string;
		const description = formData.get("description") as string;

		// Validate required fields
		if (!file) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "File is required",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		if (!name || name.trim() === "") {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "Name is required",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{
					error: "FILE_TOO_LARGE",
					message: `File size exceeds maximum of ${MAX_FILE_SIZE} bytes`,
					timestamp: new Date().toISOString(),
				},
				{ status: 413 },
			);
		}

		// Validate file type
		if (file.type !== "application/json") {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "File must be a JSON file",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Read and parse file content
		const fileContent = await file.text();
		let contentData: unknown;

		try {
			contentData = JSON.parse(fileContent);
		} catch (_error) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "Invalid JSON format",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Validate content pack structure
		const validator = createContentPackValidator();
		const validationResult = await validator.validate(contentData);

		if (!validationResult.isValid) {
			return NextResponse.json(
				{
					error: "VALIDATION_FAILED",
					message: "Content pack validation failed",
					details: {
						errors: validationResult.errors,
						warnings: validationResult.warnings,
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Create content pack entity
		const checksum = createHash("sha256").update(fileContent).digest("hex");
		const contentPack = createContentPack({
			version: (contentData as any).version,
			name: name.trim(),
			description: description?.trim() || undefined,
			schemaVersion: "1.0.0", // Default to latest schema version
			content: contentData as any,
			metadata: (contentData as any).metadata,
			uploadedBy: user.id,
			fileSize: file.size,
			checksum,
		});

		// Save to repository
		const repository = createSupabaseContentPackRepository(supabase);

		try {
			const savedContentPack = await repository.save(contentPack);

			return NextResponse.json(
				{
					data: savedContentPack,
					uploadId: crypto.randomUUID(), // For tracking purposes
				},
				{ status: 201 },
			);
		} catch (_error) {
			// Fallback to filesystem repository
			const fsRepository = createFilesystemContentPackRepository();
			const savedContentPack = await fsRepository.save(contentPack);

			return NextResponse.json(
				{
					data: savedContentPack,
					uploadId: crypto.randomUUID(),
				},
				{ status: 201 },
			);
		}
	} catch (error) {
		console.error("Error uploading content pack:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to upload content pack",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
