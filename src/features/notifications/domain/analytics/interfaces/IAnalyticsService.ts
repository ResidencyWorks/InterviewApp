import type { LoadEvent } from "@/features/booking/domain/entities/LoadEvent";

export interface IAnalyticsService {
	track(
		eventName: string,
		properties?: Record<string, unknown>,
		userId?: string,
	): Promise<void>;
	trackContentPackLoad(loadEvent: LoadEvent): Promise<void>;
	identify(userId: string, properties?: Record<string, unknown>): Promise<void>;
	setUserProperties(
		userId: string,
		properties: Record<string, unknown>,
	): Promise<void>;
	trackPageView(
		pageName: string,
		properties?: Record<string, unknown>,
		userId?: string,
	): Promise<void>;
	trackError(
		error: string | Error,
		context?: Record<string, unknown>,
		userId?: string,
	): Promise<void>;
	flush(): Promise<void>;
	isAvailable(): boolean;
}

export interface AnalyticsServiceConfig {
	apiKey: string;
	host?: string;
	enabled?: boolean;
	debug?: boolean;
	batchSize?: number;
	flushInterval?: number;
}

export interface AnalyticsEventProperties {
	[key: string]: string | number | boolean | Date | null | undefined;
}

export interface UserProperties {
	[key: string]: string | number | boolean | Date | null | undefined;
}
