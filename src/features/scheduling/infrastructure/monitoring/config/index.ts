import { EnvironmentValidator } from "../validation/env-validator";
import {
	type MonitoringConfig,
	MonitoringConfigSchema,
	type MonitoringEnv,
	MonitoringEnvSchema,
	type PerformanceConfig,
	PerformanceConfigSchema,
	type PostHogConfig,
	PostHogConfigSchema,
	type RetentionConfig,
	RetentionConfigSchema,
	type SentryConfig,
	SentryConfigSchema,
	validateMonitoringConfig,
	validateMonitoringEnv,
} from "./schema";

/**
 * Monitoring configuration service
 */
export class MonitoringConfigService {
	private static instance: MonitoringConfigService;
	private config: MonitoringConfig | null = null;
	private envValidator: EnvironmentValidator;

	private constructor() {
		this.envValidator = EnvironmentValidator.getInstance();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): MonitoringConfigService {
		if (!MonitoringConfigService.instance) {
			MonitoringConfigService.instance = new MonitoringConfigService();
		}
		return MonitoringConfigService.instance;
	}

	/**
	 * Initialize the configuration from environment variables
	 */
	public async initialize(): Promise<MonitoringConfig> {
		if (this.config) {
			return this.config;
		}

		try {
			const env = this.envValidator.validate();
			this.config = this.buildConfigFromEnv(env);
			return this.config;
		} catch (error) {
			throw new Error(
				`Failed to initialize monitoring configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Get the current configuration
	 */
	public getConfig(): MonitoringConfig {
		if (!this.config) {
			throw new Error(
				"Monitoring configuration not initialized. Call initialize() first.",
			);
		}
		return this.config;
	}

	/**
	 * Update configuration
	 */
	public updateConfig(config: Partial<MonitoringConfig>): void {
		if (!this.config) {
			throw new Error(
				"Monitoring configuration not initialized. Call initialize() first.",
			);
		}

		this.config = { ...this.config, ...config };
		this.config = validateMonitoringConfig(this.config);
	}

	/**
	 * Reset configuration (useful for testing)
	 */
	public reset(): void {
		this.config = null;
		this.envValidator.reset();
	}

	/**
	 * Build configuration from environment variables
	 */
	private buildConfigFromEnv(env: MonitoringEnv): MonitoringConfig {
		const posthogConfig: PostHogConfig = {
			apiKey: env.POSTHOG_API_KEY,
			host: env.POSTHOG_HOST,
			personProfiles: true,
			capturePageView: false,
			capturePageLeave: true,
			disableSessionRecording: false,
			batchSize: 20,
			flushInterval: 10000,
		};

		const sentryConfig: SentryConfig = {
			dsn: env.SENTRY_DSN,
			environment: env.SENTRY_ENVIRONMENT,
			release: env.SENTRY_RELEASE,
			sampleRate: env.SENTRY_SAMPLE_RATE ?? 1.0,
			tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
			integrations: [],
		};

		const retentionConfig: RetentionConfig = {
			errorEvents: 30,
			analyticsEvents: 90,
			performanceMetrics: 7,
		};

		const performanceConfig: PerformanceConfig = {
			enabled: true,
			maxApiLatency: 5000,
			maxPageLoadTime: 3000,
			samplingRate: 0.1,
			enableWebVitals: true,
		};

		const config: MonitoringConfig = {
			posthog: posthogConfig,
			sentry: sentryConfig,
			environment: env.SENTRY_ENVIRONMENT,
			debug: env.MONITORING_DEBUG ?? false,
			retention: retentionConfig,
			performance: performanceConfig,
		};

		return validateMonitoringConfig(config);
	}

	/**
	 * Get PostHog configuration
	 */
	public getPostHogConfig(): PostHogConfig {
		return this.getConfig().posthog;
	}

	/**
	 * Get Sentry configuration
	 */
	public getSentryConfig(): SentryConfig {
		return this.getConfig().sentry;
	}

	/**
	 * Get retention configuration
	 */
	public getRetentionConfig(): RetentionConfig {
		return this.getConfig().retention;
	}

	/**
	 * Get performance configuration
	 */
	public getPerformanceConfig(): PerformanceConfig {
		return this.getConfig().performance;
	}

	/**
	 * Check if monitoring is enabled
	 */
	public isEnabled(): boolean {
		try {
			const config = this.getConfig();
			return config.debug || config.environment === "development";
		} catch {
			return false;
		}
	}

	/**
	 * Check if debug mode is enabled
	 */
	public isDebugEnabled(): boolean {
		try {
			return this.getConfig().debug;
		} catch {
			return false;
		}
	}

	/**
	 * Get environment name
	 */
	public getEnvironment(): string {
		try {
			return this.getConfig().environment;
		} catch {
			return "unknown";
		}
	}

	/**
	 * Get configuration summary for debugging
	 */
	public getConfigSummary(): Record<string, unknown> {
		try {
			const config = this.getConfig();
			return {
				environment: config.environment,
				debug: config.debug,
				posthogEnabled: !!config.posthog.apiKey,
				posthogHost: config.posthog.host,
				sentryEnabled: !!config.sentry.dsn,
				sentryEnvironment: config.sentry.environment,
				sentryRelease: config.sentry.release,
				performanceEnabled: config.performance.enabled,
				retentionDays: {
					errorEvents: config.retention.errorEvents,
					analyticsEvents: config.retention.analyticsEvents,
					performanceMetrics: config.retention.performanceMetrics,
				},
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				initialized: false,
			};
		}
	}
}

/**
 * Convenience functions
 */
export function getMonitoringConfig(): MonitoringConfig {
	return MonitoringConfigService.getInstance().getConfig();
}

export function getPostHogConfig(): PostHogConfig {
	return MonitoringConfigService.getInstance().getPostHogConfig();
}

export function getSentryConfig(): SentryConfig {
	return MonitoringConfigService.getInstance().getSentryConfig();
}

export function getRetentionConfig(): RetentionConfig {
	return MonitoringConfigService.getInstance().getRetentionConfig();
}

export function getPerformanceConfig(): PerformanceConfig {
	return MonitoringConfigService.getInstance().getPerformanceConfig();
}

export function isMonitoringEnabled(): boolean {
	return MonitoringConfigService.getInstance().isEnabled();
}

export function isDebugEnabled(): boolean {
	return MonitoringConfigService.getInstance().isDebugEnabled();
}

export function getEnvironment(): string {
	return MonitoringConfigService.getInstance().getEnvironment();
}

export function getConfigSummary(): Record<string, unknown> {
	return MonitoringConfigService.getInstance().getConfigSummary();
}

export async function initializeMonitoring(): Promise<MonitoringConfig> {
	return MonitoringConfigService.getInstance().initialize();
}

/**
 * Export types and schemas
 */
export {
	MonitoringConfigSchema,
	PostHogConfigSchema,
	SentryConfigSchema,
	RetentionConfigSchema,
	PerformanceConfigSchema,
	MonitoringEnvSchema,
	validateMonitoringConfig,
	validateMonitoringEnv,
	type MonitoringConfig,
	type PostHogConfig,
	type SentryConfig,
	type RetentionConfig,
	type PerformanceConfig,
	type MonitoringEnv,
};
