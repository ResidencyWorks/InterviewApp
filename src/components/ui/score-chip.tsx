"use client";

import { cn } from "@/lib/utils";
import { Badge } from "./badge";

export interface ScoreChipProps {
	score: number;
	className?: string;
	showLabel?: boolean;
	size?: "sm" | "md" | "lg";
}

/**
 * ScoreChip component displays a score with color-coded styling
 * @param score - Score value (0-100)
 * @param className - Additional CSS classes
 * @param showLabel - Whether to show "Score:" label
 * @param size - Size variant
 */
export function ScoreChip({
	score,
	className,
	showLabel = false,
	size = "md",
}: ScoreChipProps) {
	const getScoreColor = (score: number) => {
		if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
		if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
		if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
		if (score >= 60) return "bg-orange-100 text-orange-800 border-orange-200";
		return "bg-red-100 text-red-800 border-red-200";
	};

	const getScoreLabel = (score: number) => {
		if (score >= 90) return "Excellent";
		if (score >= 80) return "Good";
		if (score >= 70) return "Fair";
		if (score >= 60) return "Needs Improvement";
		return "Poor";
	};

	const sizeClasses = {
		sm: "text-xs px-2 py-1",
		md: "text-sm px-3 py-1.5",
		lg: "text-base px-4 py-2",
	};

	return (
		<div className={cn("flex items-center gap-2", className)}>
			{showLabel && (
				<span className="text-sm font-medium text-muted-foreground">
					Score:
				</span>
			)}
			<Badge
				variant="outline"
				className={cn(
					"font-semibold border",
					getScoreColor(score),
					sizeClasses[size],
				)}
				aria-label={`Score: ${score}% (${getScoreLabel(score)})`}
			>
				{score}%
			</Badge>
		</div>
	);
}
