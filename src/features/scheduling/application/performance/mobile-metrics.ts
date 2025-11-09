import { analytics } from "@/features/notifications/application/analytics";

export type WebVitalName = "FCP" | "LCP" | "CLS" | "FID" | "INP" | "TTFB";

export interface MobileMetricEntry {
	name: WebVitalName;
	value: number;
	at: number; // epoch ms
}

/**
 * Collects a minimal set of mobile performance metrics using PerformanceObserver.
 * Safe to call multiple times; observers are registered once per page.
 */
export class MobileMetricsService {
	private initialized = false;

	init(): void {
		if (typeof window === "undefined" || this.initialized) return;
		if (!("PerformanceObserver" in window)) return;

		this.initialized = true;

		// First Contentful Paint
		this.observe("paint", (entry) => {
			if (entry.name === "first-contentful-paint") {
				this.emit({ name: "FCP", value: entry.startTime, at: Date.now() });
			}
		});

		// Largest Contentful Paint
		this.observe(
			"largest-contentful-paint",
			(entry) => {
				// Report latest value only
				this.emit({ name: "LCP", value: entry.startTime, at: Date.now() });
			},
			true,
		);

		// Cumulative Layout Shift
		let clsValue = 0;
		this.observe("layout-shift", (entry) => {
			// Only count layout shifts not triggered by recent user input
			const asLayoutShift = entry as PerformanceEntry & {
				value?: number;
				hadRecentInput?: boolean;
			};
			if (
				!asLayoutShift.hadRecentInput &&
				typeof asLayoutShift.value === "number"
			) {
				clsValue += asLayoutShift.value;
				this.emit({ name: "CLS", value: clsValue, at: Date.now() });
			}
		});

		// Time to First Byte (navigation)
		const nav = performance.getEntriesByType("navigation")[0] as
			| PerformanceNavigationTiming
			| undefined;
		if (nav) {
			this.emit({ name: "TTFB", value: nav.responseStart, at: Date.now() });
		}
	}

	private observe(
		type: "paint" | "largest-contentful-paint" | "layout-shift",
		onEntry: (entry: PerformanceEntry) => void,
		buffered = false,
	): void {
		try {
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) onEntry(entry);
			});
			observer.observe({ type, buffered });
		} catch {
			// Observer type not supported
		}
	}

	private emit(entry: MobileMetricEntry): void {
		analytics.track("mobile_metric", {
			metric_name: entry.name,
			metric_value: entry.value,
			at: entry.at,
			device: "mobile",
		});
	}
}

export const mobileMetrics = new MobileMetricsService();
