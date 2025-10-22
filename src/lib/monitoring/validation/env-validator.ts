import { z } from "zod";
import { type MonitoringEnv, validateMonitoringEnv } from "../config/schema";

/**
 * Environment validation error
 */
export class EnvironmentValidationError extends Error {
	constructor(
		message: string,
		public readonly errors: z.ZodError,
	) {
		super(message);
		this.name = "EnvironmentValidationError";
	}
}

/**
 * Environment validator service
 */
export class EnvironmentValidator {
	private static instance: EnvironmentValidator;
	private validatedEnv: MonitoringEnv | null = null;

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): EnvironmentValidator {
		if (!EnvironmentValidator.instance) {
			EnvironmentValidator.instance = new EnvironmentValidator();
		}
		return EnvironmentValidator.instance;
	}

	/**
	 * Validate environment variables
	 */
	public validate(): MonitoringEnv {
		if (this.validatedEnv) {
			return this.validatedEnv;
		}

		try {
			const envData = this.extractEnvironmentVariables();
			this.validatedEnv = validateMonitoringEnv(envData);
			return this.validatedEnv;
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new EnvironmentValidationError(
					"Environment validation failed",
					error,
				);
			}
			throw error;
		}
	}

	/**
	 * Extract environment variables for validation
	 */
	private extractEnvironmentVariables(): Record<string, unknown> {
		const env = process.env;

		return {
			// PostHog
			POSTHOG_API_KEY: env.POSTHOG_API_KEY,
			POSTHOG_HOST: env.POSTHOG_HOST,

			// Sentry
			SENTRY_DSN: env.SENTRY_DSN,
			SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT,
			SENTRY_RELEASE: env.SENTRY_RELEASE,
			SENTRY_SAMPLE_RATE: env.SENTRY_SAMPLE_RATE,
			SENTRY_TRACES_SAMPLE_RATE: env.SENTRY_TRACES_SAMPLE_RATE,

			// General
			NODE_ENV: env.NODE_ENV,
			MONITORING_DEBUG: env.MONITORING_DEBUG,
		};
	}

	/**
	 * Check if environment is valid without throwing
	 */
	public isValid(): boolean {
		try {
			this.validate();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get validation errors
	 */
	public getValidationErrors(): z.ZodError | null {
		try {
			this.validate();
			return null;
		} catch (error) {
			if (error instanceof EnvironmentValidationError) {
				return error.errors;
			}
			return null;
		}
	}

	/**
	 * Reset validation cache (useful for testing)
	 */
	public reset(): void {
		this.validatedEnv = null;
	}

	/**
	 * Get validated environment variables
	 */
	public getValidatedEnv(): MonitoringEnv {
		return this.validate();
	}

	/**
	 * Check if specific environment variable is set
	 */
	public hasEnvVar(name: keyof MonitoringEnv): boolean {
		try {
			const env = this.getValidatedEnv();
			return env[name] !== undefined && env[name] !== null && env[name] !== "";
		} catch {
			return false;
		}
	}

	/**
	 * Get environment variable value with type safety
	 */
	public getEnvVar<K extends keyof MonitoringEnv>(
		name: K,
	): MonitoringEnv[K] | undefined {
		try {
			const env = this.getValidatedEnv();
			return env[name];
		} catch {
			return undefined;
		}
	}

	/**
	 * Validate environment for production deployment
	 */
	public validateForProduction(): void {
		const env = this.validate();

		if (env.NODE_ENV !== "production") {
			throw new EnvironmentValidationError(
				"NODE_ENV must be 'production' for production deployment",
				new z.ZodError([]),
			);
		}

		if (!env.SENTRY_DSN) {
			throw new EnvironmentValidationError(
				"SENTRY_DSN is required for production deployment",
				new z.ZodError([]),
			);
		}

		if (!env.POSTHOG_API_KEY) {
			throw new EnvironmentValidationError(
				"POSTHOG_API_KEY is required for production deployment",
				new z.ZodError([]),
			);
		}

		if (env.SENTRY_ENVIRONMENT !== "production") {
			throw new EnvironmentValidationError(
				"SENTRY_ENVIRONMENT must be 'production' for production deployment",
				new z.ZodError([]),
			);
		}
	}

	/**
	 * Get environment summary for debugging
	 */
	public getEnvironmentSummary(): Record<string, unknown> {
		try {
			const env = this.getValidatedEnv();
			return {
				nodeEnv: env.NODE_ENV,
				sentryEnvironment: env.SENTRY_ENVIRONMENT,
				hasSentryDsn: !!env.SENTRY_DSN,
				hasPostHogApiKey: !!env.POSTHOG_API_KEY,
				hasPostHogHost: !!env.POSTHOG_HOST,
				hasSentryRelease: !!env.SENTRY_RELEASE,
				debugMode: env.MONITORING_DEBUG || false,
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				isValid: false,
			};
		}
	}
}

/**
 * Convenience functions
 */
export function validateEnvironment(): MonitoringEnv {
	return EnvironmentValidator.getInstance().validate();
}

export function isEnvironmentValid(): boolean {
	return EnvironmentValidator.getInstance().isValid();
}

export function getEnvironmentValidationErrors(): z.ZodError | null {
	return EnvironmentValidator.getInstance().getValidationErrors();
}

export function getValidatedEnvironment(): MonitoringEnv {
	return EnvironmentValidator.getInstance().getValidatedEnv();
}

export function validateEnvironmentForProduction(): void {
	EnvironmentValidator.getInstance().validateForProduction();
}

export function getEnvironmentSummary(): Record<string, unknown> {
	return EnvironmentValidator.getInstance().getEnvironmentSummary();
}
