/**
 * Admin Content Packs Page
 *
 * Provides a comprehensive interface for managing content packs including
 * upload, validation, activation, and monitoring.
 */

"use client";

import { ArrowLeft, Play, RefreshCw } from "lucide-react";
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
					<ContentPackList />
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
