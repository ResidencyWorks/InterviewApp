"use client";

import { AlertTriangle, CheckCircle, RefreshCw, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface FallbackWarningProps {
	/**
	 * Whether the system is currently using fallback content
	 */
	isUsingFallback: boolean;

	/**
	 * Whether the warning has been dismissed by the user
	 */
	isDismissed: boolean;

	/**
	 * Callback when the user dismisses the warning
	 */
	onDismiss: () => void;

	/**
	 * Callback when the user wants to refresh/check for content packs
	 */
	onRefresh?: () => void;

	/**
	 * Additional className for styling
	 */
	className?: string;

	/**
	 * Whether to show as a compact version
	 */
	compact?: boolean;
}

export function FallbackWarning({
	isUsingFallback,
	isDismissed,
	onDismiss,
	onRefresh,
	className,
	compact = false,
}: FallbackWarningProps) {
	const [isVisible, setIsVisible] = useState(false);

	// Show warning if using fallback and not dismissed
	useEffect(() => {
		setIsVisible(isUsingFallback && !isDismissed);
	}, [isUsingFallback, isDismissed]);

	const handleDismiss = useCallback(() => {
		onDismiss();
		setIsVisible(false);
	}, [onDismiss]);

	const handleRefresh = useCallback(() => {
		if (onRefresh) {
			onRefresh();
		}
	}, [onRefresh]);

	// Don't render if not visible
	if (!isVisible) {
		return null;
	}

	if (compact) {
		return (
			<Alert variant="destructive" className={className}>
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription className="flex items-center justify-between">
					<span>No content pack loaded - using fallback content</span>
					<div className="flex gap-2">
						{onRefresh && (
							<Button
								size="sm"
								variant="outline"
								onClick={handleRefresh}
								className="h-6 px-2"
							>
								<RefreshCw className="h-3 w-3 mr-1" />
								Refresh
							</Button>
						)}
						<Button
							size="sm"
							variant="ghost"
							onClick={handleDismiss}
							className="h-6 px-2"
						>
							<X className="h-3 w-3" />
						</Button>
					</div>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<Card className={`border-orange-200 bg-orange-50 ${className}`}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-orange-600" />
						<CardTitle className="text-orange-800">
							Fallback Content Active
						</CardTitle>
						<Badge
							variant="outline"
							className="text-orange-700 border-orange-300"
						>
							Warning
						</Badge>
					</div>
					<Button
						size="sm"
						variant="ghost"
						onClick={handleDismiss}
						className="text-orange-600 hover:text-orange-800"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<CardDescription className="text-orange-700">
					The system is currently using fallback content because no valid
					content pack is loaded. Some features may be limited or unavailable.
				</CardDescription>

				<div className="space-y-3">
					<div className="text-sm text-orange-700">
						<strong>What this means:</strong>
						<ul className="mt-1 ml-4 list-disc space-y-1">
							<li>Default evaluation content is being displayed</li>
							<li>Full system functionality may be limited</li>
							<li>Custom content and configurations are not available</li>
						</ul>
					</div>

					<div className="text-sm text-orange-700">
						<strong>To resolve this:</strong>
						<ul className="mt-1 ml-4 list-disc space-y-1">
							<li>Upload a valid content pack through the admin panel</li>
							<li>Ensure the content pack is properly validated</li>
							<li>Activate the content pack once validation is complete</li>
						</ul>
					</div>
				</div>

				<div className="flex gap-2 pt-2">
					{onRefresh && (
						<Button
							size="sm"
							variant="outline"
							onClick={handleRefresh}
							className="border-orange-300 text-orange-700 hover:bg-orange-100"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Check for Content Packs
						</Button>
					)}
					<Button
						size="sm"
						variant="ghost"
						onClick={handleDismiss}
						className="text-orange-600 hover:text-orange-800"
					>
						Dismiss Warning
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Success component shown when a content pack is successfully loaded
 */
interface ContentPackLoadedProps {
	/**
	 * Name of the loaded content pack
	 */
	contentPackName: string;

	/**
	 * Version of the loaded content pack
	 */
	contentPackVersion: string;

	/**
	 * Callback when the user dismisses the success message
	 */
	onDismiss: () => void;

	/**
	 * Additional className for styling
	 */
	className?: string;
}

export function ContentPackLoaded({
	contentPackName,
	contentPackVersion,
	onDismiss,
	className,
}: ContentPackLoadedProps) {
	const [isVisible, setIsVisible] = useState(true);

	const handleDismiss = useCallback(() => {
		onDismiss();
		setIsVisible(false);
	}, [onDismiss]);

	// Auto-dismiss after 5 seconds
	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVisible(false);
		}, 5000);

		return () => clearTimeout(timer);
	}, []);

	if (!isVisible) {
		return null;
	}

	return (
		<Card className={`border-green-200 bg-green-50 ${className}`}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CheckCircle className="h-5 w-5 text-green-600" />
						<CardTitle className="text-green-800">
							Content Pack Loaded
						</CardTitle>
						<Badge
							variant="outline"
							className="text-green-700 border-green-300"
						>
							Success
						</Badge>
					</div>
					<Button
						size="sm"
						variant="ghost"
						onClick={handleDismiss}
						className="text-green-600 hover:text-green-800"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<CardDescription className="text-green-700">
					Successfully loaded content pack: <strong>{contentPackName}</strong>{" "}
					(v{contentPackVersion})
				</CardDescription>
			</CardContent>
		</Card>
	);
}

/**
 * System status indicator component
 */
interface SystemStatusIndicatorProps {
	/**
	 * Whether the system is using fallback content
	 */
	isUsingFallback: boolean;

	/**
	 * Whether the warning is dismissed
	 */
	isDismissed: boolean;

	/**
	 * Callback when clicked
	 */
	onClick?: () => void;

	/**
	 * Additional className for styling
	 */
	className?: string;
}

export function SystemStatusIndicator({
	isUsingFallback,
	isDismissed,
	onClick,
	className,
}: SystemStatusIndicatorProps) {
	const getStatusInfo = () => {
		if (isUsingFallback && !isDismissed) {
			return {
				icon: AlertTriangle,
				text: "Fallback Active",
				variant: "destructive" as const,
				color: "text-red-600",
			};
		} else if (isUsingFallback && isDismissed) {
			return {
				icon: AlertTriangle,
				text: "Fallback (Dismissed)",
				variant: "secondary" as const,
				color: "text-orange-600",
			};
		} else {
			return {
				icon: CheckCircle,
				text: "Content Pack Active",
				variant: "default" as const,
				color: "text-green-600",
			};
		}
	};

	const statusInfo = getStatusInfo();
	const Icon = statusInfo.icon;

	return (
		<Badge
			variant={statusInfo.variant}
			className={`cursor-pointer ${className}`}
			onClick={onClick}
		>
			<Icon className={`h-3 w-3 mr-1 ${statusInfo.color}`} />
			{statusInfo.text}
		</Badge>
	);
}
