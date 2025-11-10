import type { StructuralInconsistency } from "../entities/StructuralInconsistency";
import { PatternComplianceReporter } from "./PatternComplianceReporter";

export class ConsistencyReportGenerator {
	private reporter = new PatternComplianceReporter();

	generate(inconsistencies: StructuralInconsistency[]) {
		return this.reporter.generate(inconsistencies);
	}
}
