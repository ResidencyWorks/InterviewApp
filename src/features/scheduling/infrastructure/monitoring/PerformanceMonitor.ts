/**
 * Performance Monitoring Service
 * Tracks operation timing and reports metrics
 */

export interface IPerformanceMetric {
	operationName: string;
	durationMs: number;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface IPerformanceThresholds {
	warning: number; // ms
	critical: number; // ms
}

class PerformanceMonitor {
	private metrics: IPerformanceMetric[] = [];
	private thresholds: Map<string, IPerformanceThresholds> = new Map([
		["evaluate", { warning: 1000, critical: 2000 }],
		["content_pack_activation", { warning: 500, critical: 1000 }],
		["schema_validation", { warning: 100, critical: 200 }],
	]);

	/**
	 * Record a performance metric
	 */
	record(
		operationName: string,
		durationMs: number,
		metadata?: Record<string, unknown>,
	): void {
		const metric: IPerformanceMetric = {
			operationName,
			durationMs,
			timestamp: new Date().toISOString(),
			metadata,
		};

		this.metrics.push(metric);

		// Check thresholds and log warnings
		const threshold = this.thresholds.get(operationName);
		if (threshold) {
			if (durationMs >= threshold.critical) {
				console.warn(
					`[PERF-CRITICAL] ${operationName} took ${durationMs}ms (critical: ${threshold.critical}ms)`,
					metadata,
				);
			} else if (durationMs >= threshold.warning) {
				console.warn(
					`[PERF-WARNING] ${operationName} took ${durationMs}ms (warning: ${threshold.warning}ms)`,
					metadata,
				);
			}
		}
	}

	/**
	 * Measure an async operation and record the time
	 */
	async measure<T>(
		operationName: string,
		fn: () => Promise<T>,
		metadata?: Record<string, unknown>,
	): Promise<T> {
		const startTime = performance.now();
		try {
			const result = await fn();
			const durationMs = Math.round(performance.now() - startTime);
			this.record(operationName, durationMs, metadata);
			return result;
		} catch (error) {
			const durationMs = Math.round(performance.now() - startTime);
			this.record(operationName, durationMs, {
				...metadata,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	}

	/**
	 * Measure a sync operation and record the time
	 */
	measureSync<T>(
		operationName: string,
		fn: () => T,
		metadata?: Record<string, unknown>,
	): T {
		const startTime = performance.now();
		try {
			const result = fn();
			const durationMs = Math.round(performance.now() - startTime);
			this.record(operationName, durationMs, metadata);
			return result;
		} catch (error) {
			const durationMs = Math.round(performance.now() - startTime);
			this.record(operationName, durationMs, {
				...metadata,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	}

	/**
	 * Get metrics for a specific operation
	 */
	getMetrics(operationName?: string): IPerformanceMetric[] {
		if (!operationName) {
			return this.metrics;
		}
		return this.metrics.filter((m) => m.operationName === operationName);
	}

	/**
	 * Get average duration for an operation
	 */
	getAverageDuration(operationName: string): number {
		const metrics = this.getMetrics(operationName);
		if (metrics.length === 0) return 0;
		const total = metrics.reduce((sum, m) => sum + m.durationMs, 0);
		return Math.round(total / metrics.length);
	}

	/**
	 * Get performance summary
	 */
	getSummary(operationName?: string): Record<string, unknown> {
		const metrics = this.getMetrics(operationName);
		if (metrics.length === 0) {
			return { count: 0 };
		}

		const durations = metrics.map((m) => m.durationMs);
		return {
			count: metrics.length,
			min: Math.min(...durations),
			max: Math.max(...durations),
			avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
			p95: this.calculatePercentile(durations, 95),
			p99: this.calculatePercentile(durations, 99),
		};
	}

	/**
	 * Clear recorded metrics
	 */
	clear(): void {
		this.metrics = [];
	}

	/**
	 * Set custom threshold for operation
	 */
	setThreshold(operationName: string, threshold: IPerformanceThresholds): void {
		this.thresholds.set(operationName, threshold);
	}

	private calculatePercentile(values: number[], percentile: number): number {
		const sorted = [...values].sort((a, b) => a - b);
		const index = Math.ceil((percentile / 100) * sorted.length) - 1;
		return sorted[Math.max(0, index)];
	}
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
