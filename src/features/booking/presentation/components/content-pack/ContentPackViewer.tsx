"use client";

import { AlertCircle, BookOpen, CheckCircle2, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Criteria {
	id: string;
	name: string;
	weight: number;
	description: string;
}

interface Question {
	id: string;
	text: string;
	type: string;
	options?: string[];
}

interface Evaluation {
	id: string;
	title: string;
	description: string;
	criteria: Criteria[];
	questions: Question[];
}

interface Category {
	id: string;
	name: string;
	description: string;
}

interface ContentPackContent {
	evaluations: Evaluation[];
	categories: Category[];
}

interface ContentPackData {
	id: string;
	version: string;
	name: string;
	description?: string;
	schemaVersion: string;
	status: string;
	content: ContentPackContent;
	metadata?: {
		author?: string;
		tags?: string[];
		compatibility?: {
			minVersion?: string;
			maxVersion?: string;
			features?: string[];
		};
	};
	createdAt: string;
	updatedAt: string;
	activatedAt?: string;
	activatedBy?: string;
	uploadedBy: string;
	fileSize: number;
	checksum: string;
}

interface ContentPackViewerProps {
	contentPackId: string;
}

export function ContentPackViewer({ contentPackId }: ContentPackViewerProps) {
	const [contentPack, setContentPack] = useState<ContentPackData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchContentPack = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/content-packs/${contentPackId}`);

				if (!response.ok) {
					throw new Error("Failed to fetch content pack details");
				}

				const result = await response.json();
				setContentPack(result.data);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load content pack",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchContentPack();
	}, [contentPackId]);

	if (loading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	if (!contentPack || !contentPack.content) {
		return (
			<Alert>
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>No content available</AlertDescription>
			</Alert>
		);
	}

	const { content, metadata } = contentPack;

	return (
		<Tabs defaultValue="evaluations" className="w-full">
			<TabsList className="grid w-full grid-cols-3">
				<TabsTrigger value="evaluations">
					<BookOpen className="h-4 w-4 mr-2" />
					Evaluations ({content.evaluations?.length || 0})
				</TabsTrigger>
				<TabsTrigger value="categories">
					<FolderOpen className="h-4 w-4 mr-2" />
					Categories ({content.categories?.length || 0})
				</TabsTrigger>
				<TabsTrigger value="metadata">
					<CheckCircle2 className="h-4 w-4 mr-2" />
					Metadata
				</TabsTrigger>
			</TabsList>

			<TabsContent value="evaluations" className="space-y-4 mt-4">
				{content.evaluations && content.evaluations.length > 0 ? (
					content.evaluations.map((evaluation) => (
						<Card key={evaluation.id}>
							<CardHeader>
								<CardTitle className="text-lg">{evaluation.title}</CardTitle>
								<CardDescription>{evaluation.description}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Criteria */}
								<div>
									<h4 className="font-medium mb-2 text-sm text-muted-foreground">
										Evaluation Criteria ({evaluation.criteria?.length || 0})
									</h4>
									<div className="space-y-2">
										{evaluation.criteria?.map((criterion) => (
											<div
												key={criterion.id}
												className="border rounded-lg p-3 bg-muted/30"
											>
												<div className="flex items-center justify-between mb-1">
													<span className="font-medium text-sm">
														{criterion.name}
													</span>
													<Badge variant="outline">
														Weight: {(criterion.weight * 100).toFixed(0)}%
													</Badge>
												</div>
												<p className="text-sm text-muted-foreground">
													{criterion.description}
												</p>
											</div>
										))}
									</div>
								</div>

								{/* Questions */}
								<div>
									<h4 className="font-medium mb-2 text-sm text-muted-foreground">
										Questions ({evaluation.questions?.length || 0})
									</h4>
									<div className="space-y-2">
										{evaluation.questions?.map((question, idx) => (
											<div
												key={question.id}
												className="border rounded-lg p-3 bg-muted/30"
											>
												<div className="flex items-start gap-2">
													<Badge variant="secondary" className="mt-0.5">
														Q{idx + 1}
													</Badge>
													<div className="flex-1">
														<p className="text-sm font-medium mb-1">
															{question.text}
														</p>
														<div className="flex items-center gap-2 text-xs text-muted-foreground">
															<Badge variant="outline" className="text-xs">
																{question.type}
															</Badge>
															{question.options && (
																<span>{question.options.length} options</span>
															)}
														</div>
														{question.options && (
															<div className="mt-2 space-y-1">
																{question.options.map((option) => (
																	<div
																		key={option}
																		className="text-xs text-muted-foreground pl-4"
																	>
																		• {option}
																	</div>
																))}
															</div>
														)}
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							</CardContent>
						</Card>
					))
				) : (
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>No evaluations found</AlertDescription>
					</Alert>
				)}
			</TabsContent>

			<TabsContent value="categories" className="space-y-4 mt-4">
				{content.categories && content.categories.length > 0 ? (
					<div className="grid gap-4 md:grid-cols-2">
						{content.categories.map((category) => (
							<Card key={category.id}>
								<CardHeader>
									<CardTitle className="text-base">{category.name}</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground">
										{category.description}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>No categories found</AlertDescription>
					</Alert>
				)}
			</TabsContent>

			<TabsContent value="metadata" className="space-y-4 mt-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Content Pack Metadata</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{metadata?.author && (
							<div>
								<div className="text-sm font-medium text-muted-foreground">
									Author
								</div>
								<p className="text-sm">{metadata.author}</p>
							</div>
						)}

						{metadata?.tags && metadata.tags.length > 0 && (
							<div>
								<div className="text-sm font-medium text-muted-foreground mb-2">
									Tags
								</div>
								<div className="flex flex-wrap gap-2">
									{metadata.tags.map((tag) => (
										<Badge key={tag} variant="secondary">
											{tag}
										</Badge>
									))}
								</div>
							</div>
						)}

						{metadata?.compatibility && (
							<div>
								<div className="text-sm font-medium text-muted-foreground mb-2">
									Compatibility
								</div>
								<div className="space-y-2 text-sm">
									{metadata.compatibility.minVersion && (
										<div>
											<span className="text-muted-foreground">
												Min Version:
											</span>{" "}
											{metadata.compatibility.minVersion}
										</div>
									)}
									{metadata.compatibility.maxVersion && (
										<div>
											<span className="text-muted-foreground">
												Max Version:
											</span>{" "}
											{metadata.compatibility.maxVersion}
										</div>
									)}
									{metadata.compatibility.features &&
										metadata.compatibility.features.length > 0 && (
											<div>
												<span className="text-muted-foreground">Features:</span>
												<div className="flex flex-wrap gap-1 mt-1">
													{metadata.compatibility.features.map((feature) => (
														<Badge
															key={feature}
															variant="outline"
															className="text-xs"
														>
															{feature}
														</Badge>
													))}
												</div>
											</div>
										)}
								</div>
							</div>
						)}

						<div className="pt-4 border-t">
							<div className="text-sm font-medium text-muted-foreground mb-2">
								Technical Details
							</div>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground">Schema Version:</span>{" "}
									{contentPack.schemaVersion}
								</div>
								<div>
									<span className="text-muted-foreground">Checksum:</span>{" "}
									<code className="text-xs">
										{contentPack.checksum.substring(0, 16)}...
									</code>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	);
}
