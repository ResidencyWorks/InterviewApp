"use client";

import { useReportWebVitals } from "next/web-vitals";
import { reportWebVitals } from "@/features/notifications/application/analytics/web-vitals";

export function WebVitals() {
	useReportWebVitals((metric) => {
		reportWebVitals({
			id: metric.id,
			name: metric.name,
			label: "web-vitals",
			value: metric.value,
			delta: metric.delta,
			navigationType: metric.navigationType,
		});
	});
	return null;
}
