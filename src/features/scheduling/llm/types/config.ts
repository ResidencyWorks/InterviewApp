/**
 * Configuration types and validation schemas for the LLM Feedback Engine
 */

import { z } from "zod";

/**
 * OpenAI API configuration
 */
export const OpenAIConfigSchema = z.object({
	apiKey: z.string().min(1, "OpenAI API key is required"),
	whisperModel: z.string().default("whisper-1"),
	textModel: z.string().default("gpt-4"),
	maxRetries: z.number().int().min(0).max(10).default(3),
	timeout: z.number().int().min(1000).default(30000),
});

export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;

/**
 * Retry configuration
 */
export const RetryConfigSchema = z.object({
	maxAttempts: z.number().int().min(1).max(10).default(3),
	baseDelay: z.number().int().min(100).default(1000),
	maxDelay: z.number().int().min(1000).default(10000),
	jitter: z.boolean().default(true),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

/**
 * Circuit breaker configuration
 */
export const CircuitBreakerConfigSchema = z.object({
	threshold: z.number().int().min(1).default(5),
	timeout: z.number().int().min(1000).default(30000),
});

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

/**
 * Fallback configuration
 */
export const FallbackConfigSchema = z.object({
	enabled: z.boolean().default(true),
	defaultScore: z.number().int().min(0).max(100).default(50),
	defaultFeedback: z
		.string()
		.min(10)
		.default(
			"Unable to process your submission at this time. Please try again later.",
		),
});

export type FallbackConfig = z.infer<typeof FallbackConfigSchema>;

/**
 * Analytics configuration
 */
export const AnalyticsConfigSchema = z.object({
	posthogApiKey: z.string().optional(),
	posthogHost: z.url().optional(),
	sentryDsn: z.url().optional(),
});

export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;

/**
 * Main LLM service configuration
 */
export const LLMServiceConfigSchema = z.object({
	openai: OpenAIConfigSchema,
	retry: RetryConfigSchema,
	circuitBreaker: CircuitBreakerConfigSchema,
	fallback: FallbackConfigSchema,
	analytics: AnalyticsConfigSchema,
	debug: z.boolean().default(false),
});

export type LLMServiceConfig = z.infer<typeof LLMServiceConfigSchema>;

/**
 * Default configuration factory
 */
export function createDefaultConfig(): LLMServiceConfig {
	return {
		openai: {
			apiKey: process.env.OPENAI_API_KEY || "",
			whisperModel: process.env.OPENAI_WHISPER_MODEL || "whisper-1",
			textModel: process.env.OPENAI_TEXT_MODEL || "gpt-4",
			maxRetries: parseInt(process.env.MAX_RETRY_ATTEMPTS || "3", 10),
			timeout: parseInt(process.env.OPENAI_TIMEOUT || "30000", 10),
		},
		retry: {
			maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || "3", 10),
			baseDelay: parseInt(process.env.RETRY_BASE_DELAY || "1000", 10),
			maxDelay: parseInt(process.env.RETRY_MAX_DELAY || "10000", 10),
			jitter: process.env.RETRY_JITTER !== "false",
		},
		circuitBreaker: {
			threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || "5", 10),
			timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || "30000", 10),
		},
		fallback: {
			enabled: process.env.FALLBACK_ENABLED !== "false",
			defaultScore: parseInt(process.env.FALLBACK_DEFAULT_SCORE || "50", 10),
			defaultFeedback:
				process.env.FALLBACK_DEFAULT_FEEDBACK ||
				"Unable to process your submission at this time. Please try again later.",
		},
		analytics: {
			posthogApiKey: process.env.POSTHOG_API_KEY,
			posthogHost: process.env.POSTHOG_HOST,
			sentryDsn: process.env.SENTRY_DSN,
		},
		debug: process.env.DEBUG_LLM_SERVICE === "true",
	};
}

/**
 * Validate and parse configuration from environment variables
 */
export function parseConfig(): LLMServiceConfig {
	const config = createDefaultConfig();
	return LLMServiceConfigSchema.parse(config);
}
