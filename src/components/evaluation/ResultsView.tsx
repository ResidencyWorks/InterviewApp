"use client";
import type { IEvaluationResult } from "@/domain/evaluation/evaluation-schema";

interface Props {
	result: IEvaluationResult;
}

export default function ResultsView({ result }: Props): React.ReactElement {
	return (
		<div className="mt-6 space-y-6">
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<h2 className="text-2xl font-bold text-blue-900">
					{result.overall_score}%
				</h2>
				<p className="text-sm text-blue-700">Overall Score</p>
			</div>

			<div className="grid grid-cols-3 gap-2 text-sm">
				<div className="bg-gray-50 p-3 rounded">
					<p className="text-gray-600">Duration</p>
					<p className="font-semibold">{result.duration_s}s</p>
				</div>
				<div className="bg-gray-50 p-3 rounded">
					<p className="text-gray-600">Words</p>
					<p className="font-semibold">{result.words}</p>
				</div>
				<div className="bg-gray-50 p-3 rounded">
					<p className="text-gray-600">WPM</p>
					<p className="font-semibold">{result.wpm}</p>
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
									? "bg-green-50 border-green-400"
									: "bg-amber-50 border-amber-400"
							}`}
						>
							<div className="flex items-start justify-between">
								<div>
									<p className="font-medium">{chip.name}</p>
									<p className="text-sm text-gray-600">{chip.note}</p>
								</div>
								<span
									className={`text-xs font-bold px-2 py-1 rounded ${
										chip.passFlag === "PASS"
											? "bg-green-200 text-green-800"
											: "bg-amber-200 text-amber-800"
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
					<h3 className="font-semibold text-lg mb-2">What to Practice</h3>
					<ul className="list-disc list-inside space-y-1">
						{result.what_changed.map((item) => (
							<li key={item} className="text-gray-700">
								{item}
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="bg-blue-50 p-3 rounded">
				<p className="text-sm font-semibold text-blue-900">Next Practice:</p>
				<p className="text-gray-700">{result.practice_rule}</p>
			</div>
		</div>
	);
}
