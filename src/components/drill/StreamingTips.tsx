"use client";

import { cn } from "@shared/utils";
import * as React from "react";

interface StreamingTipsProps {
	tips: string[];
	rotationInterval?: number; // milliseconds, default 3000 (3s)
	className?: string;
}

/**
 * StreamingTips - Displays rotating tips during evaluation
 * Requirements:
 * - Tips appear ≤1s after submission
 * - Rotate every 2-4s (configurable)
 * - Smooth transitions
 */
export function StreamingTips({
	tips,
	rotationInterval = 3000,
	className,
}: StreamingTipsProps) {
	const [currentIndex, setCurrentIndex] = React.useState(0);

	// Rotate tips when we have more than one
	React.useEffect(() => {
		if (tips.length <= 1) return;

		const rotateTimer = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % tips.length);
		}, rotationInterval);

		return () => clearInterval(rotateTimer);
	}, [tips.length, rotationInterval]);

	// Reset index when tips array changes
	React.useEffect(() => {
		if (currentIndex >= tips.length && tips.length > 0) {
			setCurrentIndex(0);
		}
	}, [tips.length, currentIndex]);

	if (tips.length === 0) {
		return null;
	}

	return (
		<div
			className={cn(
				"min-h-[2rem] text-sm text-muted-foreground transition-opacity duration-500",
				className,
			)}
		>
			<p
				key={currentIndex}
				className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
			>
				💡 {tips[currentIndex]}
			</p>
		</div>
	);
}
