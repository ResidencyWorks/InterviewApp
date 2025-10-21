"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import type { EvaluationCategories } from "@/types/evaluation";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScoreChip } from "./score-chip";

export interface ScorePopoverProps {
	score: number;
	categories: EvaluationCategories;
	feedback?: string;
	className?: string;
	children?: React.ReactNode;
}

/**
 * ScorePopover component displays a score chip that opens a popover with detailed breakdown
 * @param score - Overall score (0-100)
 * @param categories - Score breakdown by category
 * @param feedback - Detailed feedback text
 * @param className - Additional CSS classes
 * @param children - Custom trigger element
 */
export function ScorePopover({
	score,
	categories,
	feedback,
	className,
	children,
}: ScorePopoverProps) {
	const getCategoryColor = (categoryScore: number) => {
		if (categoryScore >= 90) return "text-green-600";
		if (categoryScore >= 80) return "text-blue-600";
		if (categoryScore >= 70) return "text-yellow-600";
		if (categoryScore >= 60) return "text-orange-600";
		return "text-red-600";
	};

	const getCategoryLabel = (category: keyof EvaluationCategories) => {
		const labels = {
			clarity: "Clarity",
			structure: "Structure",
			content: "Content",
			delivery: "Delivery",
		};
		return labels[category];
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				{children || (
					<button
						type="button"
						className={cn(
							"inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							"disabled:pointer-events-none disabled:opacity-50",
							className,
						)}
						aria-label={`View detailed score breakdown for ${score}%`}
					>
						<ScoreChip score={score} />
					</button>
				)}
			</PopoverTrigger>
			<PopoverContent className="w-80" align="start">
				<div className="space-y-4">
					<div className="space-y-2">
						<h4 className="font-semibold text-sm">Score Breakdown</h4>
						<div className="space-y-2">
							{Object.entries(categories).map(([category, categoryScore]) => (
								<div
									key={category}
									className="flex items-center justify-between"
								>
									<span className="text-sm text-muted-foreground">
										{getCategoryLabel(category as keyof EvaluationCategories)}
									</span>
									<span
										className={cn(
											"text-sm font-medium",
											getCategoryColor(categoryScore),
										)}
									>
										{categoryScore}%
									</span>
								</div>
							))}
						</div>
					</div>

					{feedback && (
						<div className="space-y-2">
							<h4 className="font-semibold text-sm">Feedback</h4>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{feedback}
							</p>
						</div>
					)}

					<div className="pt-2 border-t">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Overall Score</span>
							<ScoreChip score={score} size="sm" />
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
