"use client";

import { useReportWebVitals } from "next/web-vitals";
import posthog from "posthog-js";

export function WebVitals() {
	useReportWebVitals((metric) => {
		const value = metric.name === "CLS" ? metric.value * 1000 : metric.value;
		try {
			posthog.capture("web_vitals", {
				id: metric.id,
				name: metric.name,
				label: "web-vitals",
				value,
				delta: metric.delta,
				navigationType: metric.navigationType,
			});
		} catch {
			// no-op
		}
	});
	return null;
}
