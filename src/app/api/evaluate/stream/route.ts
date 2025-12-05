import type { NextRequest } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

interface StreamChunk {
	type: "progress" | "tip" | "chip" | "complete" | "error";
	data: unknown;
	timestamp: number;
}

/**
 * GET /api/evaluate/stream?jobId=xxx&requestId=yyy
 * Stream evaluation progress updates, tips, and chips
 * Requirements:
 * - First chunk within 500ms (progress indicator)
 * - Tips start streaming within 1s
 * - Chips stream progressively
 */
export async function GET(request: NextRequest) {
	try {
		console.log("🌊 Stream endpoint called");
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			console.log("🌊 Auth failed:", authError);
			return createUnauthorizedResponse("Authentication required");
		}

		const { searchParams } = new URL(request.url);
		const jobId = searchParams.get("jobId");
		const requestId = searchParams.get("requestId");

		console.log("🌊 Stream params:", { jobId, requestId });

		if (!jobId && !requestId) {
			console.log("🌊 Missing parameters");
			return createErrorResponse(
				"Missing jobId or requestId parameter",
				"MISSING_PARAMETER",
				400,
			);
		}

		// Fetch streaming tips from database
		const { data: tipsData, error: tipsError } = await supabase
			.from("streaming_tips")
			.select("tip_text")
			.eq("is_active", true)
			.order("display_order", { ascending: true });

		console.log(
			"🌊 Tips fetched:",
			tipsData?.length,
			"tips",
			tipsError ? `Error: ${tipsError.message}` : "",
		);

		const tips = tipsData?.map((t) => t.tip_text) || [];

		// Create streaming response
		const encoder = new TextEncoder();

		const generateStream = async function* () {
			// Send initial progress indicator (within 500ms)
			yield encoder.encode(
				`data: ${JSON.stringify({
					type: "progress",
					data: { state: "processing" },
					timestamp: Date.now(),
				} satisfies StreamChunk)}\n\n`,
			);

			// Wait a bit, then send evaluating state
			await sleep(800);
			yield encoder.encode(
				`data: ${JSON.stringify({
					type: "progress",
					data: { state: "evaluating" },
					timestamp: Date.now(),
				} satisfies StreamChunk)}\n\n`,
			);

			// Stream tips (start after 1s total)
			await sleep(200);
			for (const tip of tips.slice(0, 5)) {
				yield encoder.encode(
					`data: ${JSON.stringify({
						type: "tip",
						data: { text: tip },
						timestamp: Date.now(),
					} satisfies StreamChunk)}\n\n`,
				);
				await sleep(2000); // 2s between tips
			}

			// Generate example chips (in real implementation, these would come from evaluation)
			const exampleChips = [
				{ id: "1", label: "Clear explanation", variant: "default" as const },
				{ id: "2", label: "Good structure", variant: "default" as const },
				{ id: "3", label: "Technical accuracy", variant: "default" as const },
			];

			// Stream chips progressively
			for (const chip of exampleChips) {
				yield encoder.encode(
					`data: ${JSON.stringify({
						type: "chip",
						data: chip,
						timestamp: Date.now(),
					} satisfies StreamChunk)}\n\n`,
				);
				await sleep(500);
			}

			// Poll for actual evaluation completion
			let attempts = 0;
			const maxAttempts = 30; // 30 seconds max

			while (attempts < maxAttempts) {
				// First try checking job status endpoint if we have a jobId
				if (jobId) {
					try {
						const statusResponse = await fetch(
							`${request.nextUrl.origin}/api/evaluate/${jobId}/status`,
							{
								headers: {
									Cookie: request.headers.get("Cookie") || "",
								},
							},
						);

						if (statusResponse.ok) {
							const statusData = await statusResponse.json();

							if (statusData.status === "completed" && statusData.result) {
								yield encoder.encode(
									`data: ${JSON.stringify({
										type: "complete",
										data: {
											state: "complete",
											result: {
												score: statusData.result.score,
												feedback: statusData.result.feedback,
												what_changed: statusData.result.what_changed,
											},
										},
										timestamp: Date.now(),
									} satisfies StreamChunk)}\n\n`,
								);
								return; // Exit generator
							}

							if (statusData.status === "failed") {
								yield encoder.encode(
									`data: ${JSON.stringify({
										type: "error",
										data: { message: "Evaluation failed" },
										timestamp: Date.now(),
									} satisfies StreamChunk)}\n\n`,
								);
								return; // Exit generator
							}
						}
					} catch (statusError) {
						console.warn("Failed to check job status:", statusError);
					}
				}

				// Fallback: Check evaluation_results table by requestId
				if (requestId) {
					const { data: result } = await supabase
						.from("evaluation_results")
						.select("*")
						.eq("request_id", requestId)
						.maybeSingle();

					if (result) {
						yield encoder.encode(
							`data: ${JSON.stringify({
								type: "complete",
								data: {
									state: "complete",
									result: {
										score: result.score,
										feedback: result.feedback,
										what_changed: result.what_changed,
									},
								},
								timestamp: Date.now(),
							} satisfies StreamChunk)}\n\n`,
						);
						return; // Exit generator
					}
				}

				await sleep(1000);
				attempts++;
			}

			// If we timed out, send error
			yield encoder.encode(
				`data: ${JSON.stringify({
					type: "error",
					data: { message: "Evaluation timed out" },
					timestamp: Date.now(),
				} satisfies StreamChunk)}\n\n`,
			);
		};

		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of generateStream()) {
						controller.enqueue(chunk);
					}
					controller.close();
				} catch (error) {
					console.error("Stream error:", error);
					controller.error(error);
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no", // Disable nginx buffering
			},
		});
	} catch (error) {
		console.error("Error in streaming endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
