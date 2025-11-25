import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

/**
 * Zod schema matching EvaluationResult structure for GPT structured output.
 * Excludes fields that the worker will populate (requestId, jobId, durationMs, createdAt).
 */
const GPTEvaluationSchema = z.object({
	score: z.number().min(0).max(100),
	feedback: z.string().min(1).max(5000),
	what_changed: z.string().max(2000),
	practice_rule: z.string().max(1000),
});

type GPTEvaluation = z.infer<typeof GPTEvaluationSchema>;

/**
 * System prompt defining scoring criteria for interview practice evaluation.
 */
const EVALUATION_SYSTEM_PROMPT = `You are an expert interview coach evaluating practice interview responses.

Analyze the transcript and provide:
1. **score** (0-100): Overall quality of the response
   - 90-100: Excellent - Clear, structured, compelling examples with strong impact
   - 70-89: Good - Solid response with minor improvements needed
   - 50-69: Fair - Missing key elements or lacks clarity
   - 0-49: Poor - Incomplete, unclear, or missing critical components

2. **feedback**: Detailed constructive feedback (1-5000 chars)
   - Highlight strengths
   - Identify specific areas for improvement
   - Suggest concrete techniques to enhance delivery

3. **what_changed**: What improved or changed compared to typical patterns (max 2000 chars)
   - Note any filler words reduced
   - Identify confidence improvements
   - Mention pacing or clarity enhancements

4. **practice_rule**: One specific, actionable rule for next practice session (max 1000 chars)
   - Must be concrete and measurable
   - Example: "Pause for 2 seconds before answering behavioral questions"
   - Example: "Limit responses to 90 seconds maximum"

Be direct, specific, and actionable. Focus on helping the candidate improve.`;

/**
 * Evaluates an interview transcript using GPT-4 with structured output.
 * @param transcript - The interview response transcript to evaluate
 * @returns Evaluation result with score, feedback, recommendations, and token usage
 */
export async function evaluateTranscript(
	transcript: string,
): Promise<GPTEvaluation & { tokensUsed?: number }> {
	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	try {
		const completion = await openai.chat.completions.parse({
			model: "gpt-4o-2024-08-06",
			messages: [
				{
					role: "system",
					content: EVALUATION_SYSTEM_PROMPT,
				},
				{
					role: "user",
					content: `Evaluate this interview response:\n\n${transcript}`,
				},
			],
			response_format: zodResponseFormat(
				GPTEvaluationSchema,
				"interview_evaluation",
			),
			temperature: 0.3, // Low temperature for consistent scoring
		});

		const message = completion.choices[0]?.message;

		if (!message?.parsed) {
			throw new Error("GPT response did not contain parsed evaluation data");
		}

		// Validate parsed output against schema
		const evaluation = GPTEvaluationSchema.parse(message.parsed);

		return {
			...evaluation,
			tokensUsed: completion.usage?.total_tokens,
		};
	} catch (error) {
		console.error("GPT evaluation error:", error);

		if (error instanceof OpenAI.APIError) {
			throw new Error(`GPT API error (${error.status}): ${error.message}`);
		}

		if (error instanceof z.ZodError) {
			throw new Error(
				`GPT response validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
			);
		}

		throw error;
	}
}
