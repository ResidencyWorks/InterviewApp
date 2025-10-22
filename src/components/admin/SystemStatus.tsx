"use client";

import {
	Activity,
	AlertTriangle,
	CheckCircle,
	Database,
	RefreshCw,
	Server,
	Settings,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemStatusData {
	contentPack: {
		isActive: boolean;
		name?: string;
		version?: string;
		activatedAt?: string;
		activatedBy?: string;
	};
	database: {
		status: "connected" | "disconnected" | "error";
		lastCheck: string;
		responseTime?: number;
	};
	analytics: {
		status: "active" | "inactive" | "error";
		lastEvent?: string;
	};
	fallback: {
		isActive: boolean;
		warningDismissed: boolean;
	};
	uptime: {
		startTime: string;
		lastRestart?: string;
	};
	performance: {
		averageResponseTime: number;
		errorRate: number;
		requestCount: number;
	};
}

interface SystemStatusProps {
	/**
	 * Callback when refresh is requested
	 */
	onRefresh?: () => void;

	/**
	 * Whether the component is in loading state
	 */
	loading?: boolean;

	/**
	 * Additional className for styling
	 */
	className?: string;

	/**
	 * Whether to show detailed information
	 */
	detailed?: boolean;
}

export function SystemStatus({
	onRefresh,
	loading = false,
	className,
	detailed = true,
}: SystemStatusProps) {
	const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const fetchSystemStatus = useCallback(async () => {
		try {
			setIsRefreshing(true);

			// Fetch system status from API
			const response = await fetch("/api/system/status");
			if (!response.ok) {
				throw new Error("Failed to fetch system status");
			}

			const data = await response.json();
			setStatusData(data);
		} catch (error) {
			console.error("Failed to fetch system status:", error);
			// Set fallback status data
			setStatusData({
				contentPack: { isActive: false },
				database: { status: "error", lastCheck: new Date().toISOString() },
				analytics: { status: "error" },
				fallback: { isActive: true, warningDismissed: false },
				uptime: { startTime: new Date().toISOString() },
				performance: { averageResponseTime: 0, errorRate: 0, requestCount: 0 },
			});
		} finally {
			setIsRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchSystemStatus();

		// Refresh every 30 seconds
		const interval = setInterval(fetchSystemStatus, 30000);
		return () => clearInterval(interval);
	}, [fetchSystemStatus]);

	const handleRefresh = useCallback(() => {
		fetchSystemStatus();
		if (onRefresh) {
			onRefresh();
		}
	}, [fetchSystemStatus, onRefresh]);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "connected":
			case "active":
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			case "disconnected":
			case "inactive":
				return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
			case "error":
				return <AlertTriangle className="h-4 w-4 text-red-600" />;
			default:
				return <Settings className="h-4 w-4 text-gray-600" />;
		}
	};

	const _getStatusColor = (status: string) => {
		switch (status) {
			case "connected":
			case "active":
				return "text-green-600";
			case "disconnected":
			case "inactive":
				return "text-yellow-600";
			case "error":
				return "text-red-600";
			default:
				return "text-gray-600";
		}
	};

	if (loading || !statusData) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						System Status
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="flex items-center gap-3">
							<Skeleton className="h-4 w-4 rounded-full" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-16" />
						</div>
					))}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						System Status
					</CardTitle>
					<Button
						size="sm"
						variant="outline"
						onClick={handleRefresh}
						disabled={isRefreshing}
					>
						<RefreshCw
							className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Content Pack Status */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Upload className="h-4 w-4 text-blue-600" />
						<span className="font-medium">Content Pack</span>
					</div>
					<div className="flex items-center gap-2">
						{statusData.contentPack.isActive ? (
							<>
								<Badge
									variant="default"
									className="bg-green-100 text-green-800"
								>
									Active
								</Badge>
								<span className="text-sm text-gray-600">
									{statusData.contentPack.name} v
									{statusData.contentPack.version}
								</span>
							</>
						) : (
							<Badge variant="destructive">No Content Pack</Badge>
						)}
					</div>
				</div>

				{/* Database Status */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Database className="h-4 w-4 text-blue-600" />
						<span className="font-medium">Database</span>
					</div>
					<div className="flex items-center gap-2">
						{getStatusIcon(statusData.database.status)}
						<Badge
							variant={
								statusData.database.status === "connected"
									? "default"
									: "destructive"
							}
							className={
								statusData.database.status === "connected"
									? "bg-green-100 text-green-800"
									: ""
							}
						>
							{statusData.database.status}
						</Badge>
						{statusData.database.responseTime && (
							<span className="text-sm text-gray-600">
								{statusData.database.responseTime}ms
							</span>
						)}
					</div>
				</div>

				{/* Analytics Status */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Server className="h-4 w-4 text-blue-600" />
						<span className="font-medium">Analytics</span>
					</div>
					<div className="flex items-center gap-2">
						{getStatusIcon(statusData.analytics.status)}
						<Badge
							variant={
								statusData.analytics.status === "active"
									? "default"
									: "secondary"
							}
							className={
								statusData.analytics.status === "active"
									? "bg-green-100 text-green-800"
									: ""
							}
						>
							{statusData.analytics.status}
						</Badge>
					</div>
				</div>

				{/* Fallback Status */}
				{statusData.fallback.isActive && (
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<AlertTriangle className="h-4 w-4 text-orange-600" />
							<span className="font-medium">Fallback Mode</span>
						</div>
						<Badge
							variant="outline"
							className="text-orange-700 border-orange-300"
						>
							{statusData.fallback.warningDismissed ? "Dismissed" : "Active"}
						</Badge>
					</div>
				)}

				{detailed && (
					<>
						{/* Performance Metrics */}
						<div className="pt-4 border-t">
							<h4 className="font-medium mb-3">Performance Metrics</h4>
							<div className="space-y-3">
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span>Average Response Time</span>
										<span>{statusData.performance.averageResponseTime}ms</span>
									</div>
									<Progress
										value={Math.min(
											(statusData.performance.averageResponseTime / 1000) * 100,
											100,
										)}
										className="h-2"
									/>
								</div>
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span>Error Rate</span>
										<span>{statusData.performance.errorRate.toFixed(2)}%</span>
									</div>
									<Progress
										value={statusData.performance.errorRate}
										className="h-2"
									/>
								</div>
								<div className="flex justify-between text-sm">
									<span>Total Requests</span>
									<span>
										{statusData.performance.requestCount.toLocaleString()}
									</span>
								</div>
							</div>
						</div>

						{/* System Information */}
						<div className="pt-4 border-t">
							<h4 className="font-medium mb-3">System Information</h4>
							<div className="space-y-2 text-sm text-gray-600">
								<div className="flex justify-between">
									<span>Uptime</span>
									<span>
										{new Date(statusData.uptime.startTime).toLocaleString()}
									</span>
								</div>
								{statusData.uptime.lastRestart && (
									<div className="flex justify-between">
										<span>Last Restart</span>
										<span>
											{new Date(statusData.uptime.lastRestart).toLocaleString()}
										</span>
									</div>
								)}
								{statusData.contentPack.activatedAt && (
									<div className="flex justify-between">
										<span>Content Pack Activated</span>
										<span>
											{new Date(
												statusData.contentPack.activatedAt,
											).toLocaleString()}
										</span>
									</div>
								)}
							</div>
						</div>
					</>
				)}

				{/* Alerts */}
				{statusData.fallback.isActive &&
					!statusData.fallback.warningDismissed && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								System is running in fallback mode. Please upload and activate a
								content pack for full functionality.
							</AlertDescription>
						</Alert>
					)}

				{statusData.database.status === "error" && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							Database connection error. Please check your database
							configuration.
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * Compact system status indicator for headers/navigation
 */
interface SystemStatusIndicatorProps {
	/**
	 * System status data
	 */
	statusData?: SystemStatusData;

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
	statusData,
	onClick,
	className,
}: SystemStatusIndicatorProps) {
	if (!statusData) {
		return (
			<Badge variant="secondary" className={className}>
				<Skeleton className="h-3 w-16" />
			</Badge>
		);
	}

	const getStatusInfo = () => {
		if (statusData.fallback.isActive && !statusData.fallback.warningDismissed) {
			return {
				icon: AlertTriangle,
				text: "Fallback Active",
				variant: "destructive" as const,
			};
		} else if (statusData.contentPack.isActive) {
			return {
				icon: CheckCircle,
				text: "Content Pack Active",
				variant: "default" as const,
			};
		} else {
			return {
				icon: AlertTriangle,
				text: "No Content Pack",
				variant: "secondary" as const,
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
			<Icon className="h-3 w-3 mr-1" />
			{statusInfo.text}
		</Badge>
	);
}
