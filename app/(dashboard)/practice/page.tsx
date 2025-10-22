"use client";
import { useEffect, useState } from "react";
import ResultsView from "@/components/evaluation/ResultsView";
import {
	trackDrillStarted,
	trackSubmissionScored,
	trackSubmissionStarted,
} from "@/lib/analytics/transcript-analytics";
import { entitlementsService } from "@/lib/entitlements/EntitlementsService";
import {
	setError,
	setResult,
	setSubmitting,
	useEvaluationResultsStore,
} from "@/store/evaluationResultsStore";

export default function PracticePage(): React.ReactElement {
	const { result, isSubmitting, error } = useEvaluationResultsStore();
	const [transcript, setTranscript] = useState("");

	// Fire drill_started on first render
	useEffect(() => {
		trackDrillStarted();
	}, []);

	async function onSubmit(e: React.FormEvent): Promise<void> {
		e.preventDefault();
		setSubmitting(true);
		setError(undefined);
		trackSubmissionStarted();
		try {
			const res = await fetch("/api/evaluate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ transcript }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error ?? "Request failed");
			setResult(json);
			trackSubmissionScored({ totalScore: Number(json.totalScore ?? 0) });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="mx-auto max-w-3xl p-6">
			<h1 className="text-2xl font-semibold mb-4">Practice</h1>
			{/* Simple entitlement check for M0 */}
			{(() => {
				const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "demo";
				const ent = entitlementsService.get(demoUserId);
				return !ent.practiceAccess ? (
					<p className="mb-3 text-amber-700">
						Access restricted. Complete checkout to unlock practice.
					</p>
				) : null;
			})()}
			<form onSubmit={onSubmit} className="space-y-3">
				<textarea
					value={transcript}
					onChange={(e) => setTranscript(e.target.value)}
					placeholder="Paste your transcript here..."
					className="w-full min-h-[160px] p-3 border rounded"
				/>
				<button
					type="submit"
					disabled={(() => {
						const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "demo";
						const ent = entitlementsService.get(demoUserId);
						return isSubmitting || !transcript.trim() || !ent.practiceAccess;
					})()}
					className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
				>
					{isSubmitting ? "Submitting..." : "Submit"}
				</button>
			</form>
			{error && <p className="text-red-600 mt-3">{error}</p>}
			{result && <ResultsView result={result} />}
		</div>
	);
}
