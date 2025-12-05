"use client";

import * as React from "react";
import type { ProgressState } from "@/components/drill/ProgressPill";

interface Chip {
	id: string;
	label: string;
	variant?: "default" | "secondary" | "destructive" | "outline";
}

interface EvaluationResult {
	score: number;
	feedback: string;
	strengths?: string[];
	improvements?: string[];
}

interface StreamChunk {
	type: "progress" | "tip" | "chip" | "complete" | "error";
	data: unknown;
	timestamp: number;
}

interface UseEvaluationStreamResult {
	progressState: ProgressState | null;
	tips: string[];
	chips: Chip[];
	result: EvaluationResult | null;
	error: string | null;
	isStreaming: boolean;
}

/**
 * Hook to consume evaluation streaming endpoint
 * Manages progress state, tips, chips, and final result
 */
export function useEvaluationStream(
	jobId: string | null,
	requestId?: string | null,
): UseEvaluationStreamResult {
	const [progressState, setProgressState] =
		React.useState<ProgressState | null>(null);
	const [tips, setTips] = React.useState<string[]>([]);
	const [chips, setChips] = React.useState<Chip[]>([]);
	const [result, setResult] = React.useState<EvaluationResult | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [isStreaming, setIsStreaming] = React.useState(false);

	React.useEffect(() => {
		// Need at least one ID to start streaming
		if (!jobId && !requestId) {
			return;
		}

		console.log("🌊 Starting streaming with:", { jobId, requestId });

		let isCancelled = false;
		setIsStreaming(true);
		setProgressState(null);
		setTips([]);
		setChips([]);
		setResult(null);
		setError(null);

		async function consumeStream() {
			try {
				const params = new URLSearchParams();
				if (jobId) params.append("jobId", jobId);
				if (requestId) params.append("requestId", requestId);

				const streamUrl = `/api/evaluate/stream?${params.toString()}`;
				console.log("🌊 Fetching stream from:", streamUrl);

				const response = await fetch(streamUrl);

				if (!response.ok) {
					console.error(
						"🌊 Stream response not OK:",
						response.status,
						response.statusText,
					);
					throw new Error(`Failed to start stream: ${response.status}`);
				}

				console.log("🌊 Stream connected successfully");

				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) {
					throw new Error("No reader available");
				}

				let buffer = "";

				while (true) {
					const { done, value } = await reader.read();

					if (done || isCancelled) {
						console.log("🌊 Stream ended");
						break;
					}

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");

					// Keep the last incomplete line in the buffer
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							try {
								const chunk = JSON.parse(line.slice(6)) as StreamChunk;
								console.log("🌊 Received chunk:", chunk.type, chunk.data);

								switch (chunk.type) {
									case "progress": {
										const data = chunk.data as {
											state: ProgressState;
										};
										setProgressState(data.state);
										break;
									}
									case "tip": {
										const data = chunk.data as { text: string };
										setTips((prev) => [...prev, data.text]);
										break;
									}
									case "chip": {
										const chipData = chunk.data as Chip;
										setChips((prev) => [...prev, chipData]);
										break;
									}
									case "complete": {
										const data = chunk.data as {
											state: ProgressState;
											result: EvaluationResult;
										};
										setProgressState(data.state);
										setResult(data.result);
										setIsStreaming(false);
										break;
									}
									case "error": {
										const data = chunk.data as {
											message: string;
										};
										setError(data.message);
										setProgressState("error");
										setIsStreaming(false);
										break;
									}
								}
							} catch (parseError) {
								console.error("Failed to parse chunk:", parseError);
							}
						}
					}
				}
			} catch (err) {
				if (!isCancelled) {
					console.error("Stream error:", err);
					setError(err instanceof Error ? err.message : "Stream failed");
					setProgressState("error");
					setIsStreaming(false);
				}
			}
		}

		consumeStream();

		return () => {
			isCancelled = true;
			setIsStreaming(false);
		};
	}, [jobId, requestId]);

	return {
		progressState,
		tips,
		chips,
		result,
		error,
		isStreaming,
	};
}
