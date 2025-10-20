import { performance } from 'node:perf_hooks'

/**
 * Performance monitoring utilities for tracking API endpoint performance
 * Implements performance targets from the specification:
 * - /api/evaluate ≤250ms
 * - Redis lookups ≤50ms
 * - Content validation ≤1s
 */

export interface PerformanceMetrics {
  /** Operation name/identifier */
  operation: string
  /** Duration in milliseconds */
  duration: number
  /** Start timestamp */
  startTime: number
  /** End timestamp */
  endTime: number
  /** Success status */
  success: boolean
  /** Additional metadata */
  metadata?: Record<string, any>
}

export interface PerformanceTarget {
  /** Target duration in milliseconds */
  targetMs: number
  /** Warning threshold (percentage of target) */
  warningThreshold: number
  /** Critical threshold (percentage of target) */
  criticalThreshold: number
}

/**
 * Performance targets for different operations
 */
export const PERFORMANCE_TARGETS: Record<string, PerformanceTarget> = {
  'api.evaluate': {
    targetMs: 250,
    warningThreshold: 0.8, // 200ms
    criticalThreshold: 1.0, // 250ms
  },
  'redis.lookup': {
    targetMs: 50,
    warningThreshold: 0.8, // 40ms
    criticalThreshold: 1.0, // 50ms
  },
  'content.validation': {
    targetMs: 1000,
    warningThreshold: 0.8, // 800ms
    criticalThreshold: 1.0, // 1000ms
  },
  'content.hotswap': {
    targetMs: 1000,
    warningThreshold: 0.8, // 800ms
    criticalThreshold: 1.0, // 1000ms
  },
}

/**
 * Performance monitor class for tracking operation metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private activeOperations: Map<string, number> = new Map()

  /**
   * Start timing an operation
   * @param operation - Operation identifier
   * @param metadata - Optional metadata
   * @returns Operation ID for tracking
   */
  start(_operation: string, _metadata?: Record<string, any>): string {
    const operationId = `${_operation}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const startTime = performance.now()

    this.activeOperations.set(operationId, startTime)

    return operationId
  }

  /**
   * End timing an operation and record metrics
   * @param operationId - Operation ID returned from start()
   * @param success - Whether the operation succeeded
   * @param metadata - Additional metadata
   * @returns Performance metrics
   */
  end(
    operationId: string,
    success = true,
    metadata?: Record<string, any>
  ): PerformanceMetrics {
    const startTime = this.activeOperations.get(operationId)
    if (!startTime) {
      throw new Error(`Operation ${operationId} not found in active operations`)
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // Extract operation name from ID
    const operation = operationId.split('_')[0]

    const metrics: PerformanceMetrics = {
      operation,
      duration,
      startTime,
      endTime,
      success,
      metadata,
    }

    this.metrics.push(metrics)
    this.activeOperations.delete(operationId)

    // Log performance warnings
    this.logPerformanceWarning(metrics)

    return metrics
  }

  /**
   * Get all recorded metrics
   * @returns Array of performance metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get metrics for a specific operation
   * @param operation - Operation name
   * @returns Array of metrics for the operation
   */
  getMetricsForOperation(operation: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.operation === operation)
  }

  /**
   * Get performance statistics for an operation
   * @param operation - Operation name
   * @returns Performance statistics
   */
  getStats(operation: string): {
    count: number
    avgDuration: number
    minDuration: number
    maxDuration: number
    successRate: number
    targetMs: number
    targetMet: number
  } {
    const operationMetrics = this.getMetricsForOperation(operation)
    const target = PERFORMANCE_TARGETS[operation]

    if (operationMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        targetMs: target?.targetMs || 0,
        targetMet: 0,
      }
    }

    const durations = operationMetrics.map((m) => m.duration)
    const successful = operationMetrics.filter((m) => m.success)
    const targetMet = operationMetrics.filter(
      (m) => m.duration <= (target?.targetMs || Number.POSITIVE_INFINITY)
    )

    return {
      count: operationMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successful.length / operationMetrics.length) * 100,
      targetMs: target?.targetMs || 0,
      targetMet: (targetMet.length / operationMetrics.length) * 100,
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
    this.activeOperations.clear()
  }

  /**
   * Log performance warnings for operations that exceed thresholds
   * @param metrics - Performance metrics to check
   */
  private logPerformanceWarning(metrics: PerformanceMetrics): void {
    const target = PERFORMANCE_TARGETS[metrics.operation]
    if (!target) return

    const { targetMs, warningThreshold, criticalThreshold } = target
    const warningMs = targetMs * warningThreshold
    const criticalMs = targetMs * criticalThreshold

    if (metrics.duration > criticalMs) {
      console.error(
        `🚨 CRITICAL: ${metrics.operation} took ${metrics.duration.toFixed(2)}ms (target: ${targetMs}ms)`,
        {
          operation: metrics.operation,
          duration: metrics.duration,
          target: targetMs,
          metadata: metrics.metadata,
        }
      )
    } else if (metrics.duration > warningMs) {
      console.warn(
        `⚠️ WARNING: ${metrics.operation} took ${metrics.duration.toFixed(2)}ms (target: ${targetMs}ms)`,
        {
          operation: metrics.operation,
          duration: metrics.duration,
          target: targetMs,
          metadata: metrics.metadata,
        }
      )
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Decorator for automatically timing function execution
 * @param operation - Operation name
 * @param target - Performance target in milliseconds
 */
export function timed(_operation: string, _target?: number) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const operationId = performanceMonitor.start(_operation)
      let success = true
      let result: any

      try {
        result = await originalMethod.apply(this, args)
        return result
      } catch (error) {
        success = false
        throw error
      } finally {
        performanceMonitor.end(operationId, success, {
          method: propertyKey,
          target: target,
        })
      }
    }

    return descriptor
  }
}

/**
 * Utility function for timing async operations
 * @param operation - Operation name
 * @param fn - Function to execute
 * @param metadata - Optional metadata
 * @returns Promise with result and performance metrics
 */
export async function timeOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const operationId = performanceMonitor.start(operation, metadata)
  let success = true
  let result: T

  try {
    result = await fn()
    return {
      result,
      metrics: performanceMonitor.end(operationId, success, metadata),
    }
  } catch (error) {
    success = false
    const metrics = performanceMonitor.end(operationId, success, metadata)
    throw { error, metrics }
  }
}

/**
 * Utility function for timing synchronous operations
 * @param operation - Operation name
 * @param fn - Function to execute
 * @param metadata - Optional metadata
 * @returns Result and performance metrics
 */
export function timeSyncOperation<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): { result: T; metrics: PerformanceMetrics } {
  const operationId = performanceMonitor.start(operation, metadata)
  let success = true
  let result: T

  try {
    result = fn()
    return {
      result,
      metrics: performanceMonitor.end(operationId, success, metadata),
    }
  } catch (error) {
    success = false
    const metrics = performanceMonitor.end(operationId, success, metadata)
    throw { error, metrics }
  }
}
