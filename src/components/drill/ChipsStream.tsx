"use client";

import { cn } from "@shared/utils";
import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface Chip {
	id: string;
	label: string;
	variant?: "default" | "secondary" | "destructive" | "outline";
}

interface ChipsStreamProps {
	chips: Chip[];
	className?: string;
	onChipClick?: (chip: Chip) => void;
}

/**
 * ChipsStream - Displays chips progressively as they stream in
 * Requirements:
 * - First chip appears ≤6s on mobile
 * - Chips stream in progressively
 * - Smooth animations
 */
export function ChipsStream({
	chips,
	className,
	onChipClick,
}: ChipsStreamProps) {
	const [visibleChips, setVisibleChips] = React.useState<Chip[]>([]);

	// Stream chips in progressively
	React.useEffect(() => {
		if (chips.length === 0) {
			setVisibleChips([]);
			return;
		}

		// Show first chip immediately
		setVisibleChips([chips[0]]);

		// Stream in remaining chips with delay
		const timers: NodeJS.Timeout[] = [];
		chips.slice(1).forEach((chip, index) => {
			const timer = setTimeout(
				() => {
					setVisibleChips((prev) => [...prev, chip]);
				},
				// Stagger by 200ms each
				(index + 1) * 200,
			);
			timers.push(timer);
		});

		return () => {
			for (const timer of timers) {
				clearTimeout(timer);
			}
		};
	}, [chips]);

	if (visibleChips.length === 0) {
		return null;
	}

	return (
		<div className={cn("flex flex-wrap gap-2", className)}>
			{visibleChips.map((chip, index) => (
				<Badge
					key={chip.id}
					variant={chip.variant || "secondary"}
					className={cn(
						"cursor-pointer transition-all hover:scale-105",
						"animate-in fade-in-0 slide-in-from-left-2 duration-300",
					)}
					style={{
						animationDelay: `${index * 50}ms`,
					}}
					onClick={() => onChipClick?.(chip)}
				>
					{chip.label}
				</Badge>
			))}
		</div>
	);
}
