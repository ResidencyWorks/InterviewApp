/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present and valid
 */

import { z } from "zod";

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

	// External services
	OPENAI_API_KEY: z.string().optional(),
	PLAYWRIGHT_BASE_URL: z.string().url().default("http://localhost:3000"),
	POSTHOG_API_KEY: z.string().optional(),
	POSTHOG_HOST: z.string().url().default("https://app.posthog.com"),
	SENTRY_DSN: z.string().url().optional(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),
	STRIPE_PUBLISHABLE_KEY: z.string().optional(),
	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
	SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
	SUPABASE_SERVICE_ROLE_KEY: z
		.string()
		.min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

	// Database (Supabase)
	SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
	UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

	// Redis (Upstash)
	UPSTASH_REDIS_REST_URL: z.string().url().optional(),
	VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),

	// Deployment
	VERCEL_URL: z.string().optional(),
});

// Parse and validate environment variables
function validateEnv() {
	try {
		return envSchema.parse(process.env);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const missingVars = error.issues.map(
				(err) => `${err.path.join(".")}: ${err.message}`,
			);
			throw new Error(
				`❌ Environment validation failed:\n${missingVars.join("\n")}\n\nPlease check your .env.local file and ensure all required variables are set.`,
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
