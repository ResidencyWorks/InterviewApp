import { type NextRequest, NextResponse } from "next/server";
import { timeOperation } from "@/lib/monitoring/performance";

/**
 * Evaluation API route handler
 * Handles AI-powered evaluation of interview responses with performance monitoring
 * Target: ≤250ms response time
 * @param request - Next.js request object containing response text in JSON body
 * @returns Promise resolving to NextResponse with evaluation results or error
 */
export async function POST(request: NextRequest) {
	try {
		const {
			response,
			type = "text",
			audio_url,
			content_pack_id,
		} = await request.json();

		if (!response) {
			return NextResponse.json(
				{ error: "Response is required" },
				{ status: 400 },
			);
		}

		// Time the entire evaluation operation
		const { result: evaluationResult, metrics } = await timeOperation(
			"api.evaluate",
			async () => {
				// TODO: Implement OpenAI evaluation logic
				// This is a placeholder for the evaluation service
				const result = {
					categories: {
						clarity: 0,
						content: 0,
						delivery: 0,
						structure: 0,
					},
					duration: 0,
					feedback: "Evaluation service not yet implemented",
					score: 0,
					timestamp: new Date().toISOString(),
					wordCount: response.split(" ").length,
					wpm: 0,
				};

				// Simulate processing time for testing
				await new Promise((resolve) => setTimeout(resolve, 100));

				return result;
			},
			{
				contentPackId: content_pack_id,
				hasAudioUrl: !!audio_url,
				responseLength: response.length,
				type,
				wordCount: response.split(" ").length,
			},
		);

		// Add performance metadata to response
		const responseWithMetrics = {
			...evaluationResult,
			performance: {
				duration: metrics.duration,
				operation: metrics.operation,
				target: 250,
				targetMet: metrics.duration <= 250,
			},
		};

		return NextResponse.json(responseWithMetrics);
	} catch (error) {
		console.error("Evaluation API error:", error);

		// Log performance metrics even for errors
		if (error && typeof error === "object" && "metrics" in error) {
			console.error("Performance metrics for failed request:", error.metrics);
		}

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
