"use client";
import type { IEvaluationResult } from "@/lib/evaluation/evaluation-schema";

interface Props {
	result: IEvaluationResult;
}

export default function ResultsView({ result }: Props): React.ReactElement {
	return (
		<div className="mt-6 space-y-2">
			<h2 className="text-xl font-medium">Results</h2>
			<p>Total Score: {result.totalScore}</p>
			<div className="grid grid-cols-2 gap-2">
				{result.categories.map((c) => (
					<div key={c.category} className="border rounded p-2">
						<span className="font-medium">{c.category}</span>: {c.score}
					</div>
				))}
			</div>
			<div>
				<h3 className="font-medium">Summary</h3>
				<ul className="list-disc list-inside">
					{result.summary.bullets.map((b) => (
						<li key={b}>{b}</li>
					))}
				</ul>
				<p className="italic">Practice Rule: {result.summary.practiceRule}</p>
			</div>
		</div>
	);
}
