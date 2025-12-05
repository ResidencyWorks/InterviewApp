import { DataScrubber } from "@/shared/security/data-scrubber";

export type AnalyticsEventName =
	| "drill_started"
	| "drill_submitted"
	| "score_returned"
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
		console.info("[analytics]", JSON.stringify(event));
	}
}

/**
 * PostHog Analytics Client
 * Sends events to PostHog for tracking and analysis
 */
class PostHogAnalyticsClient implements IAnalyticsClient {
	private projectKey: string;
	private host: string;

	constructor(
		projectKey: string = process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
		host: string = "https://us.posthog.com",
	) {
		this.projectKey = projectKey;
		this.host = host;
	}

	track<TPayload extends Record<string, unknown>>(
		event: IAnalyticsEvent<TPayload>,
	): void {
		if (!this.projectKey) {
			console.warn("[analytics] PostHog project key not configured");
			return;
		}

		// Use userId from context, or fallback to session/anonymous
		const distinctId =
			event.context?.userId || event.context?.sessionId || "anonymous";

		// Scrub PII from event payload before transmission
		const scrubbedPayload = event.payload
			? DataScrubber.scrubObject(event.payload)
			: {};
		const scrubbedContext = event.context
			? DataScrubber.scrubObject(event.context as Record<string, unknown>)
			: {};

		// Build PostHog event payload
		const payload = {
			api_key: this.projectKey,
			batch: [
				{
					distinct_id: distinctId,
					event: event.name,
					properties: {
						...scrubbedPayload,
						sessionId: scrubbedContext.sessionId,
						timestamp: new Date().toISOString(),
					},
					timestamp: new Date().toISOString(),
				},
			],
		};

		// Send to PostHog (non-blocking)
		fetch(`${this.host}/batch/`, {
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
		}).catch((err) => {
			console.error("[analytics] PostHog batch send failed:", err);
		});
	}
}

let client: IAnalyticsClient = new ConsoleAnalyticsClient();

export function setAnalyticsClient(customClient: IAnalyticsClient): void {
	client = customClient;
}

/**
 * Initialize PostHog analytics if key is configured
 */
export function initializeAnalytics(): void {
	const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
	if (posthogKey) {
		client = new PostHogAnalyticsClient(posthogKey);

		console.info("[analytics] PostHog initialized");
	}
}

export function trackDrillStarted(context?: IAnalyticsContext): void {
	client.track({ name: "drill_started", context });
}

export function trackDrillSubmitted(
	payload: { questionId?: string; wordCount?: number },
	context?: IAnalyticsContext,
): void {
	client.track({ name: "drill_submitted", payload, context });
}

export function trackScoreReturned(
	payload: { overallScore: number; duration_s: number; wpm: number },
	context?: IAnalyticsContext,
): void {
	client.track({ name: "score_returned", payload, context });
}

export function trackContentPackLoaded(
	payload: { name: string; version: string },
	context?: IAnalyticsContext,
): void {
	client.track({ name: "content_pack_loaded", payload, context });
}
