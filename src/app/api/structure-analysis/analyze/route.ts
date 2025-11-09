import { NextResponse } from "next/server";
import { ProjectStructureAnalyzer } from "@/domain/structure-analysis/services/ProjectStructureAnalyzer";

export async function POST(request: Request) {
	try {
		const body = (await request.json().catch(() => ({}))) as any;
		const directories: string[] = body?.directories ?? ["src/", "app/"];
		const options = {
			directories,
			targetDirectories: directories,
			includePatterns: body?.options?.includePatterns,
			excludePatterns: body?.options?.excludePatterns,
			includeUnusedFiles: body?.options?.includeUnusedFiles ?? true,
			includeDependencies: body?.options?.includeDependencies ?? true,
			includePatternsFlag: body?.options?.includePatterns ?? true,
			severityThreshold: body?.options?.severityThreshold ?? "medium",
			maxConcurrency: body?.options?.maxConcurrency ?? 4,
			timeout: body?.options?.timeout ?? 30000,
		} as any;

		const analyzer = new ProjectStructureAnalyzer();
		const result = await analyzer.analyze(options);

		return NextResponse.json({
			success: true,
			data: {
				analysisId: result.id,
				status: result.status,
				summary: {
					totalFiles: result.structure.totalFiles,
					totalDirectories: result.structure.totalDirectories,
					duplicationsFound: result.structure.duplications.length,
					inconsistenciesFound: result.structure.inconsistencies.length,
					recommendationsGenerated: result.structure.recommendations.length,
				},
			},
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Analysis failed";
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "ANALYSIS_FAILED",
					message,
				},
			},
			{ status: 500 },
		);
	}
}
