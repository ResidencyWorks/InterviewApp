import type { File } from "../entities/File.js";
import type { StructuralInconsistency } from "../entities/StructuralInconsistency.js";
import { createStructuralInconsistency } from "../entities/StructuralInconsistency.js";
import { DependencyAnalyzer } from "../services/DependencyAnalyzer.js";

export class DependencyPatternValidator {
	private analyzer = new DependencyAnalyzer();

	async validate(files: File[]): Promise<StructuralInconsistency[]> {
		const res = await this.analyzer.analyzeDependencies(files, {
			detectCircularDependencies: true,
		});
		const incs: StructuralInconsistency[] = [];
		if (res.circularDependencies.length > 0) {
			incs.push(
				createStructuralInconsistency({
					type: "dependency",
					description: "Circular dependencies detected",
					locations: Array.from(new Set(res.circularDependencies.flat())),
					expectedPattern: "Acyclic dependency graph",
					actualPattern: "Cycles present",
					impact: "high",
					fixEffort: "medium",
				}),
			);
		}
		return incs;
	}
}
