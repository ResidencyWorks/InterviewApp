import type {
	AlertHandlerFunction,
	MonitoringConfig,
	PerformanceAlert,
	PerformanceCollectorFunction,
	PerformanceMetrics,
	PerformanceThreshold,
} from "./monitoring-types";

/**
 * Performance monitoring service
 */
export class PerformanceMonitor {
	private collectors = new Map<string, PerformanceCollectorFunction>();
	private alertHandlers: AlertHandlerFunction[] = [];
	private thresholds: PerformanceThreshold[] = [];
	private metrics: PerformanceMetrics[] = [];
	private monitoringInterval: NodeJS.Timeout | null = null;
	private config: MonitoringConfig;

	constructor(config: Partial<MonitoringConfig> = {}) {
		this.config = {
			alertThresholds: [],
			enabledServices: [],
			healthCheckInterval: 30000, // 30 seconds
			performanceCheckInterval: 60000, // 1 minute
			...config,
		};
	}

	/**
	 * Register a performance metric collector
	 * @param name - Collector name
	 * @param collector - Collector function
	 */
	registerPerformanceCollector(
		name: string,
		collector: PerformanceCollectorFunction,
	): void {
		this.collectors.set(name, collector);
	}

	/**
	 * Register an alert handler
	 * @param handler - Alert handler function
	 */
	registerAlertHandler(handler: AlertHandlerFunction): void {
		this.alertHandlers.push(handler);
	}

	/**
	 * Set performance thresholds
	 * @param thresholds - Array of performance thresholds
	 */
	setThresholds(thresholds: PerformanceThreshold[]): void {
		this.thresholds = thresholds;
	}

	/**
	 * Get performance metrics
	 * @param name - Optional metric name filter
	 * @returns Promise resolving to performance metrics
	 */
	async getPerformanceMetrics(name?: string): Promise<PerformanceMetrics[]> {
		if (name) {
			return this.metrics.filter((metric) => metric.name === name);
		}
		return [...this.metrics];
	}

	/**
	 * Collect metrics from all registered collectors
	 * @returns Promise resolving to collected metrics
	 */
	async collectMetrics(): Promise<PerformanceMetrics[]> {
		const collectedMetrics: PerformanceMetrics[] = [];

		for (const [collectorName, collector] of Array.from(
			this.collectors.entries(),
		)) {
			try {
				const metrics = await collector();
				collectedMetrics.push(...metrics);
			} catch (error) {
				console.error(`Error collecting metrics from ${collectorName}:`, error);
			}
		}

		// Store metrics
		this.metrics.push(...collectedMetrics);

		// Keep only last 1000 metrics to prevent memory issues
		if (this.metrics.length > 1000) {
			this.metrics = this.metrics.slice(-1000);
		}

		return collectedMetrics;
	}

	/**
	 * Check performance thresholds and generate alerts
	 * @returns Promise resolving to performance alerts
	 */
	async checkThresholds(): Promise<PerformanceAlert[]> {
		const alerts: PerformanceAlert[] = [];

		for (const threshold of this.thresholds) {
			const recentMetrics = this.metrics
				.filter((metric) => metric.name === threshold.name)
				.slice(-10); // Check last 10 measurements

			if (recentMetrics.length === 0) continue;

			const latestMetric = recentMetrics[recentMetrics.length - 1];
			const value = latestMetric.value;

			if (value >= threshold.critical) {
				alerts.push({
					id: `${threshold.name}-critical-${Date.now()}`,
					message: `${threshold.name} is at critical level: ${value} ${threshold.unit} (threshold: ${threshold.critical} ${threshold.unit})`,
					name: threshold.name,
					severity: "critical",
					threshold: threshold.critical,
					timestamp: new Date().toISOString(),
					value,
				});
			} else if (value >= threshold.warning) {
				alerts.push({
					id: `${threshold.name}-warning-${Date.now()}`,
					message: `${threshold.name} is at warning level: ${value} ${threshold.unit} (threshold: ${threshold.warning} ${threshold.unit})`,
					name: threshold.name,
					severity: "warning",
					threshold: threshold.warning,
					timestamp: new Date().toISOString(),
					value,
				});
			}
		}

		// Send alerts to registered handlers
		for (const alert of alerts) {
			for (const handler of this.alertHandlers) {
				try {
					await handler(alert);
				} catch (error) {
					console.error("Error handling alert:", error);
				}
			}
		}

		return alerts;
	}

	/**
	 * Start performance monitoring
	 */
	startMonitoring(): void {
		if (this.monitoringInterval) {
			return; // Already monitoring
		}

		this.monitoringInterval = setInterval(async () => {
			try {
				await this.collectMetrics();
				await this.checkThresholds();
			} catch (error) {
				console.error("Error in performance monitoring:", error);
			}
		}, this.config.performanceCheckInterval);
	}

	/**
	 * Stop performance monitoring
	 */
	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}
	}

	/**
	 * Get metrics summary
	 * @returns Object containing metrics summary
	 */
	getMetricsSummary(): Record<
		string,
		{ avg: number; min: number; max: number; count: number }
	> {
		const summary: Record<
			string,
			{ avg: number; min: number; max: number; count: number }
		> = {};

		// Group metrics by name
		const groupedMetrics = this.metrics.reduce(
			(acc, metric) => {
				if (!acc[metric.name]) {
					acc[metric.name] = [];
				}
				acc[metric.name].push(metric.value);
				return acc;
			},
			{} as Record<string, number[]>,
		);

		// Calculate summary for each metric
		for (const [name, values] of Object.entries(groupedMetrics)) {
			const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
			const min = Math.min(...values);
			const max = Math.max(...values);

			summary[name] = {
				avg: Math.round(avg * 100) / 100,
				count: values.length,
				max,
				min,
			};
		}

		return summary;
	}

	/**
	 * Clear all metrics
	 */
	clearMetrics(): void {
		this.metrics = [];
	}
}

/**
 * Memory usage collector
 */
export async function memoryUsageCollector() {
	if (typeof process === "undefined") {
		return []; // Not available in browser
	}

	const usage = process.memoryUsage();
	return [
		{
			name: "memory_heap_used",
			tags: { type: "memory" },
			timestamp: new Date().toISOString(),
			unit: "bytes",
			value: usage.heapUsed,
		},
		{
			name: "memory_heap_total",
			tags: { type: "memory" },
			timestamp: new Date().toISOString(),
			unit: "bytes",
			value: usage.heapTotal,
		},
		{
			name: "memory_rss",
			tags: { type: "memory" },
			timestamp: new Date().toISOString(),
			unit: "bytes",
			value: usage.rss,
		},
	];
}

/**
 * CPU usage collector (simplified)
 */
export async function cpuUsageCollector() {
	if (typeof process === "undefined") {
		return []; // Not available in browser
	}

	const startUsage = process.cpuUsage();
	const startTime = Date.now();

	// Wait a bit to measure CPU usage
	await new Promise((resolve) => setTimeout(resolve, 100));

	const endUsage = process.cpuUsage(startUsage);
	const endTime = Date.now();

	const cpuTime = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
	const elapsedTime = endTime - startTime;
	const cpuPercent = (cpuTime / elapsedTime) * 100;

	return [
		{
			name: "cpu_usage_percent",
			tags: { type: "cpu" },
			timestamp: new Date().toISOString(),
			unit: "percent",
			value: Math.round(cpuPercent * 100) / 100,
		},
	];
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Register default collectors
performanceMonitor.registerPerformanceCollector("memory", memoryUsageCollector);
performanceMonitor.registerPerformanceCollector("cpu", cpuUsageCollector);

// Set default thresholds
performanceMonitor.setThresholds([
	{
		critical: 200 * 1024 * 1024, // 200MB
		name: "memory_heap_used",
		unit: "bytes",
		warning: 100 * 1024 * 1024, // 100MB
	},
	{
		critical: 95,
		name: "cpu_usage_percent",
		unit: "percent",
		warning: 80,
	},
]);
