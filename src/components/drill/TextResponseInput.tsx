"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface TextResponseInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	minLength?: number;
	maxLength?: number;
	showCharacterCount?: boolean;
}

/**
 * TextResponseInput component for written responses
 * @param value - Current text value
 * @param onChange - Callback when text changes
 * @param placeholder - Placeholder text
 * @param className - Additional CSS classes
 * @param disabled - Whether the input is disabled
 * @param minLength - Minimum character length
 * @param maxLength - Maximum character length
 * @param showCharacterCount - Whether to show character count
 */
export function TextResponseInput({
	value,
	onChange,
	placeholder = "Type your response here...",
	className,
	disabled = false,
	minLength = 10,
	maxLength = 2000,
	showCharacterCount = true,
}: TextResponseInputProps) {
	const [wordCount, setWordCount] = React.useState(0);
	const responseTextId = `response-text-${Math.random().toString(36).substr(2, 9)}`;
	const responseHelpId = `response-help-${Math.random().toString(36).substr(2, 9)}`;

	React.useEffect(() => {
		const words = value
			.trim()
			.split(/\s+/)
			.filter((word) => word.length > 0);
		setWordCount(words.length);
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newValue = e.target.value;
		if (newValue.length <= maxLength) {
			onChange(newValue);
		}
	};

	const getCharacterCountColor = () => {
		const percentage = (value.length / maxLength) * 100;
		if (percentage >= 90) return "text-red-600";
		if (percentage >= 75) return "text-orange-600";
		return "text-muted-foreground";
	};

	return (
		<div className={cn("space-y-2", className)}>
			<Label htmlFor="response-text" className="text-sm font-medium">
				Your Response
			</Label>
			<Textarea
				id={responseTextId}
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				disabled={disabled}
				minLength={minLength}
				maxLength={maxLength}
				className="min-h-[200px] resize-y"
				aria-describedby="response-help"
			/>

			{showCharacterCount && (
				<div className="flex justify-between items-center text-xs text-muted-foreground">
					<div id={responseHelpId}>Minimum {minLength} characters required</div>
					<div className={cn("font-medium", getCharacterCountColor())}>
						{value.length}/{maxLength} characters • {wordCount} words
					</div>
				</div>
			)}

			{value.length < minLength && value.length > 0 && (
				<p className="text-xs text-orange-600">
					Please provide at least {minLength} characters for a meaningful
					response.
				</p>
			)}
		</div>
	);
}
