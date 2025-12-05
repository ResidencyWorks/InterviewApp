/**
 * PostHogAnalyticsService implementation for analytics tracking
 *
 * @fileoverview Infrastructure service for PostHog analytics integration
 */

import { PostHog } from "posthog-node";
import type { LoadEvent } from "@/features/booking/domain/entities/LoadEvent";
import type {
	AnalyticsEventProperties,
	AnalyticsServiceConfig,
	IAnalyticsService,
	UserProperties,
} from "@/features/notifications/domain/analytics/interfaces/IAnalyticsService";
import { AnalyticsValidator } from "@/shared/security/analytics-validator";
import { DataScrubber } from "@/shared/security/data-scrubber";

export class PostHogAnalyticsService implements IAnalyticsService {
	private posthog: PostHog | null = null;
	private config: AnalyticsServiceConfig;
	private isInitialized = false;

	constructor(config: AnalyticsServiceConfig) {
		this.config = {
			enabled: true,
			debug: false,
			batchSize: 20,
			flushInterval: 10000, // 10 seconds
			...config,
		};
	}

	/**
	 * Initialize the PostHog client
	 */
	private initialize(): void {
		if (this.isInitialized || !this.config.enabled) {
			return;
		}

		try {
			this.posthog = new PostHog(this.config.apiKey, {
				host: this.config.host || "https://app.posthog.com",
				flushAt: this.config.batchSize || 20,
				flushInterval: this.config.flushInterval || 10000,
			});

			this.isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize PostHog client:", error);
			this.posthog = null;
		}
	}

	/**
	 * Track a custom event
	 */
	async track(
		eventName: string,
		properties?: Record<string, unknown>,
		userId?: string,
	): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		this.initialize();

		if (!this.posthog) {
			console.warn(
				"PostHog client not available for tracking event:",
				eventName,
			);
			return;
		}

		try {
			const distinctId = userId || "anonymous";

			// Scrub PII from properties before transmission
			const scrubbedProperties = properties
				? DataScrubber.scrubObject(properties)
				: {};

			// Validate event contains no PII
			AnalyticsValidator.validateEvent(eventName, {
				...scrubbedProperties,
				distinctId,
			});

			const eventProperties: AnalyticsEventProperties = {
				...scrubbedProperties,
				timestamp: new Date().toISOString(),
			};

			this.posthog.capture({
				distinctId,
				event: eventName,
				properties: eventProperties,
			});

			if (this.config.debug) {
				console.log(`PostHog event tracked: ${eventName}`, {
					distinctId,
					properties: eventProperties,
				});
			}
		} catch (error) {
			console.error(`Failed to track event ${eventName}:`, error);
			// Don't throw - analytics failures shouldn't break the application
		}
	}

	/**
	 * Track a content pack load event
	 */
	async trackContentPackLoad(loadEvent: LoadEvent): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		this.initialize();

		if (!this.posthog) {
			console.warn(
				"PostHog client not available for tracking content pack load event",
			);
			return;
		}

		try {
			this.posthog.capture({
				distinctId: loadEvent.properties.activatedBy,
				event: loadEvent.event,
				properties: {
					...loadEvent.properties,
					timestamp: loadEvent.properties.timestamp.toISOString(),
				},
			});

			if (this.config.debug) {
				console.log("PostHog content pack load event tracked:", loadEvent);
			}
		} catch (error) {
			console.error("Failed to track content pack load event:", error);
			// Don't throw - analytics failures shouldn't break the application
		}
	}

	/**
	 * Identify a user
	 */
	async identify(
		userId: string,
		properties?: Record<string, unknown>,
	): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		this.initialize();

		if (!this.posthog) {
			console.warn("PostHog client not available for user identification");
			return;
		}

		try {
			this.posthog.identify({
				distinctId: userId,
				properties: properties as UserProperties,
			});

			if (this.config.debug) {
				console.log(`PostHog user identified: ${userId}`, properties);
			}
		} catch (error) {
			console.error(`Failed to identify user ${userId}:`, error);
			// Don't throw - analytics failures shouldn't break the application
		}
	}

	/**
	 * Set user properties
	 */
	async setUserProperties(
		userId: string,
		properties: Record<string, unknown>,
	): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		this.initialize();

		if (!this.posthog) {
			console.warn("PostHog client not available for setting user properties");
			return;
		}

		try {
			this.posthog.identify({
				distinctId: userId,
				properties: properties as UserProperties,
			});

			if (this.config.debug) {
				console.log(`PostHog user properties set for ${userId}:`, properties);
			}
		} catch (error) {
			console.error(`Failed to set user properties for ${userId}:`, error);
			// Don't throw - analytics failures shouldn't break the application
		}
	}

	/**
	 * Track page view
	 */
	async trackPageView(
		pageName: string,
		properties?: Record<string, unknown>,
		userId?: string,
	): Promise<void> {
		await this.track(
			"$pageview",
			{
				$current_url: pageName,
				...properties,
			},
			userId,
		);
	}

	/**
	 * Track error
	 */
	async trackError(
		error: string | Error,
		context?: Record<string, unknown>,
		userId?: string,
	): Promise<void> {
		const errorMessage = error instanceof Error ? error.message : error;
		const errorStack = error instanceof Error ? error.stack : undefined;

		await this.track(
			"error_occurred",
			{
				error_message: errorMessage,
				error_stack: errorStack,
				...context,
			},
			userId,
		);
	}

	/**
	 * Flush pending events
	 */
	async flush(): Promise<void> {
		if (!this.posthog) {
			return;
		}

		try {
			await this.posthog.flush();
			if (this.config.debug) {
				console.log("PostHog events flushed");
			}
		} catch (error) {
			console.error("Failed to flush PostHog events:", error);
		}
	}

	/**
	 * Check if analytics service is available
	 */
	isAvailable(): boolean {
		return (
			Boolean(this.config.enabled) &&
			this.isInitialized &&
			this.posthog !== null
		);
	}

	/**
	 * Shutdown the analytics service
	 */
	async shutdown(): Promise<void> {
		if (this.posthog) {
			try {
				await this.posthog.shutdown();
				if (this.config.debug) {
					console.log("PostHog client shutdown");
				}
			} catch (error) {
				console.error("Failed to shutdown PostHog client:", error);
			}
		}
		this.isInitialized = false;
		this.posthog = null;
	}

	/**
	 * Get service configuration
	 */
	getConfig(): AnalyticsServiceConfig {
		return { ...this.config };
	}

	/**
	 * Update service configuration
	 */
	updateConfig(newConfig: Partial<AnalyticsServiceConfig>): void {
		this.config = { ...this.config, ...newConfig };

		// Reinitialize if key settings changed
		if (newConfig.apiKey || newConfig.host || newConfig.enabled !== undefined) {
			this.isInitialized = false;
			this.posthog = null;
		}
	}
}
