import * as Sentry from '@sentry/nextjs'

/**
 * Sentry edge runtime configuration
 * Handles edge runtime error monitoring
 */

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Set release version
  release: process.env.APP_VERSION || '1.0.0',

  // Set environment
  environment: process.env.NODE_ENV,

  // Capture unhandled promise rejections
  // captureUnhandledRejections: true,

  // Configure which URLs to trace
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.vercel\.app\/api/,
    /^https:\/\/.*\.supabase\.co/,
  ],

  // Filter out health check endpoints
  beforeSend(event, _hint) {
    // Filter out health check errors
    if (
      event.request?.url?.includes('/health') ||
      event.request?.url?.includes('/ping')
    ) {
      return null
    }

    return event
  },
})
