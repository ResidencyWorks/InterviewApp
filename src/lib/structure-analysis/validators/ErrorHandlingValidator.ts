import type { File } from "../entities/File";
import type { StructuralInconsistency } from "../entities/StructuralInconsistency";
import { createStructuralInconsistency } from "../entities/StructuralInconsistency";
import { PatternMatcher } from "../services/PatternMatcher";

export class ErrorHandlingValidator {
	private matcher = new PatternMatcher();

	async validate(files: File[]): Promise<StructuralInconsistency[]> {
		const incs: StructuralInconsistency[] = [];
		const source = files.filter((f) =>
			["ts", "tsx", "js", "jsx"].includes(f.extension.toLowerCase()),
		);
		const bad: File[] = [];
		for (const f of source) {
			const hasCatch = await this.matcher.matchPatterns(
				[f],
				["catch\\s*\\((?:.*?)\\)\\s*\\{"],
				{ allowRegex: true },
			);
			const hasHandling = await this.matcher.matchPatterns(
				[f],
				["console\\.error|throw|return\\s+Result|Sentry|posthog"],
				{ allowRegex: true },
			);
			if (hasCatch.length > 0 && hasHandling.length === 0) bad.push(f);
		}
		if (bad.length > 0) {
			incs.push(
				createStructuralInconsistency({
					type: "error-handling",
					description: "Silent catch detected without meaningful handling",
					locations: bad.map((f) => f.path),
					expectedPattern: "Log/throw/Result in catch",
					actualPattern: "Empty or no-op catch",
					impact: "high",
					fixEffort: "low",
				}),
			);
		}
		return incs;
	}
}
