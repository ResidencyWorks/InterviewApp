import type { IEvaluationResult } from "./evaluation-schema";
import { CATEGORY_IDS } from "./evaluation-schema";

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function computeOverallScore(transcript: string): number {
	// Simple score based on transcript quality indicators
	const wordCount = transcript.trim().split(/\s+/).length;
	const lengthScore = clamp(wordCount / 300, 0, 1); // 0-1 based on word count
	const hasExamples = /example|specifically|for instance/i.test(transcript)
		? 0.15
		: 0;
	const hasMetrics = /\d+%|\d+x|metric|measure/i.test(transcript) ? 0.15 : 0;
	const hasStar = /situation|task|action|result|challenge|approach/i.test(
		transcript,
	)
		? 0.1
		: 0;

	const score =
		clamp(0.4 + lengthScore * 0.3 + hasExamples + hasMetrics + hasStar, 0, 1) *
		100;
	return Math.round(score);
}

function generateCategoryChips(transcript: string) {
	// Generate chips based on content analysis
	const categoryNames: Record<string, string> = {
		communication: "Communication",
		problem_solving: "Problem Solving",
		leadership: "Leadership",
		collaboration: "Collaboration",
		adaptability: "Adaptability",
		ownership: "Ownership",
		curiosity: "Curiosity",
	};

	const indicators: Record<string, { pass: RegExp; flag: RegExp }> = {
		communication: {
			pass: /clearly|articulate|explain|understand/i,
			flag: /uh|um|unclear|confuse/i,
		},
		problem_solving: {
			pass: /solution|resolve|fix|approach|analyze/i,
			flag: /stuck|confused|don't know/i,
		},
		leadership: {
			pass: /led|drove|initiative|team|influence/i,
			flag: /followed orders|told to/i,
		},
		collaboration: {
			pass: /team|we|together|partner|stakeholder/i,
			flag: /alone|solo|independent/i,
		},
		adaptability: {
			pass: /change|flexible|adjust|learn|pivot/i,
			flag: /rigid|stuck|inflexible/i,
		},
		ownership: {
			pass: /owned|responsible|accountable|I led|I drove/i,
			flag: /blame|someone else|not my/i,
		},
		curiosity: {
			pass: /explored|researched|investigated|question|wonder/i,
			flag: /assumed|didn't think/i,
		},
	};

	return CATEGORY_IDS.map((cat) => {
		const ind = indicators[cat];
		const passMatches = (transcript.match(ind.pass) || []).length;
		const flagMatches = (transcript.match(ind.flag) || []).length;

		const passFlag: "PASS" | "FLAG" =
			passMatches > flagMatches ? "PASS" : "FLAG";
		const note =
			passFlag === "PASS"
				? `Strong evidence of ${categoryNames[cat].toLowerCase()}`
				: `Limited demonstration of ${categoryNames[cat].toLowerCase()}`;

		return {
			id: cat,
			name: categoryNames[cat],
			passFlag,
			note,
		};
	});
}

export async function evaluateTranscript(
	transcript: string,
): Promise<IEvaluationResult> {
	const words = transcript.trim().split(/\s+/);
	const wordCount = words.length;
	const durationSeconds = clamp(wordCount / 150, 0.1, 600); // ~150 WPM
	const wpm = Math.round((wordCount / durationSeconds) * 60);

	const overallScore = computeOverallScore(transcript);
	const categoryChips = generateCategoryChips(transcript);

	// Generate what_changed (improvement suggestions)
	const whatChanged: string[] = [];
	if (!/(example|specifically|for instance)/i.test(transcript)) {
		whatChanged.push("Add specific examples to support claims");
	}
	if (!/\d+%|\d+x|metric|measure/i.test(transcript)) {
		whatChanged.push("Include concrete metrics or data");
	}
	if (!/situation|task|action|result/i.test(transcript)) {
		whatChanged.push("Use STAR framework for behavioral questions");
	}

	// Generate practice_rule
	const practiceRule =
		wordCount > 400
			? "Keep answers concise: aim for 2 minutes max (200-300 words)"
			: "Expand your answer with specific examples and metrics";

	return {
		overall_score: overallScore,
		duration_s: Math.round(durationSeconds * 10) / 10,
		words: wordCount,
		wpm: wpm,
		category_chips: categoryChips,
		what_changed: whatChanged.slice(0, 3),
		practice_rule: practiceRule,
	};
}
