import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export interface DrillProgress {
	id: string;
	user_id: string;
	drill_id: string;
	current_question_id: string;
	total_questions: number;
	completed_questions: number;
	started_at: string;
	last_activity_at: string;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export function useDrillProgress(drillId: string) {
	const { user } = useAuth();
	const [progress, setProgress] = useState<DrillProgress | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchProgress = useCallback(async () => {
		if (!user || !drillId) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const response = await fetch(
				`/api/drill/progress?drill_id=${encodeURIComponent(drillId)}`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch progress");
			}

			const data = await response.json();
			setProgress(data.progress);
			setError(null);
		} catch (err) {
			console.error("Error fetching drill progress:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch progress");
		} finally {
			setLoading(false);
		}
	}, [user, drillId]);

	const updateProgress = useCallback(
		async (data: {
			current_question_id: string;
			total_questions: number;
			completed_questions: number;
			completed?: boolean;
		}) => {
			if (!user || !drillId) {
				return;
			}

			try {
				const response = await fetch("/api/drill/progress", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						drill_id: drillId,
						...data,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to update progress");
				}

				const result = await response.json();
				setProgress(result.progress);
				setError(null);
			} catch (err) {
				console.error("Error updating drill progress:", err);
				setError(
					err instanceof Error ? err.message : "Failed to update progress",
				);
			}
		},
		[user, drillId],
	);

	useEffect(() => {
		fetchProgress();
	}, [fetchProgress]);

	return {
		progress,
		loading,
		error,
		updateProgress,
		refetch: fetchProgress,
	};
}
