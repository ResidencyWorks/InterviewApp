import type {
	AnalyticsEvent,
	AnalyticsEventType,
} from "../entities/AnalyticsEvent";

/**
 * Analytics service interface
 */
export interface IAnalyticsService {
	/**
	 * Track an analytics event
	 */
	track(event: AnalyticsEvent): Promise<void>;

	/**
	 * Track an analytics event with properties
	 */
	trackEvent(
		type: AnalyticsEventType,
		name: string,
		properties?: Record<string, unknown>,
		context?: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Track a drill started event
	 */
	trackDrillStarted(drillId: string, userId?: string): Promise<void>;

	/**
	 * Track a drill submitted event
	 */
	trackDrillSubmitted(
		drillId: string,
		score: number,
		userId?: string,
	): Promise<void>;

	/**
	 * Track a score returned event
	 */
	trackScoreReturned(
		drillId: string,
		score: number,
		feedback: string,
		userId?: string,
	): Promise<void>;

	/**
	 * Track a content pack loaded event
	 */
	trackContentPackLoaded(packId: string, userId?: string): Promise<void>;

	/**
	 * Track a user login event
	 */
	trackUserLogin(userId: string, method?: string): Promise<void>;

	/**
	 * Track a user logout event
	 */
	trackUserLogout(userId: string): Promise<void>;

	/**
	 * Track a page view event
	 */
	trackPageView(page: string, userId?: string): Promise<void>;

	/**
	 * Track a button click event
	 */
	trackButtonClick(
		buttonName: string,
		page: string,
		userId?: string,
	): Promise<void>;

	/**
	 * Track a form submit event
	 */
	trackFormSubmit(
		formName: string,
		page: string,
		userId?: string,
	): Promise<void>;

	/**
	 * Track an error event
	 */
	trackError(
		errorMessage: string,
		errorCode: string,
		page: string,
		userId?: string,
	): Promise<void>;

	/**
	 * Identify a user
	 */
	identify(userId: string, properties?: Record<string, unknown>): Promise<void>;

	/**
	 * Set user properties
	 */
	setUserProperties(
		userId: string,
		properties: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Set group properties
	 */
	setGroupProperties(
		groupId: string,
		properties: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Flush pending events
	 */
	flush(): Promise<void>;

	/**
	 * Check if the service is available
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * Get service health status
	 */
	getHealthStatus(): Promise<{
		status: "healthy" | "degraded" | "unhealthy";
		lastEventTime?: Date;
		eventCount: number;
		errorCount: number;
	}>;
}

/**
 * Analytics service configuration
 */
export interface AnalyticsServiceConfig {
	/**
	 * API key for the analytics service
	 */
	apiKey: string;

	/**
	 * Host URL for the analytics service
	 */
	host?: string;

	/**
	 * Whether to enable person profiles
	 */
	personProfiles?: boolean;

	/**
	 * Whether to capture page views automatically
	 */
	capturePageView?: boolean;

	/**
	 * Whether to capture page leave events
	 */
	capturePageLeave?: boolean;

	/**
	 * Whether to disable session recording
	 */
	disableSessionRecording?: boolean;

	/**
	 * Batch size for events
	 */
	batchSize?: number;

	/**
	 * Flush interval in milliseconds
	 */
	flushInterval?: number;

	/**
	 * Whether to enable debug mode
	 */
	debug?: boolean;

	/**
	 * Whether to enable the service
	 */
	enabled?: boolean;
}

/**
 * Analytics service factory
 */
export interface IAnalyticsServiceFactory {
	/**
	 * Create an analytics service instance
	 */
	create(config: AnalyticsServiceConfig): IAnalyticsService;
}

/**
 * Analytics service error
 */
export class AnalyticsServiceError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly originalError?: Error,
	) {
		super(message);
		this.name = "AnalyticsServiceError";
	}
}

/**
 * Analytics service health check result
 */
export interface AnalyticsHealthCheck {
	status: "healthy" | "degraded" | "unhealthy";
	lastEventTime?: Date;
	eventCount: number;
	errorCount: number;
	uptime: number;
	version?: string;
}

/**
 * Analytics service metrics
 */
export interface AnalyticsMetrics {
	totalEvents: number;
	successfulEvents: number;
	failedEvents: number;
	averageLatency: number;
	lastEventTime?: Date;
	uptime: number;
}

/**
 * Analytics service adapter interface
 */
export interface IAnalyticsAdapter {
	/**
	 * Initialize the adapter
	 */
	initialize(config: AnalyticsServiceConfig): Promise<void>;

	/**
	 * Track an event
	 */
	track(event: AnalyticsEvent): Promise<void>;

	/**
	 * Identify a user
	 */
	identify(userId: string, properties?: Record<string, unknown>): Promise<void>;

	/**
	 * Set user properties
	 */
	setUserProperties(
		userId: string,
		properties: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Set group properties
	 */
	setGroupProperties(
		groupId: string,
		properties: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Flush pending events
	 */
	flush(): Promise<void>;

	/**
	 * Check if the adapter is available
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * Get adapter health status
	 */
	getHealthStatus(): Promise<AnalyticsHealthCheck>;

	/**
	 * Get adapter metrics
	 */
	getMetrics(): Promise<AnalyticsMetrics>;

	/**
	 * Shutdown the adapter
	 */
	shutdown(): Promise<void>;
}
