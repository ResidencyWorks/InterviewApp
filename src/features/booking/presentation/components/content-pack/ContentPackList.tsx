"use client";

import {
	AlertTriangle,
	CheckCircle,
	CheckCircle2,
	Clock,
	FileText,
	Pause,
	Play,
	Shield,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentPackStatus } from "@/features/booking/domain/entities/ContentPack";
import { ContentPackViewer } from "./ContentPackViewer";

interface ContentPack {
	id: string;
	version: string;
	name: string;
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

interface ContentPackListProps {
	contentPacks: ContentPack[];
	loading?: boolean;
	onPackUpdated?: () => void;
}

export function ContentPackList({
	contentPacks,
	loading = false,
	onPackUpdated,
}: ContentPackListProps): React.ReactElement {
	const [selectedPack, setSelectedPack] = useState<ContentPack | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	const [isActivating, setIsActivating] = useState(false);
	const [isDeactivating, setIsDeactivating] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [validationResult, setValidationResult] = useState<{
		isValid: boolean;
		errors: Array<{ path: string; message: string }>;
		warnings: Array<{ path: string; message: string }>;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Debug logging to see what props we receive and track changes
	useEffect(() => {
		console.log("ContentPackList: Props changed:", {
			contentPacksLength: contentPacks?.length || 0,
			loading,
			contentPacks: contentPacks,
			firstPack: contentPacks?.[0] || null,
			isArray: Array.isArray(contentPacks),
		});
	}, [contentPacks, loading]);

	const handleViewDetails = (pack: ContentPack) => {
		setSelectedPack(pack);
		setIsDialogOpen(true);
		setValidationResult(null);
		setError(null);
	};

	const handleValidate = async () => {
		if (!selectedPack) return;

		setIsValidating(true);
		setError(null);
		setValidationResult(null);

		try {
			const response = await fetch(
				`/api/content-packs/${selectedPack.id}/validate`,
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Failed to validate content pack");
			}

			const data = await response.json();
			setValidationResult(data.data);

			// Refresh the list
			if (onPackUpdated) {
				onPackUpdated();
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to validate content pack",
			);
		} finally {
			setIsValidating(false);
		}
	};

	const handleActivate = async () => {
		if (!selectedPack) return;

		setIsActivating(true);
		setError(null);

		try {
			const response = await fetch(
				`/api/content-packs/${selectedPack.id}/activate`,
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Failed to activate content pack");
			}

			// Close dialog and refresh
			setIsDialogOpen(false);
			if (onPackUpdated) {
				onPackUpdated();
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to activate content pack",
			);
		} finally {
			setIsActivating(false);
		}
	};

	const handleDeactivate = async () => {
		if (!selectedPack) return;

		setIsDeactivating(true);
		setError(null);

		try {
			const response = await fetch(
				`/api/content-packs/${selectedPack.id}/deactivate`,
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Failed to deactivate content pack");
			}

			// Close dialog and refresh
			setIsDialogOpen(false);
			if (onPackUpdated) {
				onPackUpdated();
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to deactivate content pack",
			);
		} finally {
			setIsDeactivating(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedPack) return;

		if (
			!confirm(
				`Are you sure you want to delete "${selectedPack.name}"? This action cannot be undone.`,
			)
		) {
			return;
		}

		setIsDeleting(true);
		setError(null);

		try {
			const response = await fetch(`/api/content-packs/${selectedPack.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Failed to delete content pack");
			}

			// Close dialog and refresh
			setIsDialogOpen(false);
			if (onPackUpdated) {
				onPackUpdated();
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete content pack",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	const getStatusIcon = (status: ContentPackStatus) => {
		switch (status) {
			case ContentPackStatus.ACTIVATED:
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			case ContentPackStatus.VALID:
				return <CheckCircle className="h-4 w-4 text-blue-600" />;
			case ContentPackStatus.INVALID:
				return <AlertTriangle className="h-4 w-4 text-red-600" />;
			case ContentPackStatus.VALIDATING:
				return <Clock className="h-4 w-4 text-yellow-600" />;
			default:
				return <FileText className="h-4 w-4 text-gray-600" />;
		}
	};

	const getStatusColor = (status: ContentPackStatus) => {
		switch (status) {
			case ContentPackStatus.ACTIVATED:
				return "bg-green-100 text-green-800 border-green-300";
			case ContentPackStatus.VALID:
				return "bg-blue-100 text-blue-800 border-blue-300";
			case ContentPackStatus.INVALID:
				return "bg-red-100 text-red-800 border-red-300";
			case ContentPackStatus.VALIDATING:
				return "bg-yellow-100 text-yellow-800 border-yellow-300";
			default:
				return "bg-gray-100 text-gray-800 border-gray-300";
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	};

	// Ensure contentPacks is always an array
	const packs = Array.isArray(contentPacks) ? contentPacks : [];

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Content Packs</CardTitle>
					<CardDescription>Loading content packs...</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (packs.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Content Packs</CardTitle>
					<CardDescription>No content packs found</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						Upload your first content pack to get started.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			{/* Content Packs List */}
			<Card>
				<CardHeader>
					<CardTitle>Content Packs</CardTitle>
					<CardDescription>
						{packs.length} content pack{packs.length !== 1 ? "s" : ""} found
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{packs.map((pack) => (
							<Card
								key={pack.id}
								className={
									pack.status === ContentPackStatus.ACTIVATED
										? "border-green-200 bg-green-50"
										: ""
								}
							>
								<CardContent className="pt-6">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4 flex-1">
											{getStatusIcon(pack.status)}
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<span className="font-medium text-lg text-green-800">
														{pack.name}
													</span>
													<Badge
														variant="outline"
														className={getStatusColor(pack.status)}
													>
														{pack.status}
													</Badge>
													{pack.status === ContentPackStatus.ACTIVATED && (
														<Badge
															variant="outline"
															className="bg-green-100 text-green-800 border-green-300"
														>
															<Play className="h-3 w-3 mr-1" />
															Active
														</Badge>
													)}
												</div>
												<div className="text-sm text-muted-foreground space-x-4">
													<span>Version {pack.version}</span>
													<span>•</span>
													<span>{formatFileSize(pack.fileSize)}</span>
													<span>•</span>
													<span>Created {formatDate(pack.createdAt)}</span>
												</div>
												{pack.description && (
													<div className="text-sm text-muted-foreground mt-1">
														{pack.description}
													</div>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleViewDetails(pack)}
											>
												View Details
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Content Pack Details Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{selectedPack?.name}</DialogTitle>
						<DialogDescription>
							Content pack details, content, and validation
						</DialogDescription>
					</DialogHeader>

					{selectedPack && (
						<Tabs defaultValue="details" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="details">Details & Validation</TabsTrigger>
								<TabsTrigger value="content">View Content</TabsTrigger>
							</TabsList>

							<TabsContent value="details" className="space-y-4 mt-4">
								{/* Pack Info */}
								<div className="grid grid-cols-2 gap-4">
									<div>
										<div className="text-sm font-medium text-muted-foreground">
											Version
										</div>
										<p className="text-sm">{selectedPack.version}</p>
									</div>
									<div>
										<div className="text-sm font-medium text-muted-foreground">
											Status
										</div>
										<div className="mt-1">
											<Badge
												variant="outline"
												className={getStatusColor(selectedPack.status)}
											>
												{selectedPack.status}
											</Badge>
										</div>
									</div>
									<div>
										<div className="text-sm font-medium text-muted-foreground">
											File Size
										</div>
										<p className="text-sm">
											{formatFileSize(selectedPack.fileSize)}
										</p>
									</div>
									<div>
										<div className="text-sm font-medium text-muted-foreground">
											Created
										</div>
										<p className="text-sm">
											{formatDate(selectedPack.createdAt)}
										</p>
									</div>
									{selectedPack.description && (
										<div className="col-span-2">
											<div className="text-sm font-medium text-muted-foreground">
												Description
											</div>
											<p className="text-sm">{selectedPack.description}</p>
										</div>
									)}
								</div>

								{/* Error Display */}
								{error && (
									<Alert variant="destructive">
										<AlertTriangle className="h-4 w-4" />
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}

								{/* Validation Result */}
								{validationResult && (
									<div className="space-y-2">
										<Alert
											variant={
												validationResult.isValid ? "default" : "destructive"
											}
										>
											{validationResult.isValid ? (
												<CheckCircle2 className="h-4 w-4" />
											) : (
												<AlertTriangle className="h-4 w-4" />
											)}
											<AlertDescription>
												{validationResult.isValid
													? "Content pack is valid"
													: `Validation failed with ${validationResult.errors.length} error(s)`}
											</AlertDescription>
										</Alert>

										{validationResult.errors.length > 0 && (
											<div>
												<div className="text-sm font-medium text-destructive">
													Errors
												</div>
												<ul className="mt-1 space-y-1">
													{validationResult.errors.map((err) => (
														<li
															key={`${err.path}-${err.message}`}
															className="text-sm text-destructive"
														>
															{err.path}: {err.message}
														</li>
													))}
												</ul>
											</div>
										)}

										{validationResult.warnings.length > 0 && (
											<div>
												<div className="text-sm font-medium text-yellow-600">
													Warnings
												</div>
												<ul className="mt-1 space-y-1">
													{validationResult.warnings.map((warn) => (
														<li
															key={`${warn.path}-${warn.message}`}
															className="text-sm text-yellow-600"
														>
															{warn.path}: {warn.message}
														</li>
													))}
												</ul>
											</div>
										)}
									</div>
								)}
							</TabsContent>

							<TabsContent value="content" className="mt-4">
								<ContentPackViewer contentPackId={selectedPack.id} />
							</TabsContent>
						</Tabs>
					)}

					<DialogFooter className="flex justify-between">
						<div className="flex gap-2">
							{selectedPack?.status !== ContentPackStatus.ACTIVATED && (
								<Button
									variant="destructive"
									onClick={handleDelete}
									disabled={
										isValidating || isActivating || isDeactivating || isDeleting
									}
								>
									{isDeleting ? (
										<>
											<Clock className="h-4 w-4 mr-2 animate-spin" />
											Deleting...
										</>
									) : (
										<>
											<Trash2 className="h-4 w-4 mr-2" />
											Delete
										</>
									)}
								</Button>
							)}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => setIsDialogOpen(false)}
								disabled={
									isValidating || isActivating || isDeactivating || isDeleting
								}
							>
								Close
							</Button>
							{(selectedPack?.status === ContentPackStatus.UPLOADED ||
								selectedPack?.status === ContentPackStatus.INVALID) && (
								<Button
									onClick={handleValidate}
									disabled={
										isValidating || isActivating || isDeactivating || isDeleting
									}
								>
									{isValidating ? (
										<>
											<Clock className="h-4 w-4 mr-2 animate-spin" />
											Validating...
										</>
									) : (
										<>
											<Shield className="h-4 w-4 mr-2" />
											Validate
										</>
									)}
								</Button>
							)}
							{selectedPack?.status === ContentPackStatus.VALID && (
								<Button
									onClick={handleActivate}
									disabled={
										isValidating || isActivating || isDeactivating || isDeleting
									}
								>
									{isActivating ? (
										<>
											<Clock className="h-4 w-4 mr-2 animate-spin" />
											Activating...
										</>
									) : (
										<>
											<Play className="h-4 w-4 mr-2" />
											Activate
										</>
									)}
								</Button>
							)}
							{selectedPack?.status === ContentPackStatus.ACTIVATED && (
								<Button
									variant="secondary"
									onClick={handleDeactivate}
									disabled={
										isValidating || isActivating || isDeactivating || isDeleting
									}
								>
									{isDeactivating ? (
										<>
											<Clock className="h-4 w-4 mr-2 animate-spin" />
											Deactivating...
										</>
									) : (
										<>
											<Pause className="h-4 w-4 mr-2" />
											Deactivate
										</>
									)}
								</Button>
							)}
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
