"use client";

import { useEffect, useState } from "react";

interface Metrics {
	webVitals: { lcp?: number; cls?: number; inp?: number };
	transcripts: { avgMs?: number; lastMs?: number };
}

export function PerformanceDashboard() {
	const [metrics, setMetrics] = useState<Metrics>({
		webVitals: {},
		transcripts: {},
	});

	useEffect(() => {
		// Placeholder: hook into analytics store in future
		const id = setInterval(() => {
			setMetrics((m) => ({
				webVitals: { ...m.webVitals },
				transcripts: { ...m.transcripts },
			}));
		}, 2000);
		return () => clearInterval(id);
	}, []);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<Card
				title="Largest Contentful Paint"
				value={formatMs(metrics.webVitals.lcp)}
			/>
			<Card
				title="Cumulative Layout Shift"
				value={formatNumber(metrics.webVitals.cls)}
			/>
			<Card
				title="Interaction to Next Paint"
				value={formatMs(metrics.webVitals.inp)}
			/>
			<Card
				title="Avg Transcript Time"
				value={formatMs(metrics.transcripts.avgMs)}
			/>
			<Card
				title="Last Transcript Time"
				value={formatMs(metrics.transcripts.lastMs)}
			/>
		</div>
	);
}

function Card({ title, value }: { title: string; value: string }) {
	return (
		<div className="rounded-md border p-4">
			<div className="text-sm text-muted-foreground">{title}</div>
			<div className="text-2xl font-semibold">{value}</div>
		</div>
	);
}

function formatMs(v?: number) {
	return typeof v === "number" ? `${Math.round(v)} ms` : "–";
}
function formatNumber(v?: number) {
	return typeof v === "number" ? String(Math.round(v * 1000) / 1000) : "–";
}
