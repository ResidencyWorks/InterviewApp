import type { PostHogAnalytics } from "../llm/infrastructure/analytics/PostHogAnalytics";

export class TranscriptAnalytics {
	constructor(private readonly analytics: PostHogAnalytics) {}

	trackPerformance(userId: string, durationMs: number): void {
		this.analytics.captureEvent("transcript_performance", {
			user_id: userId,
			duration_ms: durationMs,
			timestamp: new Date().toISOString(),
		});
	}
}
