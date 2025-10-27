"use client";

export function AnalysisProgressIndicator({ progress }: { progress: number }) {
	return (
		<div className="w-full">
			<div className="w-full bg-gray-200 h-2 rounded">
				<div
					className="bg-blue-500 h-2 rounded"
					style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
				/>
			</div>
			<div className="text-sm mt-1">{progress}%</div>
		</div>
	);
}
