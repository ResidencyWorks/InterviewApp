#!/usr/bin/env node
import { access } from "node:fs/promises";
import { ProjectStructureAnalyzer } from "../services/ProjectStructureAnalyzer";
import {
	type AnalysisOptions,
	DEFAULT_ANALYSIS_OPTIONS,
} from "../types/analysis-options";

async function main() {
	const args = process.argv.slice(2);
	const dirs = args.length ? args : ["src/", "app/"];

	// Check which directories exist
	const existingDirs: string[] = [];
	const missingDirs: string[] = [];

	for (const dir of dirs) {
		try {
			await access(dir);
			existingDirs.push(dir);
		} catch {
			missingDirs.push(dir);
		}
	}

	// Warn about missing directories
	if (missingDirs.length > 0) {
		console.warn(
			`Warning: The following directories do not exist:\n  - ${missingDirs.join("\n  - ")}\n`,
		);
	}

	// Exit if no valid directories
	if (existingDirs.length === 0) {
		console.error("Error: No valid directories to analyze.");
		process.exit(1);
	}

	// Run analysis
	const analyzer = new ProjectStructureAnalyzer();
	const analysisOptions: AnalysisOptions = {
		...DEFAULT_ANALYSIS_OPTIONS,
		directories: existingDirs,
		targetDirectories: existingDirs,
	};
	const result = await analyzer.analyze(analysisOptions);

	// Output results
	console.log(
		JSON.stringify(
			{
				analysisId: result.id,
				totalFiles: result.structure.totalFiles,
				totalDirectories: result.structure.totalDirectories,
				duplications: result.structure.duplications.length,
				inconsistencies: result.structure.inconsistencies.length,
			},
			null,
			2,
		),
	);
}

main().catch((err) => {
	console.error("Analysis failed:", err);
	process.exit(1);
});
