/**
 * TechnicalDebtScorer service
 */

export interface DebtFactors {
	duplicationSeverity: number; // 0-3
	inconsistencyCount: number; // count
	fileComplexity: number; // 0-10
}

export class TechnicalDebtScorer {
	score(factors: DebtFactors): number {
		const duplication = factors.duplicationSeverity * 3;
		const inconsistency = Math.min(10, factors.inconsistencyCount) * 1.5;
		const complexity = Math.min(10, factors.fileComplexity) * 1.2;
		return duplication + inconsistency + complexity; // higher = more debt
	}
}
