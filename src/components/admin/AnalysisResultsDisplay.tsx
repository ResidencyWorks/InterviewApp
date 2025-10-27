"use client";

type Props = {
	totalFiles: number;
	totalDirectories: number;
	duplications: number;
	inconsistencies: number;
};

export function AnalysisResultsDisplay(props: Props) {
	const { totalFiles, totalDirectories, duplications, inconsistencies } = props;
	return (
		<div className="grid grid-cols-2 gap-4">
			<div>Total Files: {totalFiles}</div>
			<div>Total Directories: {totalDirectories}</div>
			<div>Duplications: {duplications}</div>
			<div>Inconsistencies: {inconsistencies}</div>
		</div>
	);
}
