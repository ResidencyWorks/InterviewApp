import type {
	ICategoryScore,
	IEvaluationMetrics,
	IEvaluationResult,
	IEvaluationSummary,
} from "./evaluation-schema";

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function computeMetrics(transcript: string): IEvaluationMetrics {
	const lengthScore = clamp(transcript.trim().split(/\s+/).length / 200, 0, 1);
	const hasNumbers = /\d/.test(transcript) ? 0.2 : 0;
	const hasBullets = /[-•*]/.test(transcript) ? 0.1 : 0;
	return {
		clarity: clamp(0.5 + hasBullets - (lengthScore > 0.9 ? 0.1 : 0), 0, 1),
		impact: clamp(0.4 + hasNumbers, 0, 1),
		specificity: clamp(
			0.3 + hasNumbers + (transcript.includes("for example") ? 0.2 : 0),
			0,
			1,
		),
		structure: clamp(0.4 + hasBullets, 0, 1),
		empathy: clamp(
			transcript.match(/(we|team|support|help)/i) ? 0.7 : 0.4,
			0,
			1,
		),
		agency: clamp(transcript.match(/(I|owned|led|drove)/) ? 0.7 : 0.4, 0, 1),
		reflection: clamp(
			transcript.match(/(learned|next time|in hindsight|improve)/i) ? 0.7 : 0.4,
			0,
			1,
		),
	};
}

function scoreFromMetric(m: number): number {
	// Map 0..1 to 0..5
	return clamp(Math.round(m * 5 * 10) / 10, 0, 5);
}

function computeCategories(metrics: IEvaluationMetrics): ICategoryScore[] {
	const categories = [
		{
			category: "communication",
			score: scoreFromMetric((metrics.clarity + metrics.structure) / 2),
		},
		{
			category: "problem_solving",
			score: scoreFromMetric((metrics.specificity + metrics.impact) / 2),
		},
		{
			category: "leadership",
			score: scoreFromMetric((metrics.agency + metrics.impact) / 2),
		},
		{
			category: "collaboration",
			score: scoreFromMetric((metrics.empathy + metrics.clarity) / 2),
		},
		{
			category: "adaptability",
			score: scoreFromMetric((metrics.reflection + metrics.clarity) / 2),
		},
		{
			category: "ownership",
			score: scoreFromMetric((metrics.agency + metrics.structure) / 2),
		},
		{
			category: "curiosity",
			score: scoreFromMetric((metrics.specificity + metrics.reflection) / 2),
		},
	] as ICategoryScore[];
	return categories;
}

function computeSummary(transcript: string): IEvaluationSummary {
	const bullets = [
		"Be more specific with concrete outcomes and metrics.",
		"Improve structure using brief bullets or clear sections.",
		"Reflect on lessons learned and what you'd do differently.",
	];
	const practiceRule =
		transcript.length > 600
			? "Keep answers under 2 minutes; prioritize the key outcome first."
			: "Lead with situation → action → outcome in 3 sentences.";
	return { bullets, practiceRule };
}

export async function evaluateTranscript(
	transcript: string,
): Promise<IEvaluationResult> {
	const metrics = computeMetrics(transcript);
	const categories = computeCategories(metrics);
	const avg = categories.reduce((s, c) => s + c.score, 0) / categories.length;
	const summary = computeSummary(transcript);
	return {
		totalScore: Math.round(avg * 10) / 10,
		metrics,
		categories,
		summary,
	};
}

import { analytics } from "@/lib/analytics";
import { contentPackService } from "@/lib/content";
import { errorMonitoring } from "@/lib/error-monitoring";
import { openaiEvaluation } from "@/lib/openai";
import type {
	EvaluationCategories,
	EvaluationRequest,
	EvaluationResponse,
} from "@/types/evaluation";
import type { EvaluationConfig, EvaluationEngine } from "./evaluation-types";

/**
 * OpenAI-based evaluation engine
 */
export class OpenAIEvaluationEngine implements EvaluationEngine {
	private config: EvaluationConfig;

	constructor(config: Partial<EvaluationConfig> = {}) {
		this.config = {
			cacheResults: true,
			cacheTTL: 3600000, // 1 hour
			maxAudioDuration: 300, // 5 minutes
			maxResponseLength: 10000,
			minResponseLength: 10,
			retryAttempts: 3,
			timeoutMs: 30000, // 30 seconds
			...config,
		};
	}

	/**
	 * Validate evaluation request
	 * @param request - Evaluation request to validate
	 * @returns Validation result
	 */
	validate(request: EvaluationRequest): { valid: boolean; error?: string } {
		// Check response length
		if (request.response.length > this.config.maxResponseLength) {
			return {
				error: `Response too long. Maximum ${this.config.maxResponseLength} characters allowed.`,
				valid: false,
			};
		}

		if (request.response.length < this.config.minResponseLength) {
			return {
				error: `Response too short. Minimum ${this.config.minResponseLength} characters required.`,
				valid: false,
			};
		}

		// Check audio duration if audio type
		if (request.type === "audio" && request.audio_url) {
			// This would need to be implemented with audio analysis
			// For now, we'll skip this validation
		}

		return { valid: true };
	}

	/**
	 * Evaluate a response
	 * @param request - Evaluation request
	 * @returns Promise resolving to evaluation response
	 */
	async evaluate(request: EvaluationRequest): Promise<EvaluationResponse> {
		const startTime = Date.now();
		const userId =
			typeof request.metadata?.user_id === "string"
				? (request.metadata.user_id as string)
				: "system";

		try {
			// Validate request
			const validation = this.validate(request);
			if (!validation.valid) {
				throw new Error(validation.error);
			}

			// Get content pack if specified
			let contentPack = null;
			if (request.content_pack_id) {
				contentPack = await contentPackService.get(request.content_pack_id);
			}

			// Get evaluation criteria
			const evaluationCriteria =
				contentPack?.content.evaluation_criteria || this.getDefaultCriteria();

			let evaluation: EvaluationResponse;

			if (request.type === "audio") {
				// Evaluate audio response
				evaluation = await openaiEvaluation.evaluateAudioResponse(
					request.audio_url || "",
					evaluationCriteria,
					contentPack?.content,
				);
			} else {
				// Evaluate text response
				evaluation = await openaiEvaluation.evaluateTextResponse(
					request.response,
					evaluationCriteria,
					contentPack?.content,
				);
			}

			// Track analytics
			analytics.trackEvaluationCompleted(
				userId,
				{
					categories: evaluation.categories as unknown as Record<
						string,
						number
					>,
					duration: evaluation.duration,
					score: evaluation.score,
					word_count: evaluation.word_count,
				},
				request.content_pack_id,
			);

			return evaluation;
		} catch (error) {
			const duration = Date.now() - startTime;

			// Track error analytics
			analytics.trackEvaluationFailed(
				userId,
				error instanceof Error ? error.message : "Unknown error",
				request.content_pack_id,
			);

			// Report error
			errorMonitoring.reportError({
				context: {
					action: "evaluate",
					component: "evaluation_engine",
					metadata: {
						contentPackId: request.content_pack_id,
						duration,
						requestType: request.type,
						responseLength: request.response.length,
					},
				},
				error: error instanceof Error ? error : new Error("Unknown error"),
				message: "Evaluation failed",
			});

			throw error;
		}
	}

	/**
	 * Get default evaluation criteria
	 * @returns Default evaluation criteria
	 */
	private getDefaultCriteria() {
		return {
			clarity: {
				description: "How clear and understandable is the response?",
				factors: [
					"Clear articulation",
					"Logical flow",
					"Appropriate vocabulary",
					"Conciseness",
				],
				weight: 0.25,
			},
			content: {
				description: "How relevant and substantive is the content?",
				factors: [
					"Relevance to question",
					"Depth of analysis",
					"Use of examples",
					"Originality of thought",
				],
				weight: 0.25,
			},
			delivery: {
				description: "How confident and engaging is the delivery?",
				factors: [
					"Confidence level",
					"Engagement with audience",
					"Appropriate tone",
					"Professional presentation",
				],
				weight: 0.25,
			},
			structure: {
				description: "How well-organized and logical is the response?",
				factors: [
					"Clear introduction",
					"Logical progression",
					"Effective conclusion",
					"Coherent paragraphs",
				],
				weight: 0.25,
			},
		};
	}
}

/**
 * Mock evaluation engine for testing
 */
export class MockEvaluationEngine implements EvaluationEngine {
	private config: EvaluationConfig;

	constructor(config: Partial<EvaluationConfig> = {}) {
		this.config = {
			cacheResults: false,
			cacheTTL: 0,
			maxAudioDuration: 300,
			maxResponseLength: 10000,
			minResponseLength: 10,
			retryAttempts: 1,
			timeoutMs: 5000,
			...config,
		};
	}

	validate(request: EvaluationRequest): { valid: boolean; error?: string } {
		if (request.response.length < this.config.minResponseLength) {
			return {
				error: `Response too short. Minimum ${this.config.minResponseLength} characters required.`,
				valid: false,
			};
		}

		if (request.response.length > this.config.maxResponseLength) {
			return {
				error: `Response too long. Maximum ${this.config.maxResponseLength} characters allowed.`,
				valid: false,
			};
		}

		return { valid: true };
	}

	async evaluate(request: EvaluationRequest): Promise<EvaluationResponse> {
		// Simulate processing time
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const wordCount = request.response.split(/\s+/).length;
		const duration = 1.0; // Mock duration

		// Generate mock scores
		const categories: EvaluationCategories = {
			clarity: Math.floor(Math.random() * 40) + 60, // 60-100
			content: Math.floor(Math.random() * 40) + 60,
			delivery: Math.floor(Math.random() * 40) + 60,
			structure: Math.floor(Math.random() * 40) + 60,
		};

		const score = Math.floor(
			(categories.clarity +
				categories.structure +
				categories.content +
				categories.delivery) /
				4,
		);

		return {
			categories,
			duration,
			feedback: `Mock evaluation completed. Your response scored ${score}/100 overall.`,
			score,
			timestamp: new Date().toISOString(),
			word_count: wordCount,
			wpm: wordCount / (duration / 60),
		};
	}
}

// Export singleton instances
export const openaiEngine = new OpenAIEvaluationEngine();
export const mockEngine = new MockEvaluationEngine();
