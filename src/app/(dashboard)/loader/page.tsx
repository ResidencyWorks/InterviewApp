"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	analytics,
	initializeAnalytics,
} from "@/features/notifications/application/analytics";

type PackSummary = {
	id: string;
	name: string;
	version: string;
	is_active: boolean;
};

export default function ContentLoaderPage() {
	const [packs, setPacks] = useState<PackSummary[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/content/list", { cache: "no-store" });
			if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
			const data = await res.json();
			setActiveId(data.activeId ?? null);
			type ApiPack = {
				id: string;
				name: string;
				version: string;
				is_active: boolean;
			};
			const packsInput = (data.packs || []) as ApiPack[];
			setPacks(
				packsInput.map((p) => ({
					id: p.id,
					is_active: p.is_active,
					name: p.name,
					version: p.version,
				})),
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		initializeAnalytics();
		void refresh();
	}, [refresh]);

	const onUpload = useCallback(
		async (file: File) => {
			setLoading(true);
			setError(null);
			try {
				const form = new FormData();
				form.append("file", file);
				const res = await fetch("/api/content/upload", {
					method: "POST",
					body: form,
				});
				const json = await res.json();
				if (!res.ok || json.error || json.valid === false) {
					throw new Error(json.error || "Validation failed");
				}
				analytics.track("content_pack_uploaded", {
					version: json.version,
					name: json.name,
				});
				await refresh();
			} catch (e) {
				setError(e instanceof Error ? e.message : "Upload failed");
			} finally {
				setLoading(false);
			}
		},
		[refresh],
	);

	const onActivate = useCallback(
		async (id: string) => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/content/activate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ packId: id }),
				});
				const json = await res.json();
				if (!res.ok || json.error)
					throw new Error(json.error || "Activate failed");
				setActiveId(json.activeId ?? id);
				analytics.track("content_pack_loaded", { pack_id: id });
				await refresh();
			} catch (e) {
				setError(e instanceof Error ? e.message : "Activate failed");
			} finally {
				setLoading(false);
			}
		},
		[refresh],
	);

	const onFileChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
		async (e) => {
			const file = e.target.files?.[0];
			if (file) await onUpload(file);
		},
		[onUpload],
	);

	const sortedPacks = useMemo(() => {
		return [...packs].sort((a, b) =>
			a.id === activeId ? -1 : b.id === activeId ? 1 : 0,
		);
	}, [packs, activeId]);

	return (
		<div className="p-6 space-y-4">
			<h1 className="text-2xl font-semibold">Content Pack Loader</h1>

			<div className="flex items-center gap-3">
				<input type="file" accept="application/json" onChange={onFileChange} />
				{loading ? <span>Loading…</span> : null}
				{error ? <span className="text-red-600">{error}</span> : null}
			</div>

			<div className="space-y-2">
				<h2 className="text-xl">Available Packs</h2>
				{sortedPacks.length === 0 ? (
					<p className="text-sm text-muted-foreground">No packs found.</p>
				) : (
					<ul className="divide-y">
						{sortedPacks.map((p) => (
							<li key={p.id} className="flex items-center justify-between py-2">
								<div className="space-x-2">
									<span className="font-medium">{p.name}</span>
									<span className="text-sm text-muted-foreground">
										v{p.version}
									</span>
									{p.id === activeId ? (
										<span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
											Active
										</span>
									) : null}
								</div>
								<div className="flex items-center gap-2">
									{p.id !== activeId ? (
										<button
											type="button"
											className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
											onClick={() => onActivate(p.id)}
										>
											Activate
										</button>
									) : null}
									{/* Placeholder for future rollback/backup actions */}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
