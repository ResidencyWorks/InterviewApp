"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "../../shared/utils";

export type ProgressState = "processing" | "evaluating" | "complete" | "error";

interface ProgressPillProps {
	state: ProgressState;
	className?: string;
}

const stateConfig: Record<
	ProgressState,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		showSpinner: boolean;
	}
> = {
	processing: {
		label: "Processing...",
		variant: "secondary",
		showSpinner: true,
	},
	evaluating: {
		label: "Evaluating...",
		variant: "default",
		showSpinner: true,
	},
	complete: {
		label: "Complete",
		variant: "outline",
		showSpinner: false,
	},
	error: {
		label: "Error",
		variant: "destructive",
		showSpinner: false,
	},
};

/**
 * ProgressPill - Shows evaluation progress state
 * Requirement: Appears ≤500ms after submission
 * Displays state transitions: processing → evaluating → complete
 */
export function ProgressPill({ state, className }: ProgressPillProps) {
	const config = stateConfig[state];

	return (
		<Badge
			variant={config.variant}
			className={cn(
				"flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all duration-300",
				className,
			)}
		>
			{config.showSpinner && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
			{config.label}
		</Badge>
	);
}
