/**
 * Admin Content Packs Page
 *
 * Provides a comprehensive interface for managing content packs including
 * upload, validation, activation, and monitoring.
 */

"use client";

import { Eye, Play, RefreshCw, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ContentPackUpload } from "@/components/content-pack/ContentPackUpload";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentPackStatus } from "@/lib/domain/entities/ContentPack";

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

type ContentPacksPageProps = Record<string, never>;

export default function ContentPacksPage(_props: ContentPacksPageProps) {
	const [contentPacks, setContentPacks] = useState<ContentPack[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("list");

	// Fetch content packs
	const fetchContentPacks = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/content-packs");

			if (!response.ok) {
				throw new Error("Failed to fetch content packs");
			}

			const data = await response.json();
			setContentPacks(data.data);
			setError(null);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to fetch content packs",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchContentPacks();
	}, [fetchContentPacks]);

	const handleUploadComplete = (_contentPackId: string) => {
		// Refresh the list after successful upload
		fetchContentPacks();
		setActiveTab("list");
	};

	const handleUploadError = (error: string) => {
		setError(error);
	};

	const getStatusBadge = (status: ContentPackStatus) => {
		const statusConfig = {
			[ContentPackStatus.UPLOADED]: {
				variant: "secondary" as const,
				label: "Uploaded",
			},
			[ContentPackStatus.VALIDATING]: {
				variant: "default" as const,
				label: "Validating",
			},
			[ContentPackStatus.VALID]: {
				variant: "default" as const,
				label: "Valid",
			},
			[ContentPackStatus.INVALID]: {
				variant: "destructive" as const,
				label: "Invalid",
			},
			[ContentPackStatus.ACTIVATED]: {
				variant: "default" as const,
				label: "Active",
			},
			[ContentPackStatus.ARCHIVED]: {
				variant: "outline" as const,
				label: "Archived",
			},
		};

		const config = statusConfig[status];
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const handleActivate = async (contentPackId: string) => {
		try {
			const response = await fetch(
				`/api/content-packs/${contentPackId}/activate`,
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to activate content pack");
			}

			// Refresh the list
			await fetchContentPacks();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to activate content pack",
			);
		}
	};

	const handleValidate = async (contentPackId: string) => {
		try {
			const response = await fetch(
				`/api/content-packs/${contentPackId}/validate`,
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to validate content pack");
			}

			// Refresh the list
			await fetchContentPacks();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to validate content pack",
			);
		}
	};

	const activeContentPack = contentPacks.find(
		(pack) => pack.status === ContentPackStatus.ACTIVATED,
	);

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Content Packs</h1>
					<p className="text-gray-600">
						Manage and activate content packs for your interview system
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={fetchContentPacks}
						disabled={loading}
					>
						<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-4"
			>
				<TabsList>
					<TabsTrigger value="list">Content Packs</TabsTrigger>
					<TabsTrigger value="upload">Upload New</TabsTrigger>
				</TabsList>

				<TabsContent value="list" className="space-y-4">
					{/* Active Content Pack Status */}
					{activeContentPack && (
						<Card className="border-green-200 bg-green-50">
							<CardHeader>
								<CardTitle className="text-green-800 flex items-center gap-2">
									<Play className="h-5 w-5" />
									Active Content Pack
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="font-medium">{activeContentPack.name}</div>
									<div className="text-sm text-gray-600">
										Version {activeContentPack.version} • Activated{" "}
										{activeContentPack.activatedAt
											? formatDate(activeContentPack.activatedAt)
											: "Unknown"}
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Content Packs List */}
					<Card>
						<CardHeader>
							<CardTitle>All Content Packs</CardTitle>
							<CardDescription>
								{contentPacks.length} content pack
								{contentPacks.length === 1 ? "" : "s"} found
							</CardDescription>
						</CardHeader>
						<CardContent>
							{loading ? (
								<div className="flex items-center justify-center py-8">
									<RefreshCw className="h-6 w-6 animate-spin" />
									<span className="ml-2">Loading content packs...</span>
								</div>
							) : contentPacks.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
									<p>No content packs found</p>
									<p className="text-sm">
										Upload your first content pack to get started
									</p>
								</div>
							) : (
								<div className="space-y-4">
									{contentPacks.map((pack) => (
										<Card
											key={pack.id}
											className="border-l-4 border-l-blue-500"
										>
											<CardContent className="pt-4">
												<div className="flex items-center justify-between">
													<div className="space-y-1">
														<div className="flex items-center gap-2">
															<h3 className="font-medium">{pack.name}</h3>
															{getStatusBadge(pack.status)}
														</div>
														<p className="text-sm text-gray-600">
															Version {pack.version} •{" "}
															{formatFileSize(pack.fileSize)} • Uploaded{" "}
															{formatDate(pack.createdAt)}
														</p>
														{pack.description && (
															<p className="text-sm text-gray-500">
																{pack.description}
															</p>
														)}
													</div>
													<div className="flex gap-2">
														{pack.status === ContentPackStatus.VALID && (
															<Button
																size="sm"
																onClick={() => handleActivate(pack.id)}
															>
																<Play className="h-4 w-4 mr-1" />
																Activate
															</Button>
														)}
														{pack.status === ContentPackStatus.UPLOADED && (
															<Button
																size="sm"
																variant="outline"
																onClick={() => handleValidate(pack.id)}
															>
																<Eye className="h-4 w-4 mr-1" />
																Validate
															</Button>
														)}
														<Button size="sm" variant="outline">
															<Eye className="h-4 w-4" />
														</Button>
													</div>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="upload">
					<ContentPackUpload
						onUploadComplete={handleUploadComplete}
						onUploadError={handleUploadError}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
