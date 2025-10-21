/**
 * Admin Dashboard
 *
 * Main admin dashboard providing overview of system status,
 * content pack management, and quick access to admin functions.
 */

"use client";

import {
	Activity,
	AlertTriangle,
	CheckCircle,
	Clock,
	FileText,
	Play,
	Settings,
	Upload,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SystemStatus } from "@/components/admin/SystemStatus";
import { FallbackWarning } from "@/components/content-pack/FallbackWarning";
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
import { ContentPackStatus } from "@/lib/domain/entities/ContentPack";

interface ContentPack {
	id: string;
	version: string;
	name: string;
	status: ContentPackStatus;
	createdAt: string;
	activatedAt?: string;
}

interface SystemStats {
	totalContentPacks: number;
	activeContentPacks: number;
	pendingValidations: number;
	recentUploads: number;
}

export default function AdminDashboard() {
	const [contentPacks, setContentPacks] = useState<ContentPack[]>([]);
	const [stats, setStats] = useState<SystemStats>({
		totalContentPacks: 0,
		activeContentPacks: 0,
		pendingValidations: 0,
		recentUploads: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isUsingFallback, setIsUsingFallback] = useState(false);
	const [fallbackWarningDismissed, setFallbackWarningDismissed] =
		useState(false);

	// Fetch dashboard data
	const fetchDashboardData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/content-packs");

			if (!response.ok) {
				throw new Error("Failed to fetch dashboard data");
			}

			const data = await response.json();
			const packs = data.data;

			setContentPacks(packs);

			// Calculate stats
			const now = new Date();
			const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

			const activePacks = packs.filter(
				(p: ContentPack) => p.status === ContentPackStatus.ACTIVATED,
			);

			setStats({
				totalContentPacks: packs.length,
				activeContentPacks: activePacks.length,
				pendingValidations: packs.filter(
					(p: ContentPack) =>
						p.status === ContentPackStatus.UPLOADED ||
						p.status === ContentPackStatus.VALIDATING,
				).length,
				recentUploads: packs.filter(
					(p: ContentPack) => new Date(p.createdAt) > oneDayAgo,
				).length,
			});

			// Check if we're using fallback content
			setIsUsingFallback(activePacks.length === 0);

			setError(null);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to fetch dashboard data",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchDashboardData();
	}, [fetchDashboardData]);

	const handleDismissFallbackWarning = useCallback(() => {
		setFallbackWarningDismissed(true);
	}, []);

	const handleRefreshFallback = useCallback(() => {
		setFallbackWarningDismissed(false);
		fetchDashboardData();
	}, [fetchDashboardData]);

	const activeContentPack = contentPacks.find(
		(pack) => pack.status === ContentPackStatus.ACTIVATED,
	);
	const pendingPacks = contentPacks.filter(
		(pack) =>
			pack.status === ContentPackStatus.UPLOADED ||
			pack.status === ContentPackStatus.VALIDATING,
	);

	const getStatusColor = (status: ContentPackStatus) => {
		switch (status) {
			case ContentPackStatus.ACTIVATED:
				return "text-green-600";
			case ContentPackStatus.VALID:
				return "text-blue-600";
			case ContentPackStatus.INVALID:
				return "text-red-600";
			case ContentPackStatus.VALIDATING:
				return "text-yellow-600";
			default:
				return "text-gray-600";
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

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Admin Dashboard</h1>
					<p className="text-gray-600">
						Manage your interview system and content packs
					</p>
				</div>
				<Button onClick={fetchDashboardData} disabled={loading}>
					<Activity className="h-4 w-4 mr-2" />
					Refresh
				</Button>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* System Status */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Content Packs
						</CardTitle>
						<FileText className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalContentPacks}</div>
						<p className="text-xs text-muted-foreground">
							All uploaded content packs
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Active Content Packs
						</CardTitle>
						<Play className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.activeContentPacks}</div>
						<p className="text-xs text-muted-foreground">Currently in use</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Pending Validations
						</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.pendingValidations}</div>
						<p className="text-xs text-muted-foreground">Awaiting validation</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Recent Uploads
						</CardTitle>
						<Upload className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.recentUploads}</div>
						<p className="text-xs text-muted-foreground">Last 24 hours</p>
					</CardContent>
				</Card>
			</div>

			{/* Fallback Warning */}
			<FallbackWarning
				isUsingFallback={isUsingFallback}
				isDismissed={fallbackWarningDismissed}
				onDismiss={handleDismissFallbackWarning}
				onRefresh={handleRefreshFallback}
			/>

			{/* Active Content Pack */}
			{activeContentPack && (
				<Card className="border-green-200 bg-green-50">
					<CardHeader>
						<CardTitle className="text-green-800 flex items-center gap-2">
							<CheckCircle className="h-5 w-5" />
							Active Content Pack
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="font-medium text-green-900">
								{activeContentPack.name}
							</div>
							<div className="text-sm text-green-700">
								Version {activeContentPack.version} • Activated{" "}
								{activeContentPack.activatedAt
									? new Date(activeContentPack.activatedAt).toLocaleString()
									: "Unknown"}
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Quick Actions */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Upload className="h-5 w-5" />
							Upload Content Pack
						</CardTitle>
						<CardDescription>
							Upload a new content pack JSON file
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link href="/admin/content-packs?tab=upload">
							<Button className="w-full">
								<Upload className="h-4 w-4 mr-2" />
								Upload New Pack
							</Button>
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Settings className="h-5 w-5" />
							Manage Content Packs
						</CardTitle>
						<CardDescription>
							View, validate, and activate content packs
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link href="/admin/content-packs">
							<Button variant="outline" className="w-full">
								<Settings className="h-4 w-4 mr-2" />
								Manage Packs
							</Button>
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							User Management
						</CardTitle>
						<CardDescription>
							Manage user accounts and permissions
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="outline" className="w-full" disabled>
							<Users className="h-4 w-4 mr-2" />
							Coming Soon
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* System Status */}
			<SystemStatus
				onRefresh={fetchDashboardData}
				loading={loading}
				detailed={true}
			/>

			{/* Recent Activity */}
			{pendingPacks.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Pending Actions</CardTitle>
						<CardDescription>
							Content packs that require attention
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{pendingPacks.map((pack) => (
								<div
									key={pack.id}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div className="flex items-center gap-3">
										{getStatusIcon(pack.status)}
										<div>
											<div className="font-medium">{pack.name}</div>
											<div className="text-sm text-gray-600">
												Version {pack.version} •{" "}
												{new Date(pack.createdAt).toLocaleString()}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge
											variant="outline"
											className={getStatusColor(pack.status)}
										>
											{pack.status}
										</Badge>
										<Link href="/admin/content-packs">
											<Button size="sm" variant="outline">
												View
											</Button>
										</Link>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* System Information */}
			<Card>
				<CardHeader>
					<CardTitle>System Information</CardTitle>
					<CardDescription>
						Current system status and configuration
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<div className="font-medium">Content Pack Schema Version</div>
							<div className="text-gray-600">1.0.0</div>
						</div>
						<div>
							<div className="font-medium">Maximum File Size</div>
							<div className="text-gray-600">10 MB</div>
						</div>
						<div>
							<div className="font-medium">Supported File Types</div>
							<div className="text-gray-600">JSON (.json)</div>
						</div>
						<div>
							<div className="font-medium">System Status</div>
							<div className="text-green-600 flex items-center gap-1">
								<CheckCircle className="h-3 w-3" />
								Operational
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
