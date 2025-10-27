import type { File } from "../entities/File";
import type { StructuralInconsistency } from "../entities/StructuralInconsistency";
import { createStructuralInconsistency } from "../entities/StructuralInconsistency";

interface InterfaceResult {
	interfaces: string[];
}

export class InterfaceConsistencyChecker {
	async validate(files: File[]): Promise<StructuralInconsistency[]> {
		const incs: StructuralInconsistency[] = [];
		// TODO: Implement interface extraction
		const results: InterfaceResult[] = [];
		const filesWithInterfaces = results.filter(
			(r: InterfaceResult) => r.interfaces.length > 0,
		);
		if (
			filesWithInterfaces.length > 0 &&
			filesWithInterfaces.length < files.length
		) {
			incs.push(
				createStructuralInconsistency({
					type: "interface",
					description: "Inconsistent interface usage across similar files",
					locations: files.map((f) => f.path),
					expectedPattern: "All similar services implement interfaces",
					actualPattern: "Mixed",
					impact: "medium",
					fixEffort: "medium",
				}),
			);
		}
		return incs;
	}
}
