/**
 * OpenAI GPT text analysis adapter implementation
 */

import OpenAI from "openai";
import {
	LLMServiceError,
	ValidationError,
} from "../../domain/errors/LLMErrors.js";
import type {
	ITextAdapter,
	TextAdapterConfig,
	TextAnalysisOptions,
	TextAnalysisResult,
} from "../../domain/interfaces/ITextAdapter.js";

/**
 * OpenAI Text Adapter implementation
 */
export class OpenAITextAdapter implements ITextAdapter {
	private client: OpenAI;
	private config: TextAdapterConfig;

	constructor(config: TextAdapterConfig) {
		this.config = config;
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseURL,
			timeout: config.timeout ?? 30000,
			maxRetries: config.maxRetries ?? 3,
		});
	}

	/**
	 * Analyze text content and generate feedback
	 */
	async analyze(
		text: string,
		options: TextAnalysisOptions = {},
	): Promise<TextAnalysisResult> {
		try {
			// Validate input text
			if (!text || text.trim().length === 0) {
				throw new ValidationError("Text content is required", {
					text: ["Text content cannot be empty"],
				});
			}

			if (text.length > this.getMaxTextLength()) {
				throw new ValidationError("Text content is too long", {
					text: [
						`Text content must be less than ${this.getMaxTextLength()} characters`,
					],
				});
			}

			// Generate prompt
			const prompt = this.generatePrompt(text, options);

			// Call OpenAI API
			const response = await this.client.chat.completions.create({
				model: this.config.model ?? "gpt-4",
				messages: [
					{
						role: "system",
						content: this.getSystemPrompt(),
					},
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: options.temperature ?? 0.7,
				max_tokens: options.maxTokens ?? 1000,
				response_format: { type: "json_object" },
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new LLMServiceError("No response content received from OpenAI");
			}

			// Parse the JSON response
			const analysis = this.parseAnalysisResponse(content);

			return analysis;
		} catch (error) {
			if (
				error instanceof LLMServiceError ||
				error instanceof ValidationError
			) {
				throw error;
			}

			// Handle OpenAI API errors
			if (error instanceof Error) {
				throw new LLMServiceError(
					`Text analysis failed: ${error.message}`,
					error,
				);
			}

			throw new LLMServiceError("Unknown error during text analysis", error);
		}
	}

	/**
	 * Get the model name used by this adapter
	 */
	getModelName(): string {
		return this.config.model ?? "gpt-4";
	}

	/**
	 * Get maximum text length supported by the adapter
	 */
	getMaxTextLength(): number {
		// GPT-4 has a context limit, but we'll set a reasonable limit for analysis
		return 10000; // 10,000 characters
	}

	/**
	 * Check if the adapter is available
	 */
	async isAvailable(): Promise<boolean> {
		try {
			// Make a simple test call to check if the service is available
			await this.client.models.list();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Generate the prompt for text analysis
	 */
	private generatePrompt(text: string, options: TextAnalysisOptions): string {
		const promptTemplate =
			options.promptTemplate ??
			this.config.defaultPromptTemplate ??
			this.getDefaultPromptTemplate();

		return promptTemplate
			.replace("{{text}}", text)
			.replace("{{questionId}}", options.questionId ?? "general")
			.replace("{{context}}", options.context ?? "")
			.replace("{{userId}}", options.userId ?? "anonymous");
	}

	/**
	 * Get the system prompt for the AI
	 */
	private getSystemPrompt(): string {
		return `You are an expert interview coach and evaluator. Your task is to analyze interview responses and provide constructive feedback.

Please analyze the provided text and return a JSON response with the following structure:
{
  "score": <number between 0-100>,
  "feedback": "<detailed feedback message>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "improvements": ["<improvement1>", "<improvement2>", "<improvement3>"],
  "reasoning": "<brief explanation of the scoring rationale>"
}

Guidelines:
- Score should reflect overall quality (0-100 scale)
- Feedback should be constructive and specific
- List 2-5 key strengths
- List 2-5 specific areas for improvement
- Be encouraging but honest
- Focus on actionable advice`;
	}

	/**
	 * Get default prompt template
	 */
	private getDefaultPromptTemplate(): string {
		return `Please analyze this interview response:

Text: "{{text}}"

Question ID: {{questionId}}
{{#if context}}Additional Context: {{context}}{{/if}}

Provide detailed feedback on the response quality, including strengths and areas for improvement.`;
	}

	/**
	 * Parse the analysis response from OpenAI
	 */
	private parseAnalysisResponse(content: string): TextAnalysisResult {
		try {
			const parsed = JSON.parse(content);

			// Validate the response structure
			if (
				typeof parsed.score !== "number" ||
				parsed.score < 0 ||
				parsed.score > 100
			) {
				throw new Error("Invalid score in response");
			}

			if (
				typeof parsed.feedback !== "string" ||
				parsed.feedback.trim().length === 0
			) {
				throw new Error("Invalid feedback in response");
			}

			if (!Array.isArray(parsed.strengths)) {
				throw new Error("Invalid strengths in response");
			}

			if (!Array.isArray(parsed.improvements)) {
				throw new Error("Invalid improvements in response");
			}

			return {
				score: Math.round(parsed.score),
				feedback: parsed.feedback.trim(),
				strengths: parsed.strengths.filter(
					(s: unknown) => typeof s === "string",
				),
				improvements: parsed.improvements.filter(
					(i: unknown) => typeof i === "string",
				),
				reasoning: parsed.reasoning,
			};
		} catch (error) {
			throw new LLMServiceError(
				`Failed to parse analysis response: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ content },
			);
		}
	}

	/**
	 * Update adapter configuration
	 */
	updateConfig(config: Partial<TextAdapterConfig>): void {
		this.config = { ...this.config, ...config };

		// Recreate client with new configuration
		this.client = new OpenAI({
			apiKey: this.config.apiKey,
			baseURL: this.config.baseURL,
			timeout: this.config.timeout ?? 30000,
			maxRetries: this.config.maxRetries ?? 3,
		});
	}

	/**
	 * Get current configuration
	 */
	getConfig(): TextAdapterConfig {
		return { ...this.config };
	}
}
