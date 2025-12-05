/**
 * Content Packs API Route
 *
 * Handles content pack CRUD operations including upload, listing, and retrieval.
 * Implements proper authentication, validation, and error handling.
 */

import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import {
	isExcelMimeType,
	parseExcelContentPack,
} from "@/features/booking/application/content-pack/excel-utils";
import {
	type ContentPackData,
	type ContentPackMetadata,
	createContentPack,
} from "@/features/booking/domain/entities/ContentPack";
import { createContentPackValidator } from "@/features/booking/domain/services/ContentPackValidator";
import { createFilesystemContentPackRepository } from "@/features/booking/infrastructure/filesystem/ContentPackRepository";
import { createSupabaseContentPackRepository } from "@/features/booking/infrastructure/supabase/ContentPackRepository";
import { createClient } from "@/infrastructure/supabase/server";

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

			// Serialize Date objects to ISO strings and ensure all fields are serializable
			// Only include fields needed by the frontend to avoid serialization issues
			const serializedPacks = contentPacks
				.map((pack) => {
					try {
						return {
							id: pack.id,
							version: pack.version,
							name: pack.name,
							description: pack.description,
							status: pack.status,
							createdAt:
								pack.createdAt instanceof Date
									? pack.createdAt.toISOString()
									: typeof pack.createdAt === "string"
										? pack.createdAt
										: new Date().toISOString(),
							updatedAt:
								pack.updatedAt instanceof Date
									? pack.updatedAt.toISOString()
									: typeof pack.updatedAt === "string"
										? pack.updatedAt
										: new Date().toISOString(),
							activatedAt:
								pack.activatedAt instanceof Date
									? pack.activatedAt.toISOString()
									: pack.activatedAt
										? typeof pack.activatedAt === "string"
											? pack.activatedAt
											: (pack.activatedAt as Date).toISOString()
										: undefined,
							activatedBy: pack.activatedBy,
							uploadedBy: pack.uploadedBy,
							fileSize: pack.fileSize,
							checksum: pack.checksum,
						};
					} catch (error) {
						console.error(
							"ContentPacks API: Error serializing pack:",
							pack.id,
							error,
						);
						return null;
					}
				})
				.filter((pack) => pack !== null);

			console.log(
				"ContentPacks API: Serialized packs count:",
				serializedPacks.length,
			);
			if (serializedPacks.length > 0) {
				console.log("ContentPacks API: First serialized pack:", {
					id: serializedPacks[0].id,
					name: serializedPacks[0].name,
					status: serializedPacks[0].status,
					createdAt: serializedPacks[0].createdAt,
					createdAtType: typeof serializedPacks[0].createdAt,
				});
			}

			const responseData = {
				data: serializedPacks,
				pagination: {
					limit,
					offset,
					total: totalCount,
					hasMore: offset + limit < totalCount,
				},
			};

			// Test serialization before returning
			try {
				const testString = JSON.stringify(responseData);
				console.log(
					"ContentPacks API: JSON serialization test passed, length:",
					testString.length,
				);
			} catch (error) {
				console.error(
					"ContentPacks API: JSON serialization test failed:",
					error,
				);
				// Return a simplified response if serialization fails
				return NextResponse.json({
					data: serializedPacks.map((p) => ({
						id: p.id,
						name: p.name,
						version: p.version,
						status: p.status,
						createdAt: p.createdAt,
						updatedAt: p.updatedAt,
						fileSize: p.fileSize,
					})),
					pagination: {
						limit,
						offset,
						total: totalCount,
						hasMore: offset + limit < totalCount,
					},
				});
			}

			console.log(
				"ContentPacks API: Returning response with",
				serializedPacks.length,
				"packs",
			);
			return NextResponse.json(responseData);
		} catch (error) {
			console.error(
				"ContentPacks API: Error in Supabase repository, falling back to filesystem:",
				error,
			);
			// Fallback to filesystem repository
			const fsRepository = createFilesystemContentPackRepository();
			const contentPacks = await fsRepository.findAll({
				status: status || undefined,
				limit,
				offset,
				sortBy: sortBy as "createdAt" | "updatedAt" | "name" | "version",
				sortOrder: sortOrder as "asc" | "desc",
			});

			console.log(
				"ContentPacks API: Filesystem repository returned:",
				contentPacks.length,
				"packs",
			);

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

		const fileName = file.name || "";
		const isJsonUpload =
			file.type === "application/json" ||
			fileName.toLowerCase().endsWith(".json");
		const isExcelUpload = isExcelMimeType(file.type, fileName);

		if (!isJsonUpload && !isExcelUpload) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "File must be a JSON or Excel (.xlsx) file",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		let fileContent = "";
		let contentData: unknown;

		if (isExcelUpload) {
			try {
				const excelBuffer = await file.arrayBuffer();
				contentData = parseExcelContentPack(excelBuffer);
				fileContent = JSON.stringify(contentData);
			} catch (error) {
				return NextResponse.json(
					{
						error: "BAD_REQUEST",
						message:
							error instanceof Error
								? error.message
								: "Invalid Excel template format",
						timestamp: new Date().toISOString(),
					},
					{ status: 400 },
				);
			}
		} else {
			fileContent = await file.text();
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

		// Extract fields from the validated content data
		const parsedData = contentData as {
			version?: unknown;
			content?: unknown;
			metadata?: unknown;
		};

		const parsedVersion = parsedData.version;
		if (
			typeof parsedVersion !== "string" ||
			parsedVersion.trim().length === 0
		) {
			return NextResponse.json(
				{
					error: "VALIDATION_FAILED",
					message: "Content pack version is missing or invalid",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Extract the actual content data (evaluations, categories, etc.)
		const rawContent = parsedData.content;
		if (!rawContent || typeof rawContent !== "object") {
			return NextResponse.json(
				{
					error: "VALIDATION_FAILED",
					message: "Content pack content is missing or invalid",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}
		const parsedContent = rawContent as ContentPackData;

		// Extract metadata
		const rawMetadata = parsedData.metadata;
		const parsedMetadata: ContentPackMetadata =
			rawMetadata && typeof rawMetadata === "object"
				? (rawMetadata as ContentPackMetadata)
				: {};

		// Create content pack entity
		const checksum = createHash("sha256").update(fileContent).digest("hex");
		const contentPack = createContentPack({
			version: parsedVersion,
			name: name.trim(),
			description: description?.trim() || undefined,
			schemaVersion: "1.0.0", // Default to latest schema version
			content: parsedContent, // Now correctly contains { evaluations, categories }
			metadata: parsedMetadata,
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
