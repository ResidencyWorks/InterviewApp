import { analytics } from "../analytics";

/**
 * Web Vitals metric payload compatible with Next.js useReportWebVitals
 * We define a local type to avoid importing from next internals.
 */
export interface WebVitalsMetric {
	id: string;
	name: string;
	label: string;
	value: number;
	delta: number;
	navigationType?: string;
}

/**
 * Report a Web Vitals metric through the analytics service.
 * CLS value is multiplied by 1000 to match common reporting units.
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
	const normalizedValue =
		metric.name === "CLS" ? metric.value * 1000 : metric.value;
	analytics.track("web_vitals", {
		id: metric.id,
		name: metric.name,
		label: metric.label,
		value: normalizedValue,
		delta: metric.delta,
		navigationType: metric.navigationType,
	});
}
