import OpenAI from "openai";
import type { EvaluationCategories, EvaluationResponse } from "@/types";

/**
 * OpenAI API configuration and utilities
 * Handles AI-powered evaluation of interview responses
 */

// Initialize OpenAI client
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Evaluation service using OpenAI
 * Provides AI-powered evaluation of interview responses using GPT-4 and Whisper
 */
export class OpenAIEvaluationService {
	private client: OpenAI;

	constructor() {
		this.client = openai;
	}

	/**
	 * Evaluate a text response using GPT-4
	 * @param response - Text response to evaluate
	 * @param evaluationCriteria - Criteria for evaluation
	 * @param contentPack - Optional content pack context
	 * @returns Promise resolving to evaluation response
	 */
	async evaluateTextResponse(
		response: string,
		evaluationCriteria: any,
		contentPack?: any,
	): Promise<EvaluationResponse> {
		try {
			const startTime = Date.now();

			// Calculate basic metrics
			const wordCount = response.split(/\s+/).length;
			const duration = (Date.now() - startTime) / 1000;
			const wpm = wordCount / (duration / 60);

			// Create evaluation prompt
			const prompt = this.createEvaluationPrompt(
				response,
				evaluationCriteria,
				contentPack,
			);

			// Call OpenAI API
			const completion = await this.client.chat.completions.create({
				max_tokens: 1000,
				messages: [
					{
						content:
							"You are an expert interview coach and evaluator. Analyze the provided response and give detailed feedback on clarity, structure, content, and delivery. Provide scores from 0-100 for each category and overall feedback.",
						role: "system",
					},
					{
						content: prompt,
						role: "user",
					},
				],
				model: "gpt-4",
				temperature: 0.7,
			});

			const evaluationText = completion.choices[0]?.message?.content || "";

			// Parse the evaluation response
			const evaluation = this.parseEvaluationResponse(evaluationText);

			return {
				categories: evaluation.categories,
				duration,
				feedback: evaluation.feedback,
				score: evaluation.score,
				timestamp: new Date().toISOString(),
				word_count: wordCount,
				wpm: Math.round(wpm * 100) / 100,
			};
		} catch (error) {
			console.error("OpenAI evaluation error:", error);
			throw new Error("Failed to evaluate response");
		}
	}

	/**
	 * Transcribe audio using Whisper
	 * @param audioUrl - URL of the audio file to transcribe
	 * @returns Promise resolving to transcribed text
	 */
	async transcribeAudio(audioUrl: string): Promise<string> {
		try {
			// Download audio file
			const response = await fetch(audioUrl);
			const audioBuffer = await response.arrayBuffer();
			const audioFile = new File([audioBuffer], "audio.wav", {
				type: "audio/wav",
			});

			// Transcribe using Whisper
			const transcription = await this.client.audio.transcriptions.create({
				file: audioFile,
				model: "whisper-1",
				response_format: "text",
			});

			return transcription;
		} catch (error) {
			console.error("Whisper transcription error:", error);
			throw new Error("Failed to transcribe audio");
		}
	}

	/**
	 * Evaluate an audio response
	 * @param audioUrl - URL of the audio file to evaluate
	 * @param evaluationCriteria - Criteria for evaluation
	 * @param contentPack - Optional content pack context
	 * @returns Promise resolving to evaluation response
	 */
	async evaluateAudioResponse(
		audioUrl: string,
		evaluationCriteria: any,
		contentPack?: any,
	): Promise<EvaluationResponse> {
		try {
			const startTime = Date.now();

			// Transcribe audio first
			const transcription = await this.transcribeAudio(audioUrl);

			// Evaluate the transcription
			const evaluation = await this.evaluateTextResponse(
				transcription,
				evaluationCriteria,
				contentPack,
			);

			// Add audio-specific metrics
			const duration = (Date.now() - startTime) / 1000;

			return {
				...evaluation,
				duration,
				wpm: evaluation.word_count / (duration / 60),
			};
		} catch (error) {
			console.error("Audio evaluation error:", error);
			throw new Error("Failed to evaluate audio response");
		}
	}

	/**
	 * Create evaluation prompt for GPT-4
	 * @param response - Response text to include in prompt
	 * @param evaluationCriteria - Evaluation criteria to include
	 * @param contentPack - Optional content pack context
	 * @returns Formatted prompt string
	 */
	private createEvaluationPrompt(
		response: string,
		evaluationCriteria: any,
		contentPack?: any,
	): string {
		const criteria = evaluationCriteria || {
			clarity: {
				description: "How clear and understandable is the response?",
				weight: 0.25,
			},
			content: {
				description: "How relevant and substantive is the content?",
				weight: 0.25,
			},
			delivery: {
				description: "How confident and engaging is the delivery?",
				weight: 0.25,
			},
			structure: {
				description: "How well-organized and logical is the response?",
				weight: 0.25,
			},
		};

		let prompt =
			"Please evaluate this interview response on the following criteria:\n\n";

		for (const [category, details] of Object.entries(criteria)) {
			const detail = details as {
				weight: number;
				description: string;
				factors?: string[];
			};
			prompt += `${category.toUpperCase()} (Weight: ${detail.weight * 100}%): ${detail.description}\n`;
			if (detail.factors) {
				prompt += `  Factors to consider: ${detail.factors.join(", ")}\n`;
			}
		}

		prompt += `\nResponse to evaluate:\n"${response}"\n\n`;

		if (contentPack) {
			prompt += `Context: This response is for a ${contentPack.name} interview question.\n\n`;
		}

		prompt += "Please provide:\n";
		prompt += "1. A score from 0-100 for each category\n";
		prompt += "2. An overall score from 0-100\n";
		prompt +=
			"3. Detailed feedback explaining the scores and areas for improvement\n\n";
		prompt += "Format your response as JSON:\n";
		prompt += "{\n";
		prompt += '  "categories": {\n';
		prompt += '    "clarity": 85,\n';
		prompt += '    "structure": 78,\n';
		prompt += '    "content": 92,\n';
		prompt += '    "delivery": 80\n';
		prompt += "  },\n";
		prompt += '  "score": 84,\n';
		prompt +=
			'  "feedback": "Your response shows strong content knowledge and clear communication..."\n';
		prompt += "}";

		return prompt;
	}

	/**
	 * Parse evaluation response from GPT-4
	 * @param response - Raw response text from GPT-4
	 * @returns Parsed evaluation data with categories, score, and feedback
	 */
	private parseEvaluationResponse(response: string): {
		categories: EvaluationCategories;
		score: number;
		feedback: string;
	} {
		try {
			// Try to extract JSON from the response
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const jsonStr = jsonMatch[0];
				const parsed = JSON.parse(jsonStr);

				return {
					categories: {
						clarity: parsed.categories?.clarity || 0,
						content: parsed.categories?.content || 0,
						delivery: parsed.categories?.delivery || 0,
						structure: parsed.categories?.structure || 0,
					},
					feedback: parsed.feedback || "No feedback provided",
					score: parsed.score || 0,
				};
			}
		} catch (error) {
			console.error("Failed to parse evaluation response:", error);
		}

		// Fallback parsing
		const categories: EvaluationCategories = {
			clarity: 0,
			content: 0,
			delivery: 0,
			structure: 0,
		};

		// Try to extract scores from text
		const scoreRegex = /(\w+):\s*(\d+)/g;
		let match = scoreRegex.exec(response);
		while (match !== null) {
			const category = match[1].toLowerCase();
			const score = Number.parseInt(match[2]);
			if (category in categories && score >= 0 && score <= 100) {
				categories[category as keyof EvaluationCategories] = score;
			}
			match = scoreRegex.exec(response);
		}

		// Calculate average score
		const scores = Object.values(categories);
		const averageScore =
			scores.length > 0
				? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
				: 0;

		return {
			categories,
			feedback: response || "No feedback provided",
			score: averageScore,
		};
	}
}

// Export singleton instance
export const openaiEvaluation = new OpenAIEvaluationService();

/**
 * OpenAI health check
 * @returns Promise that resolves to true if OpenAI API is accessible
 */
export async function checkOpenAIHealth(): Promise<boolean> {
	try {
		await openai.models.list();
		return true;
	} catch (error) {
		console.error("OpenAI health check failed:", error);
		return false;
	}
}

/**
 * Rate limiting utilities
 * Provides rate limiting functionality for API requests with configurable windows and limits
 */
export class RateLimiter {
	private requests: Map<string, number[]> = new Map();

	/**
	 * Check if request is within rate limit
	 * @param userId - User ID to check rate limit for
	 * @param maxRequests - Maximum number of requests allowed
	 * @param windowMs - Time window in milliseconds
	 * @returns True if request is allowed, false otherwise
	 */
	isAllowed(userId: string, maxRequests: number, windowMs: number): boolean {
		const now = Date.now();
		const userRequests = this.requests.get(userId) || [];

		// Remove old requests outside the window
		const validRequests = userRequests.filter((time) => now - time < windowMs);

		if (validRequests.length >= maxRequests) {
			return false;
		}

		// Add current request
		validRequests.push(now);
		this.requests.set(userId, validRequests);

		return true;
	}

	/**
	 * Get remaining requests for user
	 * @param userId - User ID to check
	 * @param maxRequests - Maximum number of requests allowed
	 * @param windowMs - Time window in milliseconds
	 * @returns Number of remaining requests
	 */
	getRemainingRequests(
		userId: string,
		maxRequests: number,
		windowMs: number,
	): number {
		const now = Date.now();
		const userRequests = this.requests.get(userId) || [];
		const validRequests = userRequests.filter((time) => now - time < windowMs);

		return Math.max(0, maxRequests - validRequests.length);
	}
}

// Export rate limiter instance
export const rateLimiter = new RateLimiter();
