import type { File } from "../entities/File";
import type { StructuralInconsistency } from "../entities/StructuralInconsistency";
import { DependencyPatternValidator } from "../validators/DependencyPatternValidator";
import { ErrorHandlingValidator } from "../validators/ErrorHandlingValidator";
import { InterfaceConsistencyChecker } from "../validators/InterfaceConsistencyChecker";
import { NamingConventionValidator } from "../validators/NamingConventionValidator";

export interface ConsistencyValidationSummary {
	inconsistencies: StructuralInconsistency[];
	counts: Record<string, number>;
}

export class ConsistencyValidatorService {
	private naming = new NamingConventionValidator();
	private iface = new InterfaceConsistencyChecker();
	private errors = new ErrorHandlingValidator();
	private deps = new DependencyPatternValidator();

	async validate(files: File[]): Promise<ConsistencyValidationSummary> {
		const [n, i, e, d] = await Promise.all([
			this.naming.validate(files),
			this.iface.validate(files),
			this.errors.validate(files),
			this.deps.validate(files),
		]);
		const inconsistencies = [...n, ...i, ...e, ...d];
		const counts: Record<string, number> = {};
		for (const inc of inconsistencies) {
			counts[inc.type] = (counts[inc.type] ?? 0) + 1;
		}
		return { inconsistencies, counts };
	}
}
