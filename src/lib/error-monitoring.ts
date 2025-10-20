import * as Sentry from '@sentry/nextjs'
import { analytics } from './analytics'

/**
 * Error monitoring utilities
 * Centralizes error handling and reporting
 */

export interface ErrorContext {
  userId?: string
  userEmail?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
}

export interface ErrorReport {
  message: string
  error: Error
  context?: ErrorContext
  level?: 'error' | 'warning' | 'info' | 'debug'
}

/**
 * Error monitoring service
 */
export class ErrorMonitoringService {
  /**
   * Report an error to Sentry and analytics
   */
  reportError(report: ErrorReport): void {
    const { message, error, context, level = 'error' } = report

    // Set user context in Sentry
    if (context?.userId) {
      Sentry.setUser({
        id: context.userId,
        email: context.userEmail,
      })
    }

    // Set additional context
    if (context?.component) {
      Sentry.setTag('component', context.component)
    }

    if (context?.action) {
      Sentry.setTag('action', context.action)
    }

    if (context?.metadata) {
      Sentry.setContext('metadata', context.metadata)
    }

    // Capture the error
    Sentry.captureException(error, {
      level,
      tags: {
        component: context?.component,
        action: context?.action,
      },
      extra: {
        message,
        context: context?.metadata,
      },
    })

    // Track error in analytics
    analytics.trackError(message, {
      error_name: error.name,
      error_message: error.message,
      component: context?.component,
      action: context?.action,
    })
  }

  /**
   * Report a message to Sentry
   */
  reportMessage(
    message: string,
    level: 'error' | 'warning' | 'info' | 'debug' = 'info',
    context?: ErrorContext
  ): void {
    if (context?.userId) {
      Sentry.setUser({
        id: context.userId,
        email: context.userEmail,
      })
    }

    Sentry.captureMessage(message, {
      level,
      tags: {
        component: context?.component,
        action: context?.action,
      },
      extra: context?.metadata,
    })
  }

  /**
   * Set user context for error reporting
   */
  setUserContext(
    userId: string,
    email?: string,
    additionalContext?: Record<string, any>
  ): void {
    Sentry.setUser({
      id: userId,
      email,
      ...additionalContext,
    })
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    Sentry.setUser(null)
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(
    message: string,
    category?: string,
    level?: 'error' | 'warning' | 'info' | 'debug'
  ): void {
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: level || 'info',
      timestamp: Date.now() / 1000,
    })
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context)
  }

  /**
   * Set custom tag
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value)
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoringService()

/**
 * Error boundary helper for React components
 */
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  return Sentry.withErrorBoundary(Component, {})
}

/**
 * API error handler
 */
export function handleApiError(error: unknown, context?: ErrorContext): void {
  if (error instanceof Error) {
    errorMonitoring.reportError({
      message: 'API Error',
      error,
      context: {
        ...context,
        component: 'api',
      },
    })
  } else {
    errorMonitoring.reportMessage(
      `Unknown API error: ${String(error)}`,
      'error',
      {
        ...context,
        component: 'api',
      }
    )
  }
}

/**
 * Database error handler
 */
export function handleDatabaseError(
  error: unknown,
  context?: ErrorContext
): void {
  if (error instanceof Error) {
    errorMonitoring.reportError({
      message: 'Database Error',
      error,
      context: {
        ...context,
        component: 'database',
      },
    })
  } else {
    errorMonitoring.reportMessage(
      `Unknown database error: ${String(error)}`,
      'error',
      {
        ...context,
        component: 'database',
      }
    )
  }
}

/**
 * OpenAI error handler
 */
export function handleOpenAIError(
  error: unknown,
  context?: ErrorContext
): void {
  if (error instanceof Error) {
    errorMonitoring.reportError({
      message: 'OpenAI API Error',
      error,
      context: {
        ...context,
        component: 'openai',
      },
    })
  } else {
    errorMonitoring.reportMessage(
      `Unknown OpenAI error: ${String(error)}`,
      'error',
      {
        ...context,
        component: 'openai',
      }
    )
  }
}

/**
 * Redis error handler
 */
export function handleRedisError(error: unknown, context?: ErrorContext): void {
  if (error instanceof Error) {
    errorMonitoring.reportError({
      message: 'Redis Error',
      error,
      context: {
        ...context,
        component: 'redis',
      },
    })
  } else {
    errorMonitoring.reportMessage(
      `Unknown Redis error: ${String(error)}`,
      'error',
      {
        ...context,
        component: 'redis',
      }
    )
  }
}

/**
 * Validation error handler
 */
export function handleValidationError(
  error: unknown,
  context?: ErrorContext
): void {
  if (error instanceof Error) {
    errorMonitoring.reportError({
      message: 'Validation Error',
      error,
      context: {
        ...context,
        component: 'validation',
      },
      level: 'warning',
    })
  } else {
    errorMonitoring.reportMessage(
      `Unknown validation error: ${String(error)}`,
      'warning',
      {
        ...context,
        component: 'validation',
      }
    )
  }
}

/**
 * Performance monitoring
 */
export function trackPerformance(
  name: string,
  startTime: number,
  context?: ErrorContext
): void {
  const duration = Date.now() - startTime

  // Track in analytics
  analytics.trackApiCall(name, duration, true)

  // Add breadcrumb for debugging
  errorMonitoring.addBreadcrumb(
    `Performance: ${name} took ${duration}ms`,
    'performance',
    'info'
  )

  // Report slow operations
  if (duration > 5000) {
    // 5 seconds
    errorMonitoring.reportMessage(
      `Slow operation: ${name} took ${duration}ms`,
      'warning',
      {
        ...context,
        component: 'performance',
        metadata: { duration, operation: name },
      }
    )
  }
}

/**
 * Health check for error monitoring
 */
export async function checkErrorMonitoringHealth(): Promise<boolean> {
  try {
    // Test Sentry by capturing a test message
    Sentry.captureMessage('Health check', 'info')
    return true
  } catch (error) {
    console.error('Error monitoring health check failed:', error)
    return false
  }
}
