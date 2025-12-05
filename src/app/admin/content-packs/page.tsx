/**
 * Admin Content Packs Page
 *
 * Provides a comprehensive interface for managing content packs including
 * upload, validation, activation, and monitoring.
 */

"use client";

import { ArrowLeft, CheckCircle, Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentPackStatus } from "@/features/booking/domain/entities/ContentPack";
import { ContentPackList } from "@/features/booking/presentation/components/content-pack/ContentPackList";
import { ContentPackUpload } from "@/features/booking/presentation/components/content-pack/ContentPackUpload";

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
	const [uploadSuccessMessage, setUploadSuccessMessage] = useState<
		string | null
	>(null);

	// Fetch content packs
	const fetchContentPacks = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/content-packs");

			// Handle authentication errors
			if (response.status === 401) {
				console.error("ContentPacksPage: Unauthorized - redirecting to login");
				window.location.href = "/login";
				return;
			}

			if (response.status === 403) {
				setError(
					"You don't have permission to view content packs. Admin access required.",
				);
				setLoading(false);
				return;
			}

			if (!response.ok) {
				throw new Error("Failed to fetch content packs");
			}

			const data = await response.json();
			console.log("ContentPacksPage: Received data:", {
				hasData: !!data.data,
				dataLength: data.data?.length || 0,
				firstItem: data.data?.[0] || null,
				firstItemKeys: data.data?.[0] ? Object.keys(data.data[0]) : [],
				dataType: Array.isArray(data.data) ? "array" : typeof data.data,
			});

			// Ensure we have an array
			const packsArray = Array.isArray(data.data) ? data.data : [];
			console.log("ContentPacksPage: Packs array length:", packsArray.length);
			if (packsArray.length > 0) {
				console.log("ContentPacksPage: First pack structure:", {
					id: packsArray[0].id,
					name: packsArray[0].name,
					status: packsArray[0].status,
					createdAt: packsArray[0].createdAt,
					createdAtType: typeof packsArray[0].createdAt,
					allKeys: Object.keys(packsArray[0]),
				});
			}

			// Transform Date objects to strings if needed
			// NextResponse.json() should serialize Date objects to ISO strings automatically
			// But we need to ensure all required fields are present
			const transformedPacks = packsArray
				.map((pack: Record<string, unknown>) => {
					if (!pack || !pack.id) {
						console.warn("ContentPacksPage: Invalid pack:", pack);
						return null;
					}

					try {
						return {
							id: pack.id,
							version: pack.version || "1.0.0",
							name: pack.name || "Unnamed",
							description: pack.description,
							status: pack.status,
							createdAt:
								typeof pack.createdAt === "string"
									? pack.createdAt
									: pack.createdAt instanceof Date
										? pack.createdAt.toISOString()
										: pack.created_at || new Date().toISOString(),
							updatedAt:
								typeof pack.updatedAt === "string"
									? pack.updatedAt
									: pack.updatedAt instanceof Date
										? pack.updatedAt.toISOString()
										: pack.updated_at || new Date().toISOString(),
							activatedAt: pack.activatedAt
								? typeof pack.activatedAt === "string"
									? pack.activatedAt
									: pack.activatedAt instanceof Date
										? pack.activatedAt.toISOString()
										: pack.activated_at
								: undefined,
							// Handle snake_case fields from API
							fileSize: pack.fileSize || pack.file_size || 0,
							uploadedBy: pack.uploadedBy || pack.uploaded_by || "",
							activatedBy: pack.activatedBy || pack.activated_by,
							checksum: pack.checksum || "",
						};
					} catch (error) {
						console.error(
							"ContentPacksPage: Error transforming pack:",
							error,
							pack,
						);
						return null;
					}
				})
				.filter(
					(pack: ContentPack | null): pack is ContentPack => pack !== null,
				);

			console.log("ContentPacksPage: Transformed packs:", {
				count: transformedPacks.length,
				firstPack: transformedPacks[0] || null,
				allPacks: transformedPacks,
			});

			// Ensure we're setting the state correctly
			if (transformedPacks.length > 0) {
				console.log(
					"ContentPacksPage: Setting content packs state with",
					transformedPacks.length,
					"packs",
				);
				setContentPacks(transformedPacks);
			} else {
				console.warn(
					"ContentPacksPage: No packs to set, packsArray length was:",
					packsArray.length,
				);
				setContentPacks([]);
			}
			setError(null);
		} catch (err) {
			console.error("ContentPacksPage: Error fetching content packs:", err);
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
		// Show success message
		setUploadSuccessMessage("Content pack uploaded successfully!");
		// Clear success message after 5 seconds
		setTimeout(() => {
			setUploadSuccessMessage(null);
		}, 5000);
		// Switch to list tab after a brief delay to show success
		setTimeout(() => {
			setActiveTab("list");
		}, 500);
	};

	const handleUploadError = (error: string) => {
		setError(error);
	};

	const _handleContentPackUpdate = (updatedPack: ContentPack) => {
		setContentPacks((prev) =>
			prev.map((pack) => (pack.id === updatedPack.id ? updatedPack : pack)),
		);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const activeContentPack = contentPacks.find(
		(pack) => pack.status === ContentPackStatus.ACTIVATED,
	);

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-4 mb-2">
						<Link href="/admin">
							<Button variant="outline" size="sm">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Admin
							</Button>
						</Link>
						<Link href="/dashboard">
							<Button variant="ghost" size="sm">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Dashboard
							</Button>
						</Link>
					</div>
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

			{uploadSuccessMessage && (
				<Alert className="border-green-500 bg-green-50">
					<CheckCircle className="h-4 w-4 text-green-600" />
					<AlertDescription className="text-green-800">
						{uploadSuccessMessage}
					</AlertDescription>
				</Alert>
			)}

			<Tabs
				value={activeTab}
				onValueChange={(value) => {
					setActiveTab(value);
					// Clear success message when manually switching tabs
					if (uploadSuccessMessage) {
						setUploadSuccessMessage(null);
					}
				}}
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
									<div className="font-medium text-green-800">
										{activeContentPack.name}
									</div>
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
					<ContentPackList
						key={`content-packs-${contentPacks.length}-${loading}`}
						contentPacks={contentPacks || []}
						loading={loading}
						onPackUpdated={fetchContentPacks}
					/>
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
