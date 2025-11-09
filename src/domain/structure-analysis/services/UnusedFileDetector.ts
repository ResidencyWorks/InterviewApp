/**
 * UnusedFileDetector service
 */

import type { File } from "../entities/File";
import { DependencyAnalyzer } from "./DependencyAnalyzer";

export class UnusedFileDetector {
	private dependencyAnalyzer = new DependencyAnalyzer();

	async findUnusedFiles(files: File[]): Promise<string[]> {
		const res = await this.dependencyAnalyzer.analyzeDependencies(files, {
			detectUnusedDependencies: true,
		});
		return res.unusedFiles.filter((p) => this.isSourceOrLibFile(p));
	}

	private isSourceOrLibFile(path: string): boolean {
		return /\.(ts|tsx|js|jsx)$/.test(path) && !/\.test\.|\.spec\./.test(path);
	}
}
