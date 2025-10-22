import type { IEvaluationSummary } from "./evaluation-schema";

export function generateRefactorSummary(
	transcript: string,
): IEvaluationSummary {
	const bullets = [
		"Use measurable outcomes (e.g., % improvement, time saved).",
		"Trim filler; favor concise, active phrasing.",
		"Connect actions directly to impact.",
	];
	const practiceRule = transcript.toLowerCase().includes("i")
		? "Balance 'I' and 'We' to show ownership and collaboration."
		: "Show ownership by stating what you specifically did.";
	return { bullets, practiceRule };
}
