/**
 * UploadProgress Component
 *
 * Displays real-time upload progress with status updates
 * and progress bar for content pack uploads.
 */

"use client";

import { AlertCircle, CheckCircle, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UploadProgressProps {
	status: "uploading" | "validating" | "completed" | "failed";
	progress: number;
	uploadId?: string;
	className?: string;
}

export function UploadProgress({
	status,
	progress,
	uploadId,
	className = "",
}: UploadProgressProps) {
	const [displayProgress, setDisplayProgress] = useState(0);

	// Animate progress bar
	useEffect(() => {
		const timer = setTimeout(() => {
			setDisplayProgress(progress);
		}, 100);

		return () => clearTimeout(timer);
	}, [progress]);

	const getStatusIcon = () => {
		switch (status) {
			case "uploading":
				return <Upload className="h-4 w-4 animate-pulse" />;
			case "validating":
				return <Loader2 className="h-4 w-4 animate-spin" />;
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "failed":
				return <AlertCircle className="h-4 w-4 text-red-500" />;
			default:
				return <Upload className="h-4 w-4" />;
		}
	};

	const getStatusText = () => {
		switch (status) {
			case "uploading":
				return "Uploading file...";
			case "validating":
				return "Validating content pack...";
			case "completed":
				return "Upload completed successfully";
			case "failed":
				return "Upload failed";
			default:
				return "Processing...";
		}
	};

	const _getStatusColor = () => {
		switch (status) {
			case "uploading":
				return "bg-blue-500";
			case "validating":
				return "bg-yellow-500";
			case "completed":
				return "bg-green-500";
			case "failed":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	const _getProgressColor = () => {
		switch (status) {
			case "uploading":
				return "bg-blue-500";
			case "validating":
				return "bg-yellow-500";
			case "completed":
				return "bg-green-500";
			case "failed":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{getStatusIcon()}
						<CardTitle className="text-sm">{getStatusText()}</CardTitle>
					</div>
					<Badge variant="outline" className="text-xs">
						{displayProgress}%
					</Badge>
				</div>
				{uploadId && (
					<CardDescription className="text-xs">
						Upload ID: {uploadId}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-2">
					<Progress value={displayProgress} className="h-2" />
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>
							{status === "uploading" && "Uploading file to server..."}
							{status === "validating" &&
								"Validating content pack structure..."}
							{status === "completed" && "Ready for activation"}
							{status === "failed" && "Please check the error message above"}
						</span>
						<span>{displayProgress}%</span>
					</div>
				</div>

				{/* Status-specific information */}
				{status === "validating" && (
					<div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
						<div className="flex items-center gap-1">
							<Loader2 className="h-3 w-3 animate-spin" />
							<span>This may take a few moments for large files...</span>
						</div>
					</div>
				)}

				{status === "completed" && (
					<div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300">
						<div className="flex items-center gap-1">
							<CheckCircle className="h-3 w-3" />
							<span>Content pack is ready to be activated</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
