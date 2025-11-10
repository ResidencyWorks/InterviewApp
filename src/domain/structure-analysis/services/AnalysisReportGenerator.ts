/**
 * AnalysisReportGenerator service
 */

import type { ProjectStructure } from "../entities/ProjectStructure";

export interface AnalysisReport {
	generatedAt: string;
	totalFiles: number;
	totalDirectories: number;
	duplicationCount: number;
	inconsistencyCount: number;
	recommendationCount: number;
	summary: Record<string, unknown>;
}

export class AnalysisReportGenerator {
	generate(structure: ProjectStructure): AnalysisReport {
		return {
			generatedAt: new Date().toISOString(),
			totalFiles: structure.totalFiles,
			totalDirectories: structure.totalDirectories,
			duplicationCount: structure.duplications.length,
			inconsistencyCount: structure.inconsistencies.length,
			recommendationCount: structure.recommendations.length,
			summary: {
				directories: structure.directories.map((d) => ({
					path: d.path,
					files: d.files.length,
					subdirectories: d.subdirectories.length,
					purpose: d.purpose,
				})),
			},
		};
	}
}
