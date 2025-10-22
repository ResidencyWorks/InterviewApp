"use client";

import { Settings, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
	const { user } = useAuth();
	const isAdmin = user?.user_metadata?.role === "admin";

	// Check for error messages from URL params
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const error = urlParams.get("error");

		if (error === "insufficient_permissions") {
			setErrorMessage("You don't have permission to access that page.");
			// Clean up URL
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}, []);

	return (
		<div className="min-h-screen bg-gray-50 p-6">
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
						<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
						<p className="text-gray-600">
							Welcome back! Here's what's happening with your interview prep.
						</p>
					</div>
					<div className="flex items-center space-x-4">
						<Badge variant="outline" className="text-sm">
							Premium Plan
						</Badge>
						<Avatar>
							<AvatarFallback className="bg-gray-200 text-gray-800">
								U
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
							<Badge variant="secondary">+12%</Badge>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">24</div>
							<p className="text-xs text-muted-foreground">+2 from last week</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Completed</CardTitle>
							<Badge variant="secondary">+8%</Badge>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">18</div>
							<p className="text-xs text-muted-foreground">+1 from last week</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Average Score
							</CardTitle>
							<Badge variant="secondary">+5%</Badge>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">87%</div>
							<p className="text-xs text-muted-foreground">
								+3% from last week
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Streak</CardTitle>
							<Badge variant="secondary">+2 days</Badge>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">7 days</div>
							<p className="text-xs text-muted-foreground">Keep it up!</p>
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
								<div className="flex items-center space-x-4">
									<div className="w-2 h-2 bg-green-500 rounded-full" />
									<div className="flex-1">
										<p className="text-sm font-medium">
											Completed JavaScript Fundamentals
										</p>
										<p className="text-xs text-muted-foreground">
											2 hours ago • Score: 92%
										</p>
									</div>
									<Badge variant="outline">Completed</Badge>
								</div>

								<div className="flex items-center space-x-4">
									<div className="w-2 h-2 bg-blue-500 rounded-full" />
									<div className="flex-1">
										<p className="text-sm font-medium">
											Started React Patterns
										</p>
										<p className="text-xs text-muted-foreground">
											5 hours ago • In Progress
										</p>
									</div>
									<Badge variant="secondary">In Progress</Badge>
								</div>

								<div className="flex items-center space-x-4">
									<div className="w-2 h-2 bg-yellow-500 rounded-full" />
									<div className="flex-1">
										<p className="text-sm font-medium">System Design Basics</p>
										<p className="text-xs text-muted-foreground">
											1 day ago • Score: 78%
										</p>
									</div>
									<Badge variant="outline">Completed</Badge>
								</div>
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
									Complete 2 more drills to reach your daily target
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span>Progress</span>
										<span>2/4 drills</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-blue-600 h-2 rounded-full"
											style={{ width: "50%" }}
										/>
									</div>
								</div>
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
							<div className="space-y-4">
								<h3 className="font-semibold">Advanced React Patterns</h3>
								<p className="text-sm text-muted-foreground">
									Master higher-order components, render props, and custom hooks
								</p>
								<div className="flex items-center justify-between">
									<Badge variant="secondary">Intermediate</Badge>
									<Button size="sm" asChild>
										<Link href="/drill/advanced-react">Start Drill</Link>
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Study Tips</CardTitle>
							<CardDescription>
								Tips to improve your interview performance
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Alert>
								<AlertDescription>
									<strong>Pro Tip:</strong> Practice explaining your code out
									loud. This helps you articulate your thought process during
									interviews.
								</AlertDescription>
							</Alert>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
