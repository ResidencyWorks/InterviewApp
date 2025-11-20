/**
 * Statistical utilities for calculating percentiles and aggregating metrics.
 * Used by CLI harness and monitoring systems.
 */

export interface PerformanceStats {
	count: number;
	min: number;
	max: number;
	mean: number;
	median: number;
	p50: number;
	p95: number;
	p99: number;
	sum: number;
}

/**
 * Calculate a specific percentile from an array of numbers.
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (0-100)
 * @returns The value at the specified percentile
 */
export function calculatePercentile(
	values: number[],
	percentile: number,
): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.ceil((percentile / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

/**
 * Calculate comprehensive statistics for an array of values.
 * @param values - Array of numeric values (e.g., latencies in ms)
 * @returns Object containing min, max, mean, median, percentiles, etc.
 */
export function calculateStats(values: number[]): PerformanceStats {
	if (values.length === 0) {
		return {
			count: 0,
			min: 0,
			max: 0,
			mean: 0,
			median: 0,
			p50: 0,
			p95: 0,
			p99: 0,
			sum: 0,
		};
	}

	const sorted = [...values].sort((a, b) => a - b);
	const sum = values.reduce((acc, val) => acc + val, 0);
	const mean = sum / values.length;

	return {
		count: values.length,
		min: sorted[0],
		max: sorted[sorted.length - 1],
		mean,
		median: calculatePercentile(values, 50),
		p50: calculatePercentile(values, 50),
		p95: calculatePercentile(values, 95),
		p99: calculatePercentile(values, 99),
		sum,
	};
}

/**
 * Format a PerformanceStats object as a readable string.
 * @param stats - Performance statistics object
 * @param unit - Unit of measurement (default: 'ms')
 * @returns Formatted string with statistics
 */
export function formatStats(
	stats: PerformanceStats,
	unit: string = "ms",
): string {
	return `
Count: ${stats.count}
Min: ${stats.min.toFixed(2)}${unit}
Max: ${stats.max.toFixed(2)}${unit}
Mean: ${stats.mean.toFixed(2)}${unit}
Median (p50): ${stats.p50.toFixed(2)}${unit}
p95: ${stats.p95.toFixed(2)}${unit}
p99: ${stats.p99.toFixed(2)}${unit}
`.trim();
}
