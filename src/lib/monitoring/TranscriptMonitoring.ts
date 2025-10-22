import type { PostHogAnalytics } from "../llm/infrastructure/analytics/PostHogAnalytics";
import type { SentryMonitoring } from "../llm/infrastructure/monitoring/SentryMonitoring";

export class TranscriptMonitoring {
	constructor(
		private readonly monitoring: SentryMonitoring,
		private readonly analytics: PostHogAnalytics,
	) {}

	start(userId: string, submissionId: string, audioUrl?: string): void {
		this.analytics.trackAudioProcessing({
			submissionId,
			userId,
			event: "transcription_started",
			audioUrl,
		});
	}

	complete(
		userId: string,
		submissionId: string,
		processingTimeMs: number,
	): void {
		this.analytics.trackAudioProcessing({
			submissionId,
			userId,
			event: "transcription_completed",
			processingTimeMs,
		});
	}

	fail(userId: string, submissionId: string, error: unknown): void {
		this.analytics.trackAudioProcessing({
			submissionId,
			userId,
			event: "transcription_failed",
			errorCode: error instanceof Error ? error.message : "UNKNOWN_ERROR",
		});
		this.monitoring.captureLLMError(error, {
			submissionId,
			userId,
			operation: "transcription",
		});
	}
}
