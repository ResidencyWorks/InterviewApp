/**
 * ContentPackActivation Component
 *
 * Provides interface for activating content packs with confirmation dialogs,
 * status tracking, and error handling.
 */

"use client";

import {
	AlertCircle,
	CheckCircle,
	Loader2,
	Play,
	RotateCcw,
} from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ContentPackStatus } from "@/lib/domain/entities/ContentPack";

interface ContentPack {
	id: string;
	name: string;
	version: string;
	description?: string;
	status: ContentPackStatus;
	createdAt: string;
	updatedAt: string;
	activatedAt?: string;
	activatedBy?: string;
	uploadedBy: string;
	fileSize: number;
	checksum: string;
}

interface ActivationStatus {
	status: "idle" | "activating" | "deactivating" | "completed" | "failed";
	error?: string;
	message?: string;
}

interface ContentPackActivationProps {
	contentPack: ContentPack;
	onActivationComplete?: (contentPack: ContentPack) => void;
	onDeactivationComplete?: () => void;
	className?: string;
}

/**
 * ContentPackActivation component for managing content pack activation
 */
export function ContentPackActivation({
	contentPack,
	onActivationComplete,
	onDeactivationComplete,
	className,
}: ContentPackActivationProps): React.JSX.Element {
	const [activationStatus, setActivationStatus] = useState<ActivationStatus>({
		status: "idle",
	});
	const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
	const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);

	/**
	 * Handle content pack activation
	 */
	const handleActivate = useCallback(async () => {
		setActivationStatus({ status: "activating" });

		try {
			const response = await fetch(
				`/api/content-packs/${contentPack.id}/activate`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Failed to activate content pack");
			}

			setActivationStatus({
				status: "completed",
				message: "Content pack activated successfully",
			});

			// Call completion callback
			if (onActivationComplete) {
				onActivationComplete({
					...contentPack,
					status: ContentPackStatus.ACTIVATED,
					activatedAt: new Date().toISOString(),
				});
			}

			// Close dialog after a short delay
			setTimeout(() => {
				setIsActivateDialogOpen(false);
				setActivationStatus({ status: "idle" });
			}, 1500);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			setActivationStatus({
				status: "failed",
				error: errorMessage,
			});
		}
	}, [contentPack, onActivationComplete]);

	/**
	 * Handle content pack deactivation
	 */
	const handleDeactivate = useCallback(async () => {
		setActivationStatus({ status: "deactivating" });

		try {
			const response = await fetch("/api/content-packs/active", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Failed to deactivate content pack");
			}

			setActivationStatus({
				status: "completed",
				message: "Content pack deactivated successfully",
			});

			// Call completion callback
			if (onDeactivationComplete) {
				onDeactivationComplete();
			}

			// Close dialog after a short delay
			setTimeout(() => {
				setIsDeactivateDialogOpen(false);
				setActivationStatus({ status: "idle" });
			}, 1500);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			setActivationStatus({
				status: "failed",
				error: errorMessage,
			});
		}
	}, [onDeactivationComplete]);

	/**
	 * Get status badge variant
	 */
	const getStatusBadgeVariant = (status: ContentPack["status"]) => {
		switch (status) {
			case "activated":
				return "default";
			case "valid":
				return "secondary";
			case "invalid":
				return "destructive";
			case "validating":
				return "outline";
			default:
				return "outline";
		}
	};

	/**
	 * Format file size
	 */
	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	/**
	 * Format date
	 */
	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const isActivated = contentPack.status === ContentPackStatus.ACTIVATED;
	const canActivate = contentPack.status === ContentPackStatus.VALID;
	const isLoading =
		activationStatus.status === "activating" ||
		activationStatus.status === "deactivating";

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{contentPack.name}
							<Badge variant={getStatusBadgeVariant(contentPack.status)}>
								{contentPack.status}
							</Badge>
						</CardTitle>
						<CardDescription>
							Version {contentPack.version} •{" "}
							{formatFileSize(contentPack.fileSize)}
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{contentPack.description && (
					<p className="text-sm text-muted-foreground">
						{contentPack.description}
					</p>
				)}

				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span className="font-medium">Created:</span>
						<br />
						<span className="text-muted-foreground">
							{formatDate(contentPack.createdAt)}
						</span>
					</div>
					{contentPack.activatedAt && (
						<div>
							<span className="font-medium">Activated:</span>
							<br />
							<span className="text-muted-foreground">
								{formatDate(contentPack.activatedAt)}
							</span>
						</div>
					)}
				</div>

				{/* Activation Status Messages */}
				{activationStatus.status === "completed" &&
					activationStatus.message && (
						<Alert>
							<CheckCircle className="h-4 w-4" />
							<AlertDescription>{activationStatus.message}</AlertDescription>
						</Alert>
					)}

				{activationStatus.status === "failed" && activationStatus.error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{activationStatus.error}</AlertDescription>
					</Alert>
				)}

				{/* Action Buttons */}
				<div className="flex gap-2">
					{isActivated ? (
						<Dialog
							open={isDeactivateDialogOpen}
							onOpenChange={setIsDeactivateDialogOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline" disabled={isLoading}>
									<RotateCcw className="mr-2 h-4 w-4" />
									Deactivate
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Deactivate Content Pack</DialogTitle>
									<DialogDescription>
										Are you sure you want to deactivate "{contentPack.name}"?
										This will remove it from active use and may affect the
										evaluation system.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => setIsDeactivateDialogOpen(false)}
										disabled={isLoading}
									>
										Cancel
									</Button>
									<Button
										variant="destructive"
										onClick={handleDeactivate}
										disabled={isLoading}
									>
										{isLoading ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Deactivating...
											</>
										) : (
											"Deactivate"
										)}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					) : (
						<Dialog
							open={isActivateDialogOpen}
							onOpenChange={setIsActivateDialogOpen}
						>
							<DialogTrigger asChild>
								<Button variant="default" disabled={!canActivate || isLoading}>
									<Play className="mr-2 h-4 w-4" />
									Activate
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Activate Content Pack</DialogTitle>
									<DialogDescription>
										Are you sure you want to activate "{contentPack.name}"? This
										will make it the active content pack and may deactivate any
										currently active pack.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => setIsActivateDialogOpen(false)}
										disabled={isLoading}
									>
										Cancel
									</Button>
									<Button onClick={handleActivate} disabled={isLoading}>
										{isLoading ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Activating...
											</>
										) : (
											"Activate"
										)}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					)}
				</div>

				{!canActivate && contentPack.status !== "activated" && (
					<p className="text-sm text-muted-foreground">
						Content pack must be validated before activation
					</p>
				)}
			</CardContent>
		</Card>
	);
}
