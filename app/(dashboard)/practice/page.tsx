"use client";
import { useEffect, useState } from "react";
import ResultsView from "@/components/evaluation/ResultsView";
import {
	initializeAnalytics,
	trackDrillStarted,
	trackDrillSubmitted,
	trackScoreReturned,
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
	const [sessionId] = useState(() => Math.random().toString(36).slice(2, 11));

	// Fire drill_started on first render and initialize analytics
	useEffect(() => {
		initializeAnalytics();
		const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "demo";
		trackDrillStarted({ userId: demoUserId, sessionId });
	}, [sessionId]);

	async function onSubmit(e: React.FormEvent): Promise<void> {
		e.preventDefault();
		setSubmitting(true);
		setError(undefined);

		const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "demo";
		const context = { userId: demoUserId, sessionId };

		trackDrillSubmitted({ wordCount: transcript.split(/\s+/).length }, context);

		try {
			const res = await fetch("/api/evaluate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ transcript }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error ?? "Request failed");
			setResult(json);

			// Track score_returned with ResidencyWorks contract payload
			trackScoreReturned(
				{
					duration_s: json.duration_s ?? 0,
					overallScore: json.overall_score ?? 0,
					wpm: json.wpm ?? 0,
				},
				context,
			);
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
					<div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded">
						Access restricted. Complete checkout to unlock practice.
					</div>
				) : null;
			})()}
			<form onSubmit={onSubmit} className="space-y-4">
				<div className="space-y-2">
					<label
						htmlFor="transcript"
						className="block text-sm font-medium text-gray-700"
					>
						Your Response
					</label>
					<textarea
						id={`transcript-${Math.random().toString(36).slice(2, 11)}`}
						value={transcript}
						onChange={(e) => setTranscript(e.target.value)}
						placeholder="Paste your transcript here..."
						disabled={isSubmitting}
						className="w-full min-h-[160px] p-3 border rounded disabled:bg-gray-50 disabled:opacity-75"
					/>
					<p className="text-xs text-gray-500">
						{transcript.length} characters •{" "}
						{transcript.split(/\s+/).filter((w) => w.length > 0).length} words
					</p>
				</div>

				<button
					type="submit"
					disabled={(() => {
						const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "demo";
						const ent = entitlementsService.get(demoUserId);
						return isSubmitting || !transcript.trim() || !ent.practiceAccess;
					})()}
					className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
				>
					{isSubmitting ? (
						<>
							<svg
								className="animate-spin h-4 w-4"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								aria-label="Loading spinner"
							>
								<title>Loading spinner</title>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							Evaluating...
						</>
					) : (
						"Submit Response"
					)}
				</button>
			</form>

			{/* Error state */}
			{error && (
				<div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
					<p className="font-semibold text-red-900">Evaluation Error</p>
					<p className="text-red-700 text-sm mt-1">{error}</p>
					<button
						type="button"
						onClick={() => setError(undefined)}
						className="mt-3 text-sm text-red-600 underline hover:text-red-800"
					>
						Dismiss
					</button>
				</div>
			)}

			{/* Loading state (while evaluating) */}
			{isSubmitting && (
				<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
					<div className="flex items-center gap-2">
						<svg
							className="animate-spin h-4 w-4 text-blue-600"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							aria-label="Evaluating spinner"
						>
							<title>Evaluating spinner</title>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						<span className="text-sm text-blue-700 font-medium">
							Evaluating your response...
						</span>
					</div>
				</div>
			)}

			{/* Results */}
			{result && !isSubmitting && <ResultsView result={result} />}
		</div>
	);
}
