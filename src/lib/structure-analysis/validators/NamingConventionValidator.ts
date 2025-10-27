import type { File } from "../entities/File.js";
import type { StructuralInconsistency } from "../entities/StructuralInconsistency.js";
import { createStructuralInconsistency } from "../entities/StructuralInconsistency.js";

export class NamingConventionValidator {
	async validate(files: File[]): Promise<StructuralInconsistency[]> {
		const incs: StructuralInconsistency[] = [];
		const badFiles = files.filter(
			(f) => /[A-Z]/.test(f.name) && !f.name.endsWith(".d.ts"),
		);
		if (badFiles.length > 0) {
			incs.push(
				createStructuralInconsistency({
					type: "naming",
					description: "Files should be kebab-case (no uppercase letters)",
					locations: badFiles.map((f) => f.path),
					expectedPattern: "kebab-case",
					actualPattern: "contains uppercase",
					impact: "medium",
					fixEffort: "low",
				}),
			);
		}
		return incs;
	}
}
