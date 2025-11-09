import { type NextRequest, NextResponse } from "next/server";
import { contentPackValidationService } from "@/features/booking/application/services/content-pack-validation";
import { timeOperation } from "@/features/scheduling/infrastructure/monitoring/performance";
import type { ContentPackData } from "@/types/content";

/**
 * Content pack upload API route handler
 * Handles content pack validation and hot-swapping with performance monitoring
 * Target: ≤1s for content pack validation
 * @param request - Next.js request object containing form data with JSON file
 * @returns Promise resolving to NextResponse with validation results or error
 */
export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Validate file type
		if (file.type !== "application/json") {
			return NextResponse.json(
				{ error: "File must be a JSON file" },
				{ status: 400 },
			);
		}

		// Time the entire upload and validation process
		const { result: validationResult } = await timeOperation(
			"content.upload",
			async () => {
				// Read and parse content pack
				const content = await file.text();
				let contentPack: unknown;

				try {
					contentPack = JSON.parse(content) as unknown;
				} catch {
					throw new Error("Invalid JSON file");
				}

				// Validate content pack
				const validation =
					await contentPackValidationService.validateForHotSwap(
						contentPack as ContentPackData,
					);

				if (!validation.valid) {
					throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
				}

				const packMeta = contentPack as { name?: string; version?: string };
				return {
					metadata: validation.metadata,
					name: packMeta.name || "Unnamed",
					performance: {
						duration: validation.performance.duration,
						target: validation.performance.target,
						targetMet: validation.performance.targetMet,
					},
					timestamp: new Date().toISOString(),
					valid: validation.valid,
					version: packMeta.version || "1.0.0",
					warnings: validation.warnings,
				};
			},
			{
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
			},
		);

		return NextResponse.json(validationResult);
	} catch (error) {
		console.error("Content upload API error:", error);

		// Log performance metrics even for errors
		if (error && typeof error === "object" && "metrics" in error) {
			console.error("Performance metrics for failed upload:", error.metrics);
		}

		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}
