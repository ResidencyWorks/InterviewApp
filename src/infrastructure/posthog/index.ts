import { getPostHogClient } from "../config/clients";

/**
 * Capture a server-side event to PostHog
 * @param eventName Name of the event (e.g. 'job_completed')
 * @param properties Event properties
 * @param distinctId Optional user/session ID. If not provided, defaults to 'system' or 'worker'.
 */
export function captureEvent(
	eventName: string,
	properties: Record<string, unknown>,
	distinctId: string = "system-worker",
): void {
	const client = getPostHogClient();
	if (!client) {
		// PostHog not configured, skip
		return;
	}

	try {
		client.capture({
			distinctId,
			event: eventName,
			properties,
		});
	} catch (error) {
		console.error(`Failed to capture PostHog event ${eventName}:`, error);
	}
}

/**
 * Flush pending events (useful for serverless/worker shutdown)
 */
export async function flushEvents(): Promise<void> {
	const client = getPostHogClient();
	if (client) {
		await client.shutdown();
	}
}
