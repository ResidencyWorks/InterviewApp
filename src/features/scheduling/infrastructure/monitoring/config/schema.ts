import { z } from "zod";

/**
 * PostHog configuration schema
 */
export const PostHogConfigSchema = z.object({
	apiKey: z.string().min(1, "PostHog API key is required"),
	host: z.url().optional(),
	personProfiles: z.boolean().default(true),
	capturePageView: z.boolean().default(false),
	capturePageLeave: z.boolean().default(true),
	disableSessionRecording: z.boolean().default(false),
	batchSize: z.number().int().positive().default(20),
	flushInterval: z.number().int().positive().default(10000),
});

/**
 * Sentry configuration schema
 */
export const SentryConfigSchema = z.object({
	dsn: z.string().url("Sentry DSN must be a valid URL"),
	environment: z.enum(["development", "staging", "production"]),
	release: z.string().optional(),
	sampleRate: z.number().min(0).max(1).default(1.0),
	tracesSampleRate: z.number().min(0).max(1).default(0.1),
	beforeSend: z.string().optional(),
	beforeBreadcrumb: z.string().optional(),
	integrations: z.array(z.string()).default([]),
});

/**
 * Retention configuration schema
 */
export const RetentionConfigSchema = z.object({
	errorEvents: z.number().int().positive().default(30), // days
	analyticsEvents: z.number().int().positive().default(90), // days
	performanceMetrics: z.number().int().positive().default(7), // days
});

/**
 * Performance configuration schema
 */
export const PerformanceConfigSchema = z.object({
	enabled: z.boolean().default(true),
	maxApiLatency: z.number().int().positive().default(5000), // ms
	maxPageLoadTime: z.number().int().positive().default(3000), // ms
	samplingRate: z.number().min(0).max(1).default(0.1),
	enableWebVitals: z.boolean().default(true),
});

/**
 * Monitoring configuration schema
 */
export const MonitoringConfigSchema = z.object({
	posthog: PostHogConfigSchema,
	sentry: SentryConfigSchema,
	environment: z.enum(["development", "staging", "production"]),
	debug: z.boolean().default(false),
	retention: RetentionConfigSchema,
	performance: PerformanceConfigSchema,
});

/**
 * Environment variables schema for monitoring
 */
export const MonitoringEnvSchema = z.object({
	// PostHog
	POSTHOG_API_KEY: z.string().min(1, "POSTHOG_API_KEY is required"),
	POSTHOG_HOST: z.url().optional(),

	// Sentry
	SENTRY_DSN: z.string().url("SENTRY_DSN must be a valid URL"),
	SENTRY_ENVIRONMENT: z.enum(["development", "staging", "production"]),
	SENTRY_RELEASE: z.string().optional(),
	SENTRY_SAMPLE_RATE: z
		.string()
		.transform((val) => parseFloat(val))
		.pipe(z.number().min(0).max(1))
		.optional(),
	SENTRY_TRACES_SAMPLE_RATE: z
		.string()
		.transform((val) => parseFloat(val))
		.pipe(z.number().min(0).max(1))
		.optional(),

	// General
	NODE_ENV: z.enum(["development", "production", "test"]),
	MONITORING_DEBUG: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.optional(),
});

/**
 * Type exports
 */
export type PostHogConfig = z.infer<typeof PostHogConfigSchema>;
export type SentryConfig = z.infer<typeof SentryConfigSchema>;
export type RetentionConfig = z.infer<typeof RetentionConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type MonitoringEnv = z.infer<typeof MonitoringEnvSchema>;

/**
 * Validation functions
 */
export function validateMonitoringConfig(data: unknown): MonitoringConfig {
	return MonitoringConfigSchema.parse(data);
}

export function validateMonitoringEnv(data: unknown): MonitoringEnv {
	return MonitoringEnvSchema.parse(data);
}

/**
 * Default configurations
 */
export const defaultPostHogConfig: PostHogConfig = {
	apiKey: "",
	host: "https://app.posthog.com",
	personProfiles: true,
	capturePageView: false,
	capturePageLeave: true,
	disableSessionRecording: false,
	batchSize: 20,
	flushInterval: 10000,
};

export const defaultSentryConfig: SentryConfig = {
	dsn: "",
	environment: "development",
	sampleRate: 1.0,
	tracesSampleRate: 0.1,
	integrations: [],
};

export const defaultRetentionConfig: RetentionConfig = {
	errorEvents: 30,
	analyticsEvents: 90,
	performanceMetrics: 7,
};

export const defaultPerformanceConfig: PerformanceConfig = {
	enabled: true,
	maxApiLatency: 5000,
	maxPageLoadTime: 3000,
	samplingRate: 0.1,
	enableWebVitals: true,
};
