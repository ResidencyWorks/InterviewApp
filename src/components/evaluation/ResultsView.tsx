"use client";
import type { IEvaluationResult } from "@/domain/evaluation/evaluation-schema";

interface Props {
	result: IEvaluationResult;
}

export default function ResultsView({ result }: Props): React.ReactElement {
	return (
		<div className="mt-6 space-y-6">
			<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
				<h2 className="text-2xl font-bold text-blue-900 dark:text-blue-300">
					{result.overall_score}%
				</h2>
				<p className="text-sm text-blue-700 dark:text-blue-300">
					Overall Score
				</p>
			</div>

			<div className="grid grid-cols-3 gap-2 text-sm">
				<div className="bg-muted p-3 rounded">
					<p className="text-muted-foreground">Duration</p>
					<p className="font-semibold text-foreground">{result.duration_s}s</p>
				</div>
				<div className="bg-muted p-3 rounded">
					<p className="text-muted-foreground">Words</p>
					<p className="font-semibold text-foreground">{result.words}</p>
				</div>
				<div className="bg-muted p-3 rounded">
					<p className="text-muted-foreground">WPM</p>
					<p className="font-semibold text-foreground">{result.wpm}</p>
				</div>
			</div>

			<div>
				<h3 className="font-semibold text-lg mb-3">Category Feedback</h3>
				<div className="space-y-2">
					{result.category_chips.map((chip) => (
						<div
							key={chip.id}
							className={`p-3 rounded border-l-4 ${
								chip.passFlag === "PASS"
									? "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600"
									: "bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600"
							}`}
						>
							<div className="flex items-start justify-between">
								<div>
									<p className="font-medium text-foreground">{chip.name}</p>
									<p className="text-sm text-muted-foreground">{chip.note}</p>
								</div>
								<span
									className={`text-xs font-bold px-2 py-1 rounded ${
										chip.passFlag === "PASS"
											? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
											: "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
									}`}
								>
									{chip.passFlag}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{result.what_changed.length > 0 && (
				<div>
					<h3 className="font-semibold text-lg mb-2 text-foreground">
						What to Practice
					</h3>
					<ul className="list-disc list-inside space-y-1">
						{result.what_changed.map((item) => (
							<li key={item} className="text-foreground">
								{item}
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
				<p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
					Next Practice:
				</p>
				<p className="text-foreground">{result.practice_rule}</p>
			</div>
		</div>
	);
}
