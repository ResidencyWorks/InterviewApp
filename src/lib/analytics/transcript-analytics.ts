export type AnalyticsEventName =
	| "drill_started"
	| "submission_started"
	| "submission_scored"
	| "content_pack_loaded";

export interface IAnalyticsContext {
	userId?: string;
	sessionId?: string;
}

export interface IAnalyticsEvent<TPayload extends Record<string, unknown>> {
	name: AnalyticsEventName;
	payload?: TPayload;
	context?: IAnalyticsContext;
}

export interface IAnalyticsClient {
	track<TPayload extends Record<string, unknown>>(
		event: IAnalyticsEvent<TPayload>,
	): void;
}

class ConsoleAnalyticsClient implements IAnalyticsClient {
	track<TPayload extends Record<string, unknown>>(
		event: IAnalyticsEvent<TPayload>,
	): void {
		// eslint-disable-next-line no-console
		console.info("[analytics]", JSON.stringify(event));
	}
}

let client: IAnalyticsClient = new ConsoleAnalyticsClient();

export function setAnalyticsClient(customClient: IAnalyticsClient): void {
	client = customClient;
}

export function trackDrillStarted(context?: IAnalyticsContext): void {
	client.track({ name: "drill_started", context });
}

export function trackSubmissionStarted(context?: IAnalyticsContext): void {
	client.track({ name: "submission_started", context });
}

export function trackSubmissionScored(
	payload: { totalScore: number },
	context?: IAnalyticsContext,
): void {
	client.track({ name: "submission_scored", payload, context });
}

export function trackContentPackLoaded(
	payload: { name: string; version: string },
	context?: IAnalyticsContext,
): void {
	client.track({ name: "content_pack_loaded", payload, context });
}

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
