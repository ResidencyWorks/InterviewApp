import { type NextRequest, NextResponse } from "next/server";
import { diagnosticService } from "@/lib/diagnostics/diagnostic-service";
import { logger } from "@/lib/logging/logger";

/**
 * GET /api/diagnostics
 * @returns Diagnostic information for troubleshooting
 */
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const format = url.searchParams.get("format") || "json";
		const includeReport = url.searchParams.get("report") === "true";

		// Get diagnostic information
		const diagnosticInfo = await diagnosticService.getDiagnosticInfo();

		if (format === "report" || includeReport) {
			// Generate diagnostic report
			const report = await diagnosticService.generateDiagnosticReport();

			return new NextResponse(report, {
				status: 200,
				headers: {
					"Content-Type": "text/markdown",
				},
			});
		}

		// Return JSON format
		return NextResponse.json(diagnosticInfo, { status: 200 });
	} catch (error) {
		logger.error("Failed to get diagnostic information", error as Error, {
			component: "DiagnosticAPI",
			action: "GET",
		});

		return NextResponse.json(
			{
				error: "Failed to get diagnostic information",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/diagnostics/error
 * @param request - Request containing error information
 * @returns Success response
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { error, component, severity } = body;

		if (!error || !component) {
			return NextResponse.json(
				{ error: "Missing required fields: error, component" },
				{ status: 400 },
			);
		}

		// Record error for diagnostic purposes
		const errorObj = new Error(error.message || error);
		if (error.stack) {
			errorObj.stack = error.stack;
		}

		diagnosticService.recordError(errorObj, component, severity || "medium");

		logger.info("Error recorded for diagnostics", {
			component: "DiagnosticAPI",
			action: "POST",
			metadata: { component, severity },
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		logger.error("Failed to record error for diagnostics", error as Error, {
			component: "DiagnosticAPI",
			action: "POST",
		});

		return NextResponse.json(
			{
				error: "Failed to record error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
