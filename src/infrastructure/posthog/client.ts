/**
 * PostHog client configuration and setup
 *
 * @fileoverview PostHog client configuration for analytics tracking
 */

import { PostHog } from "posthog-node";
import type { AnalyticsServiceConfig } from "@/features/notifications/domain/analytics/interfaces/IAnalyticsService";
import { DataScrubber } from "@/shared/security/data-scrubber";
import { getPostHogClient } from "../config/clients";
import { env, hasPostHog } from "../config/environment";

/**
 * PostHog client configuration
 */
export interface PostHogClientConfig {
	apiKey: string;
	host?: string;
	enabled?: boolean;
	debug?: boolean;
	batchSize?: number;
	flushInterval?: number;
}

/**
 * Create PostHog client configuration from environment variables
 */
export function createPostHogConfig(): PostHogClientConfig {
	const apiKey = env.POSTHOG_API_KEY;

	if (!apiKey) {
		console.warn(
			"POSTHOG_API_KEY environment variable is not set. Analytics will be disabled.",
		);
	}

	return {
		apiKey: apiKey || "",
		host: env.POSTHOG_HOST || "https://app.posthog.com",
		enabled: hasPostHog && env.POSTHOG_API_KEY !== "",
		debug: env.DEBUG,
		batchSize: parseInt(process.env.POSTHOG_BATCH_SIZE || "20", 10),
		flushInterval: parseInt(process.env.POSTHOG_FLUSH_INTERVAL || "10000", 10),
	};
}

/**
 * Create PostHog client instance
 */
export function createPostHogClient(
	config?: PostHogClientConfig,
): PostHog | null {
	const clientConfig = config || createPostHogConfig();

	if (!clientConfig.enabled || !clientConfig.apiKey) {
		console.log("PostHog client disabled or API key not provided");
		return null;
	}

	try {
		const client = new PostHog(clientConfig.apiKey, {
			host: clientConfig.host,
			flushAt: clientConfig.batchSize,
			flushInterval: clientConfig.flushInterval,
		});

		console.log("PostHog client initialized successfully");
		return client;
	} catch (error) {
		console.error("Failed to initialize PostHog client:", error);
		return null;
	}
}

/**
 * Convert PostHog client config to analytics service config
 */
export function toAnalyticsServiceConfig(
	config: PostHogClientConfig,
): AnalyticsServiceConfig {
	return {
		apiKey: config.apiKey,
		host: config.host,
		enabled: config.enabled,
		debug: config.debug,
		batchSize: config.batchSize,
		flushInterval: config.flushInterval,
	};
}

/**
 * Default PostHog client instance
 */
export const posthogClient = getPostHogClient() ?? createPostHogClient();

/**
 * Shutdown PostHog client gracefully
 */
export async function shutdownPostHogClient(client?: PostHog): Promise<void> {
	const clientToShutdown = client || posthogClient;

	if (clientToShutdown) {
		try {
			await clientToShutdown.shutdown();
			console.log("PostHog client shutdown successfully");
		} catch (error) {
			console.error("Failed to shutdown PostHog client:", error);
		}
	}
}

/**
 * Track event with PostHog client
 */
export async function trackEvent(
	client: PostHog,
	eventName: string,
	properties: Record<string, unknown>,
	userId?: string,
): Promise<void> {
	try {
		// Scrub PII from properties before transmission
		const scrubbedProperties = DataScrubber.scrubObject(properties);

		client.capture({
			distinctId: userId || "anonymous",
			event: eventName,
			properties: {
				...scrubbedProperties,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error(`Failed to track event ${eventName}:`, error);
	}
}

/**
 * Identify user with PostHog client
 */
export async function identifyUser(
	client: PostHog,
	userId: string,
	properties?: Record<string, unknown>,
): Promise<void> {
	try {
		client.identify({
			distinctId: userId,
			properties: properties as Record<
				string,
				string | number | boolean | Date | null | undefined
			>,
		});
	} catch (error) {
		console.error(`Failed to identify user ${userId}:`, error);
	}
}

/**
 * Set user properties with PostHog client
 */
export async function setUserProperties(
	client: PostHog,
	userId: string,
	properties: Record<string, unknown>,
): Promise<void> {
	try {
		client.identify({
			distinctId: userId,
			properties: properties as Record<
				string,
				string | number | boolean | Date | null | undefined
			>,
		});
	} catch (error) {
		console.error(`Failed to set user properties for ${userId}:`, error);
	}
}

/**
 * Flush PostHog client events
 */
export async function flushPostHogClient(client?: PostHog): Promise<void> {
	const clientToFlush = client || posthogClient;

	if (clientToFlush) {
		try {
			await clientToFlush.flush();
		} catch (error) {
			console.error("Failed to flush PostHog client:", error);
		}
	}
}
