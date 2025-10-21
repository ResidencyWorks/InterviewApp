/**
 * Sentry client configuration
 * Handles client-side error monitoring
 * This file configures the initialization of Sentry on the client.
 * The added config here will be used whenever a users loads a page in their browser.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
	// Set tracesSampleRate to 1.0 to capture 100%
	// of the transactions for performance monitoring.
	// We recommend adjusting this value in production
	// tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

	// Capture unhandled promise rejections
	// captureUnhandledRejections: true,

	// Set user context
	beforeSend(event, _hint) {
		// Filter out non-error events in development
		if (process.env.NODE_ENV === "development" && event.level !== "error") {
			return null;
		}

		// Add custom context
		if (event.user) {
			event.tags = {
				...event.tags,
				user_type: event.user.email ? "authenticated" : "anonymous",
			};
		}

		return event;
	},

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: process.env.NODE_ENV === "development",
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

	// Enable logs to be sent to Sentry
	enableLogs: true,

	// Set environment
	environment: process.env.NODE_ENV,

	// You can remove this option if you're not planning to use the Sentry Session Replay feature:
	integrations: [
		Sentry.replayIntegration({
			blockAllMedia: true,
			// Additional Replay configuration goes in here, for example:
			maskAllText: true,
		}),
	],

	// Set release version
	release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",

	replaysOnErrorSampleRate: 1.0,

	// This sets the sample rate to be 10%. You may want this to be 100% while
	// in development and sample at a lower rate in production
	replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.1,

	// Enable sending user PII (Personally Identifiable Information)
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
	sendDefaultPii: true,

	// Configure which URLs to trace
	tracePropagationTargets: [
		"localhost",
		/^https:\/\/.*\.vercel\.app\/api/,
		/^https:\/\/.*\.supabase\.co/,
	],

	// Adjust this value in production, or use tracesSampler for greater control
	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
