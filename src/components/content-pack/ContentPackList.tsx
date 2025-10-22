/**
 * ContentPackList Component
 *
 * Displays a list of content packs with filtering, sorting, and activation capabilities.
 */

"use client";

import {
	AlertCircle,
	Filter,
	RefreshCw,
	Search,
	SortAsc,
	SortDesc,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentPackStatus } from "@/lib/domain/entities/ContentPack";
import { ContentPackActivation } from "./ContentPackActivation";

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

interface ContentPackListProps {
	onContentPackUpdate?: (contentPack: ContentPack) => void;
	onRefresh?: () => void;
	className?: string;
}

type SortField = "name" | "version" | "createdAt" | "activatedAt" | "status";
type SortDirection = "asc" | "desc";

/**
 * ContentPackList component for displaying and managing content packs
 */
export function ContentPackList({
	onContentPackUpdate,
	onRefresh,
	className,
}: ContentPackListProps): React.JSX.Element {
	const [contentPacks, setContentPacks] = useState<ContentPack[]>([]);
	const [filteredContentPacks, setFilteredContentPacks] = useState<
		ContentPack[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [sortField, setSortField] = useState<SortField>("createdAt");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	/**
	 * Fetch content packs from the API
	 */
	const fetchContentPacks = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			console.log(
				"ContentPackList: Fetching content packs from /api/content-packs",
			);
			const response = await fetch("/api/content-packs", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			console.log("ContentPackList: Response status:", response.status);
			if (!response.ok) {
				throw new Error("Failed to fetch content packs");
			}

			const result = await response.json();
			console.log("ContentPackList: API response:", result);
			console.log("ContentPackList: Setting content packs:", result.data || []);
			setContentPacks(result.data || []);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, []);

	/**
	 * Filter and sort content packs
	 */
	const filterAndSortContentPacks = useCallback(() => {
		console.log("ContentPackList: filterAndSortContentPacks called with:", {
			contentPacksCount: contentPacks.length,
			searchTerm,
			statusFilter,
			sortField,
			sortDirection,
		});
		let filtered = [...contentPacks];

		// Apply search filter
		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(pack) =>
					pack.name.toLowerCase().includes(term) ||
					pack.version.toLowerCase().includes(term) ||
					(pack.description?.toLowerCase().includes(term) ?? false),
			);
		}

		// Apply status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter((pack) => pack.status === statusFilter);
		}

		// Apply sorting
		filtered.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			switch (sortField) {
				case "name":
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
					break;
				case "version":
					aValue = a.version;
					bValue = b.version;
					break;
				case "createdAt":
					aValue = new Date(a.createdAt).getTime();
					bValue = new Date(b.createdAt).getTime();
					break;
				case "activatedAt":
					aValue = a.activatedAt ? new Date(a.activatedAt).getTime() : 0;
					bValue = b.activatedAt ? new Date(b.activatedAt).getTime() : 0;
					break;
				case "status":
					aValue = a.status;
					bValue = b.status;
					break;
				default:
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
			}

			if (aValue < bValue) {
				return sortDirection === "asc" ? -1 : 1;
			}
			if (aValue > bValue) {
				return sortDirection === "asc" ? 1 : -1;
			}
			return 0;
		});

		console.log("ContentPackList: Final filtered result:", filtered);
		setFilteredContentPacks(filtered);
	}, [contentPacks, searchTerm, statusFilter, sortField, sortDirection]);

	/**
	 * Handle content pack activation completion
	 */
	const handleContentPackUpdate = useCallback(
		(updatedPack: ContentPack) => {
			setContentPacks((prev) =>
				prev.map((pack) => (pack.id === updatedPack.id ? updatedPack : pack)),
			);

			// If a pack was activated, deactivate others
			if (updatedPack.status === ContentPackStatus.ACTIVATED) {
				setContentPacks((prev) =>
					prev.map((pack) =>
						pack.id !== updatedPack.id &&
						pack.status === ContentPackStatus.ACTIVATED
							? { ...pack, status: ContentPackStatus.ARCHIVED }
							: pack,
					),
				);
			}

			if (onContentPackUpdate) {
				onContentPackUpdate(updatedPack);
			}
		},
		[onContentPackUpdate],
	);

	/**
	 * Handle content pack deactivation
	 */
	const handleDeactivationComplete = useCallback(() => {
		// Refresh the list to get updated statuses
		fetchContentPacks();
	}, [fetchContentPacks]);

	/**
	 * Handle sort field change
	 */
	const handleSortFieldChange = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	/**
	 * Get sort icon for a field
	 */
	const getSortIcon = (field: SortField) => {
		if (sortField !== field) {
			return null;
		}
		return sortDirection === "asc" ? (
			<SortAsc className="h-4 w-4" />
		) : (
			<SortDesc className="h-4 w-4" />
		);
	};

	// Fetch content packs on mount
	useEffect(() => {
		fetchContentPacks();
	}, [fetchContentPacks]);

	// Filter and sort when dependencies change
	useEffect(() => {
		console.log(
			"ContentPackList: Filtering and sorting, current contentPacks:",
			contentPacks,
		);
		filterAndSortContentPacks();
	}, [filterAndSortContentPacks, contentPacks]);

	// Handle refresh from parent
	useEffect(() => {
		if (onRefresh) {
			// This would be called by parent component
		}
	}, [onRefresh]);

	return (
		<div className={className}>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Content Packs</CardTitle>
							<CardDescription>
								Manage and activate content packs for the evaluation system
							</CardDescription>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={fetchContentPacks}
							disabled={loading}
						>
							<RefreshCw
								className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
							/>
							Refresh
						</Button>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					{/* Filters and Search */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search content packs..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>

						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-full sm:w-[180px]">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="uploaded">Uploaded</SelectItem>
								<SelectItem value="validating">Validating</SelectItem>
								<SelectItem value="valid">Valid</SelectItem>
								<SelectItem value="invalid">Invalid</SelectItem>
								<SelectItem value="activated">Activated</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Sort Controls */}
					<div className="flex flex-wrap gap-2">
						{(
							["name", "version", "createdAt", "activatedAt", "status"] as const
						).map((field) => (
							<Button
								key={field}
								variant="outline"
								size="sm"
								onClick={() => handleSortFieldChange(field)}
								className="flex items-center gap-1"
							>
								{field === "createdAt" && "Created"}
								{field === "activatedAt" && "Activated"}
								{field === "name" && "Name"}
								{field === "version" && "Version"}
								{field === "status" && "Status"}
								{getSortIcon(field)}
							</Button>
						))}
					</div>

					{/* Error State */}
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Loading State */}
					{loading && (
						<div className="space-y-4">
							{Array.from({ length: 3 }).map((_, index: number) => (
								<Card key={`skeleton-${index.toString()}`}>
									<CardHeader>
										<Skeleton className="h-6 w-1/3" />
										<Skeleton className="h-4 w-1/2" />
									</CardHeader>
									<CardContent>
										<Skeleton className="h-20 w-full" />
									</CardContent>
								</Card>
							))}
						</div>
					)}

					{/* Content Packs List */}
					{!loading && !error && (
						<div className="space-y-4">
							{filteredContentPacks.length === 0 ? (
								<Card>
									<CardContent className="flex flex-col items-center justify-center py-8">
										<Filter className="h-12 w-12 text-muted-foreground mb-4" />
										<h3 className="text-lg font-semibold mb-2">
											No content packs found
										</h3>
										<p className="text-muted-foreground text-center">
											{searchTerm || statusFilter !== "all"
												? "Try adjusting your search or filter criteria"
												: "Upload your first content pack to get started"}
										</p>
									</CardContent>
								</Card>
							) : (
								filteredContentPacks.map((contentPack) => (
									<ContentPackActivation
										key={contentPack.id}
										contentPack={contentPack}
										onActivationComplete={handleContentPackUpdate}
										onDeactivationComplete={handleDeactivationComplete}
									/>
								))
							)}
						</div>
					)}

					{/* Results Summary */}
					{!loading && !error && filteredContentPacks.length > 0 && (
						<div className="text-sm text-muted-foreground">
							Showing {filteredContentPacks.length} of {contentPacks.length}{" "}
							content pack{contentPacks.length !== 1 ? "s" : ""}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
