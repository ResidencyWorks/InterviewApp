import type { StructuralInconsistency } from "../entities/StructuralInconsistency.js";
import { PatternComplianceReporter } from "./PatternComplianceReporter.js";

export class ConsistencyReportGenerator {
	private reporter = new PatternComplianceReporter();

	generate(inconsistencies: StructuralInconsistency[]) {
		return this.reporter.generate(inconsistencies);
	}
}
