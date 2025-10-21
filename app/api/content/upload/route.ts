import { type NextRequest, NextResponse } from "next/server";
import { timeOperation } from "@/lib/monitoring/performance";
import { contentPackValidationService } from "@/lib/services/content-pack-validation";

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
				let contentPack: any;

				try {
					contentPack = JSON.parse(content);
				} catch {
					throw new Error("Invalid JSON file");
				}

				// Validate content pack
				const validation =
					await contentPackValidationService.validateForHotSwap(contentPack);

				if (!validation.valid) {
					throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
				}

				return {
					metadata: validation.metadata,
					name: contentPack.name || "Unnamed",
					performance: {
						duration: validation.performance.duration,
						target: validation.performance.target,
						targetMet: validation.performance.targetMet,
					},
					timestamp: new Date().toISOString(),
					valid: validation.valid,
					version: contentPack.version || "1.0.0",
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
