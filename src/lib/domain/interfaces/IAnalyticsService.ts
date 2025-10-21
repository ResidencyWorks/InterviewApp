/**
 * IAnalyticsService interface for analytics tracking
 *
 * @fileoverview Domain interface for analytics service abstraction
 */

import type { LoadEvent } from "../entities/LoadEvent";

/**
 * Analytics service interface for tracking events and user behavior
 */
export interface IAnalyticsService {
	/**
	 * Track a custom event
	 * @param eventName - Name of the event to track
	 * @param properties - Event properties
	 * @param userId - User ID (optional)
	 */
	track(
		eventName: string,
		properties?: Record<string, unknown>,
		userId?: string,
	): Promise<void>;

	/**
	 * Track a content pack load event
	 * @param loadEvent - Load event to track
	 */
	trackContentPackLoad(loadEvent: LoadEvent): Promise<void>;

	/**
	 * Identify a user
	 * @param userId - User ID
	 * @param properties - User properties
	 */
	identify(userId: string, properties?: Record<string, unknown>): Promise<void>;

	/**
	 * Set user properties
	 * @param userId - User ID
	 * @param properties - Properties to set
	 */
	setUserProperties(
		userId: string,
		properties: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Track page view
	 * @param pageName - Name of the page
	 * @param properties - Page view properties
	 * @param userId - User ID (optional)
	 */
	trackPageView(
		pageName: string,
		properties?: Record<string, unknown>,
		userId?: string,
	): Promise<void>;

	/**
	 * Track error
	 * @param error - Error message or object
	 * @param context - Error context
	 * @param userId - User ID (optional)
	 */
	trackError(
		error: string | Error,
		context?: Record<string, unknown>,
		userId?: string,
	): Promise<void>;

	/**
	 * Flush pending events (for batch processing)
	 */
	flush(): Promise<void>;

	/**
	 * Check if analytics service is available
	 * @returns true if service is available
	 */
	isAvailable(): boolean;
}

/**
 * Analytics service configuration
 */
export interface AnalyticsServiceConfig {
	apiKey: string;
	host?: string;
	enabled?: boolean;
	debug?: boolean;
	batchSize?: number;
	flushInterval?: number;
}

/**
 * Analytics event properties
 */
export interface AnalyticsEventProperties {
	[key: string]: string | number | boolean | Date | null | undefined;
}

/**
 * User properties for analytics
 */
export interface UserProperties {
	[key: string]: string | number | boolean | Date | null | undefined;
}
