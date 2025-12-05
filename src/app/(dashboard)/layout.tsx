"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { ContentPackMissingBanner } from "@/components/content/ContentPackMissingBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user, loading } = useAuth();
	const router = useRouter();
	const _pathname = usePathname();
	const isAdmin = user?.user_metadata?.role === "admin";

	// Redirect to login if no user (must be in useEffect to avoid render-time navigation)
	useEffect(() => {
		if (!loading && !user) {
			router.push("/login");
		}
	}, [user, loading, router]);

	// Show loading state while checking authentication
	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="mt-4 text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	// Show redirecting state if no user
	if (!user) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="mt-4 text-muted-foreground">Redirecting to login...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Navigation Header */}
			<header className="bg-card border-b border-border">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						{/* Logo */}
						<div className="flex items-center">
							<Link
								href="/dashboard"
								className="flex items-center space-x-2 text-xl font-bold text-foreground"
							>
								<Image
									src="/images/logos/logo.png"
									alt="InterviewPrep"
									width={48}
									height={48}
								/>
								InterviewPrep
							</Link>
						</div>

						{/* Navigation */}
						<nav className="hidden md:flex space-x-8">
							<Link
								href="/dashboard"
								className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
							>
								Dashboard
							</Link>
							<Link
								href="/drill"
								className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
							>
								Drills
							</Link>
							<Link
								href="/profile"
								className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
							>
								Profile
							</Link>
							<Link
								href="/settings"
								className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
							>
								Settings
							</Link>
							{isAdmin && (
								<Link
									href="/admin"
									className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
								>
									Admin
								</Link>
							)}
						</nav>

						{/* User Menu */}
						<div className="flex items-center space-x-4">
							<ThemeToggle />
							{loading ? (
								<div className="flex items-center space-x-2">
									<div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
									<span className="text-xs text-gray-500 dark:text-gray-400">
										Loading...
									</span>
								</div>
							) : user ? (
								<UserMenu />
							) : (
								<Link
									href="/login"
									className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
								>
									Sign In
								</Link>
							)}
						</div>
					</div>
				</div>
			</header>

			{/* Content Pack Missing Banner */}
			<ContentPackMissingBanner />

			{/* Main Content */}
			<main className="flex-1">{children}</main>

			{/* Footer */}
			<footer className="bg-card border-t border-border mt-12">
				<div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
					<div className="text-center text-sm text-muted-foreground">
						<p>
							&copy; {new Date().getFullYear()} InterviewPrep. All rights
							reserved.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
