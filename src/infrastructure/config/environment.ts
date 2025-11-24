/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present and valid
 */

import { z } from "zod";

/**
 * Helper to create an optional URL field that handles empty strings and invalid values gracefully.
 * This is needed because environment variables from Vercel or other platforms may be set to empty strings,
 * and Zod's `.optional()` only handles `undefined`, not empty strings.
 *
 * Also handles common placeholder values like "undefined", "null", or whitespace-only strings.
 * If a value is provided but is not a valid URL, it will be treated as undefined to allow the build to continue.
 */
const optionalUrl = () => {
	return z.preprocess(
		(val) => {
			// Handle undefined, null, or empty string
			if (val === undefined || val === null || val === "") {
				return undefined;
			}

			const trimmed = String(val).trim();
			const lowercased = trimmed.toLowerCase();

			// Treat empty strings, "undefined", "null", or whitespace-only as undefined
			if (
				trimmed === "" ||
				lowercased === "undefined" ||
				lowercased === "null" ||
				lowercased === "none"
			) {
				return undefined;
			}

			// Validate URL format - if invalid, treat as undefined to allow build to continue
			// This handles cases where Vercel might have an invalid URL value set
			try {
				new URL(trimmed);
				return trimmed;
			} catch {
				// Invalid URL format - treat as undefined to prevent build failure
				// The application will fall back to VERCEL_URL or other defaults
				return undefined;
			}
		},
		z.union([z.url(), z.undefined()]),
	);
};

// Define the environment schema
const envSchema = z.object({
	// Development
	DEBUG: z
		.string()
		.default("false")
		.transform((val) => val === "true"),
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),

	// Authentication
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),

	// Application settings
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	NEXT_PUBLIC_APP_URL: optionalUrl(),
	SYNC_TIMEOUT_MS: z.coerce.number().default(30000),
	RATE_LIMIT_RPM: z.coerce.number().default(60),
	EVALUATION_WEBHOOK_SECRET: z.string().optional(),

	// External services
	OPENAI_API_KEY: z.string().optional(),
	PLAYWRIGHT_BASE_URL: z.url().default("http://localhost:3000"),
	POSTHOG_API_KEY: z.string().optional(),
	POSTHOG_HOST: z.url().default("https://app.posthog.com"),
	SENTRY_DSN: optionalUrl(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),
	STRIPE_PUBLISHABLE_KEY: z.string().optional(),
	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
	STRIPE_PRO_PRICE_ID: z.string().optional(),
	STRIPE_TRIAL_PRICE_ID: z.string().optional(),

	// Supabase
	NEXT_PUBLIC_SUPABASE_URL: z.url({
		message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
	}),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z
		.string()
		.min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
	SUPABASE_URL: optionalUrl(),
	SUPABASE_SERVICE_ROLE_KEY: z
		.string()
		.min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
	SUPABASE_ANON_KEY: z.string().optional(),

	// Redis (Upstash)
	UPSTASH_REDIS_NATIVE_URL: optionalUrl(),
	UPSTASH_REDIS_REST_URL: optionalUrl(),
	UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

	// Deployment
	VERCEL_URL: z.string().optional(),
	VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
});

// Parse and validate environment variables
function validateEnv() {
	try {
		const parsed = envSchema.parse(process.env);
		// Default SUPABASE_URL to NEXT_PUBLIC_SUPABASE_URL if not provided
		// They are typically the same value, just one is public and one is server-side
		if (!parsed.SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_URL) {
			parsed.SUPABASE_URL = parsed.NEXT_PUBLIC_SUPABASE_URL;
		}
		return parsed;
	} catch (error) {
		if (error instanceof z.ZodError) {
			const missingVars = error.issues.map(
				(err) => `${err.path.join(".")}: ${err.message}`,
			);
			throw new Error(
				`❌ Environment validation failed:\n${missingVars.join("\n")}\n\nPlease check your environment variables (.env.local for local development, or Vercel environment variables for deployment) and ensure all required variables are set correctly.`,
			);
		}
		throw error;
	}
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

// Helper function to check if we're in development
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Helper function to check if external services are configured
export const hasOpenAI = !!env.OPENAI_API_KEY;
export const hasPostHog = !!env.POSTHOG_API_KEY;
export const hasSentry = !!env.SENTRY_DSN;
export const hasStripe = !!env.STRIPE_SECRET_KEY;
export const hasRedis = !!env.UPSTASH_REDIS_REST_URL;
export const hasRedisNative = !!env.UPSTASH_REDIS_NATIVE_URL;
export const hasSupabaseServiceRole = !!env.SUPABASE_SERVICE_ROLE_KEY;

// Helper function to get the correct app URL
export const getAppUrl = (): string => {
	// Priority order: NEXT_PUBLIC_APP_URL > VERCEL_URL > localhost fallback
	if (env.NEXT_PUBLIC_APP_URL) {
		return env.NEXT_PUBLIC_APP_URL;
	}

	if (env.VERCEL_URL) {
		return `https://${env.VERCEL_URL}`;
	}

	// Fallback to localhost for development
	return "http://localhost:3000";
};

// Helper function to get the app URL for client-side use
export const getClientAppUrl = (): string => {
	// For client-side, we need to use NEXT_PUBLIC_APP_URL or construct from window.location
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	// Server-side fallback
	return getAppUrl();
};
