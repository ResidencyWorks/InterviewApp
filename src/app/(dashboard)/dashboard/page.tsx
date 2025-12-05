"use client";

import type { AuthUser } from "@supabase/supabase-js";
import {
	Minus,
	Settings,
	TrendingDown,
	TrendingUp,
	Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dashboardService } from "@/application/services/dashboardService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useUserPlan } from "@/hooks/useUserPlan";

export default function DashboardPage() {
	const { user, loading: authLoading } = useAuth() as {
		user: AuthUser | null;
		loading: boolean;
	};
	const router = useRouter();
	const isAdmin = user?.user_metadata?.role === "admin";
	const dashboardData = useDashboardData(user);
	const userPlanData = useUserPlan(user);

	// Redirect to login if not authenticated (safety check - layout also handles this)
	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
		}
	}, [user, authLoading, router]);

	// Check for error messages from URL params
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	interface ProgressData {
		currentValue: number;
		targetValue: number;
		remainingValue: number;
		unit: string;
		lastUpdated: string;
		goal?: {
			currentValue: number;
			targetValue: number;
			unit: string;
		};
		progressPercentage: number;
		estimatedCompletionDate: string;
		[key: string]: unknown;
	}

	interface FeaturedContent {
		title: string;
		description: string;
		url: string;
		type: string;
		difficulty: string;
		link: string;
	}

	const [progressData, setProgressData] = useState<ProgressData | null>(null);
	const [featuredContent, setFeaturedContent] =
		useState<FeaturedContent | null>(null);
	const [studyTips, setStudyTips] = useState<string[]>([]);

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const error = urlParams.get("error");

		if (error === "insufficient_permissions") {
			setErrorMessage("You don't have permission to access that page.");
			// Clean up URL
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}, []);

	useEffect(() => {
		if (user) {
			// Fetch additional dashboard data
			Promise.all([
				dashboardService.getUserProgress(user),
				dashboardService.getFeaturedContent(user),
				dashboardService.getStudyTips(user),
			])
				.then(([progress, featured, tips]) => {
					setProgressData(progress as unknown as ProgressData);
					setFeaturedContent(featured as FeaturedContent);
					setStudyTips(tips);
				})
				.catch((error) => {
					console.error("Error fetching dashboard data:", error);
				});
		}
	}, [user]);

	// Note: Profile completion routing is now handled by proxy
	// No client-side redirects needed

	// Helper function to format time ago
	function getTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) {
			return "Just now";
		} else if (diffInSeconds < 3600) {
			const minutes = Math.floor(diffInSeconds / 60);
			return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
		} else if (diffInSeconds < 86400) {
			const hours = Math.floor(diffInSeconds / 3600);
			return `${hours} hour${hours > 1 ? "s" : ""} ago`;
		} else {
			const days = Math.floor(diffInSeconds / 86400);
			return `${days} day${days > 1 ? "s" : ""} ago`;
		}
	}

	// Note: Authentication and profile completion routing is handled by proxy
	// No client-side checks needed

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Error Message */}
				{errorMessage && (
					<Alert variant="destructive">
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				)}

				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
						<p className="text-muted-foreground">
							Welcome back! Here's what's happening with your interview prep.
						</p>
					</div>
					<div className="flex items-center space-x-4">
						{userPlanData.loading ? (
							<Skeleton className="h-6 w-24" />
						) : userPlanData.plan ? (
							userPlanData.plan.entitlementLevel === "FREE" ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() => router.push("/plans")}
									className="text-sm"
								>
									Upgrade
								</Button>
							) : (
								<Badge
									variant={userPlanData.plan.badgeVariant}
									className="text-sm"
								>
									{userPlanData.plan.displayName}
									{userPlanData.plan.expiresAt && (
										<span className="ml-1 text-xs opacity-75">
											(
											{new Date(
												userPlanData.plan.expiresAt,
											).toLocaleDateString()}
											)
										</span>
									)}
								</Badge>
							)
						) : (
							<Button
								size="sm"
								variant="outline"
								onClick={() => router.push("/plans")}
								className="text-sm"
							>
								Upgrade
							</Button>
						)}
						<Avatar>
							<AvatarFallback className="bg-gray-200 text-gray-800">
								{user?.email?.charAt(0).toUpperCase() || "U"}
							</AvatarFallback>
						</Avatar>
					</div>
				</div>

				{/* Stats Overview */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Drills
							</CardTitle>
							{dashboardData.loading ? (
								<Skeleton className="h-5 w-12" />
							) : (
								<Badge variant="secondary">
									{dashboardData.stats.weeklyProgress.totalDrills > 0 ? (
										<>
											<TrendingUp className="h-3 w-3 mr-1" />+
											{dashboardData.stats.weeklyProgress.totalDrills}
										</>
									) : (
										<Minus className="h-3 w-3" />
									)}
								</Badge>
							)}
						</CardHeader>
						<CardContent>
							{dashboardData.loading ? (
								<Skeleton className="h-8 w-16 mb-2" />
							) : (
								<div className="text-2xl font-bold">
									{dashboardData.stats.totalDrills}
								</div>
							)}
							{dashboardData.loading ? (
								<Skeleton className="h-4 w-24" />
							) : (
								<p className="text-xs text-muted-foreground">
									{dashboardData.stats.weeklyProgress.totalDrills > 0
										? `+${dashboardData.stats.weeklyProgress.totalDrills} this week`
										: "No activity this week"}
								</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Completed</CardTitle>
							{dashboardData.loading ? (
								<Skeleton className="h-5 w-12" />
							) : (
								<Badge variant="secondary">
									{dashboardData.stats.weeklyProgress.completedDrills > 0 ? (
										<>
											<TrendingUp className="h-3 w-3 mr-1" />+
											{dashboardData.stats.weeklyProgress.completedDrills}
										</>
									) : (
										<Minus className="h-3 w-3" />
									)}
								</Badge>
							)}
						</CardHeader>
						<CardContent>
							{dashboardData.loading ? (
								<Skeleton className="h-8 w-16 mb-2" />
							) : (
								<div className="text-2xl font-bold">
									{dashboardData.stats.completedDrills}
								</div>
							)}
							{dashboardData.loading ? (
								<Skeleton className="h-4 w-24" />
							) : (
								<p className="text-xs text-muted-foreground">
									{dashboardData.stats.weeklyProgress.completedDrills > 0
										? `+${dashboardData.stats.weeklyProgress.completedDrills} this week`
										: "No completions this week"}
								</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Average Score
							</CardTitle>
							{dashboardData.loading ? (
								<Skeleton className="h-5 w-12" />
							) : (
								<Badge variant="secondary">
									{dashboardData.stats.weeklyProgress.averageScore >
									dashboardData.stats.averageScore ? (
										<>
											<TrendingUp className="h-3 w-3 mr-1" />+
											{Math.round(
												dashboardData.stats.weeklyProgress.averageScore -
													dashboardData.stats.averageScore,
											)}
											%
										</>
									) : dashboardData.stats.weeklyProgress.averageScore <
										dashboardData.stats.averageScore ? (
										<>
											<TrendingDown className="h-3 w-3 mr-1" />
											{Math.round(
												dashboardData.stats.weeklyProgress.averageScore -
													dashboardData.stats.averageScore,
											)}
											%
										</>
									) : (
										<Minus className="h-3 w-3" />
									)}
								</Badge>
							)}
						</CardHeader>
						<CardContent>
							{dashboardData.loading ? (
								<Skeleton className="h-8 w-16 mb-2" />
							) : (
								<div className="text-2xl font-bold">
									{dashboardData.stats.averageScore}%
								</div>
							)}
							{dashboardData.loading ? (
								<Skeleton className="h-4 w-24" />
							) : (
								<p className="text-xs text-muted-foreground">
									{dashboardData.stats.weeklyProgress.averageScore > 0
										? `${dashboardData.stats.weeklyProgress.averageScore}% this week`
										: "No scores this week"}
								</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Streak</CardTitle>
							{dashboardData.loading ? (
								<Skeleton className="h-5 w-12" />
							) : (
								<Badge variant="secondary">
									{dashboardData.stats.weeklyProgress.streakDays > 0 ? (
										<>
											<TrendingUp className="h-3 w-3 mr-1" />+
											{dashboardData.stats.weeklyProgress.streakDays}
										</>
									) : (
										<Minus className="h-3 w-3" />
									)}
								</Badge>
							)}
						</CardHeader>
						<CardContent>
							{dashboardData.loading ? (
								<Skeleton className="h-8 w-16 mb-2" />
							) : (
								<div className="text-2xl font-bold">
									{dashboardData.stats.currentStreak} days
								</div>
							)}
							{dashboardData.loading ? (
								<Skeleton className="h-4 w-24" />
							) : (
								<p className="text-xs text-muted-foreground">
									{dashboardData.stats.currentStreak > 0
										? "Keep it up!"
										: "Start your streak!"}
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Main Content */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Recent Activity */}
					<div className="lg:col-span-2 lg:row-span-2">
						<Card className="h-100">
							<CardHeader>
								<CardTitle>Recent Activity</CardTitle>
								<CardDescription>
									Your latest interview drill sessions and progress
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{dashboardData.loading ? (
									// Loading skeletons
									[1, 2, 3].map((i) => (
										<div key={i} className="flex items-center space-x-4">
											<Skeleton className="w-2 h-2 rounded-full" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-4 w-48" />
												<Skeleton className="h-3 w-32" />
											</div>
											<Skeleton className="h-6 w-20" />
										</div>
									))
								) : dashboardData.recentActivity.length > 0 ? (
									dashboardData.recentActivity.map((activity) => (
										<div
											key={activity.id}
											className="flex items-center space-x-4"
										>
											<div
												className={`w-2 h-2 rounded-full ${
													activity.status === "completed"
														? "bg-green-500"
														: activity.status === "in_progress"
															? "bg-blue-500"
															: "bg-yellow-500"
												}`}
											/>
											<div className="flex-1">
												<p className="text-sm font-medium">{activity.title}</p>
												<p className="text-xs text-muted-foreground">
													{activity.completedAt
														? `${getTimeAgo(activity.completedAt)} • Score: ${activity.score}%`
														: `${getTimeAgo(activity.createdAt)} • ${activity.status === "in_progress" ? "In Progress" : "Pending"}`}
												</p>
											</div>
											<Badge
												variant={
													activity.status === "completed"
														? "outline"
														: activity.status === "in_progress"
															? "secondary"
															: "outline"
												}
											>
												{activity.status === "completed"
													? "Completed"
													: activity.status === "in_progress"
														? "In Progress"
														: "Pending"}
											</Badge>
										</div>
									))
								) : (
									<div className="text-center py-8">
										<p className="text-muted-foreground">No recent activity</p>
										<p className="text-sm text-muted-foreground mt-1">
											Start your first drill to see your progress here!
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Quick Actions */}
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Quick Actions</CardTitle>
								<CardDescription>
									Start a new drill or continue where you left off
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<Button asChild className="w-full">
									<Link href="/drill">Start New Drill</Link>
								</Button>
								<Button variant="outline" asChild className="w-full">
									<Link href="/drill/continue">Continue Practice</Link>
								</Button>
								<Button variant="outline" asChild className="w-full">
									<Link href="/profile">View Profile</Link>
								</Button>
							</CardContent>
						</Card>

						{/* Admin Actions - Only show for admin users */}
						{isAdmin && (
							<Card className="border-blue-200 bg-blue-50">
								<CardHeader>
									<CardTitle className="text-blue-800 flex items-center gap-2">
										<Settings className="h-5 w-5" />
										Admin Actions
									</CardTitle>
									<CardDescription className="text-blue-600">
										Manage content packs and system settings
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<Button
										asChild
										className="w-full bg-blue-600 hover:bg-blue-700"
									>
										<Link href="/admin/content-packs">
											<Upload className="h-4 w-4 mr-2" />
											Manage Content Packs
										</Link>
									</Button>
									<Button
										variant="outline"
										asChild
										className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
									>
										<Link href="/admin">
											<Settings className="h-4 w-4 mr-2" />
											Admin Dashboard
										</Link>
									</Button>
								</CardContent>
							</Card>
						)}

						<Card>
							<CardHeader>
								<CardTitle>Today's Goal</CardTitle>
								<CardDescription>
									{progressData
										? progressData.remainingValue > 0
											? `Complete ${progressData.remainingValue} more ${progressData.goal?.unit || "drills"} to reach your daily target`
											: "Daily goal completed! 🎉"
										: "Set your daily practice goal"}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{progressData ? (
									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span>Progress</span>
											<span>
												{progressData.goal?.currentValue || 0}/
												{progressData.goal?.targetValue || 0}{" "}
												{progressData.goal?.unit || "drills"}
											</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className="bg-blue-600 h-2 rounded-full transition-all duration-300"
												style={{
													width: `${Math.min(progressData.progressPercentage, 100)}%`,
												}}
											/>
										</div>
										{progressData.estimatedCompletionDate &&
											progressData.remainingValue > 0 && (
												<p className="text-xs text-muted-foreground">
													Estimated completion:{" "}
													{new Date(
														progressData.estimatedCompletionDate,
													).toLocaleTimeString()}
												</p>
											)}
									</div>
								) : (
									<div className="space-y-2">
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-2 w-full" />
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Featured Content */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Featured Drill</CardTitle>
							<CardDescription>
								Recommended based on your progress
							</CardDescription>
						</CardHeader>
						<CardContent>
							{featuredContent ? (
								<div className="space-y-4">
									<h3 className="font-semibold">{featuredContent.title}</h3>
									<p className="text-sm text-muted-foreground">
										{featuredContent.description}
									</p>
									<div className="flex items-center justify-between">
										<Badge variant="secondary">
											{featuredContent.difficulty}
										</Badge>
										<Button size="sm" asChild>
											<Link href={featuredContent.link}>Start Drill</Link>
										</Button>
									</div>
								</div>
							) : (
								<div className="space-y-4">
									<Skeleton className="h-6 w-48" />
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-3/4" />
									<div className="flex items-center justify-between">
										<Skeleton className="h-6 w-20" />
										<Skeleton className="h-8 w-24" />
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Study Tips</CardTitle>
							<CardDescription>
								Personalized tips to improve your interview performance
							</CardDescription>
						</CardHeader>
						<CardContent>
							{studyTips.length > 0 ? (
								<div className="space-y-3">
									{studyTips.map((tip, index) => (
										<Alert key={tip}>
											<AlertDescription>
												<strong>Tip {index + 1}:</strong> {tip}
											</AlertDescription>
										</Alert>
									))}
								</div>
							) : (
								<div className="space-y-3">
									<Skeleton className="h-16 w-full" />
									<Skeleton className="h-16 w-full" />
									<Skeleton className="h-16 w-full" />
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Plan Upgrade Prompt for Free Users */}
				{userPlanData.plan?.entitlementLevel === "FREE" && (
					<Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
						<CardHeader>
							<CardTitle className="text-blue-800 flex items-center gap-2">
								🚀 Unlock Your Full Potential
							</CardTitle>
							<CardDescription className="text-blue-600">
								Upgrade to Pro for unlimited drills, advanced analytics, and
								personalized coaching
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<p className="text-sm text-blue-700">
										• Unlimited practice sessions
									</p>
									<p className="text-sm text-blue-700">
										• Advanced performance analytics
									</p>
									<p className="text-sm text-blue-700">
										• Personalized study recommendations
									</p>
								</div>
								<Button
									className="bg-blue-600 hover:bg-blue-700"
									onClick={() => router.push("/plans")}
								>
									Upgrade to Pro
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Trial Expiration Warning */}
				{userPlanData.plan?.entitlementLevel === "TRIAL" &&
					!userPlanData.plan.isActive && (
						<Card className="border-orange-200 bg-orange-50">
							<CardHeader>
								<CardTitle className="text-orange-800 flex items-center gap-2">
									⚠️ Trial Expired
								</CardTitle>
								<CardDescription className="text-orange-600">
									Your trial has ended. Upgrade to continue practicing with
									unlimited access.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Button
									className="bg-orange-600 hover:bg-orange-700"
									onClick={() => router.push("/plans")}
								>
									Upgrade Now
								</Button>
							</CardContent>
						</Card>
					)}
			</div>
		</div>
	);
}
