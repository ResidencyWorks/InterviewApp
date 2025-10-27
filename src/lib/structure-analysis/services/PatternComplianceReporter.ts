import type { StructuralInconsistency } from "../entities/StructuralInconsistency";

export interface PatternComplianceReport {
	generatedAt: string;
	countsByType: Record<string, number>;
	issues: Array<{
		type: string;
		description: string;
		locations: string[];
	}>;
}

export class PatternComplianceReporter {
	generate(
		inconsistencies: StructuralInconsistency[],
	): PatternComplianceReport {
		const counts: Record<string, number> = {};
		for (const inc of inconsistencies) {
			counts[inc.type] = (counts[inc.type] ?? 0) + 1;
		}
		return {
			generatedAt: new Date().toISOString(),
			countsByType: counts,
			issues: inconsistencies.map((i) => ({
				type: i.type,
				description: i.description,
				locations: i.locations,
			})),
		};
	}
}
