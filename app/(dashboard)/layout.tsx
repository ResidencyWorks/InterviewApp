"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user, loading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const isAdmin = user?.user_metadata?.role === "admin";

	// Note: Authentication routing is now handled by middleware
	// No client-side redirects needed

	// Show loading state while checking authentication
	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	// Don't render dashboard if no user (middleware will handle redirects)
	if (!user) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Navigation Header */}
			<header className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						{/* Logo */}
						<div className="flex items-center">
							<Link
								href="/dashboard"
								className="flex items-center space-x-2 text-xl font-bold text-gray-900"
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
								className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
							>
								Dashboard
							</Link>
							<Link
								href="/drill"
								className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
							>
								Drills
							</Link>
							<Link
								href="/profile"
								className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
							>
								Profile
							</Link>
							<Link
								href="/settings"
								className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
							>
								Settings
							</Link>
							{isAdmin && (
								<Link
									href="/admin"
									className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
								>
									Admin
								</Link>
							)}
						</nav>

						{/* User Menu */}
						<div className="flex items-center space-x-4">
							{loading ? (
								<div className="flex items-center space-x-2">
									<div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
									<span className="text-xs text-gray-500">Loading...</span>
								</div>
							) : user ? (
								<UserMenu />
							) : (
								<Link
									href="/login"
									className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
								>
									Sign In
								</Link>
							)}
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1">{children}</main>

			{/* Footer */}
			<footer className="bg-white border-t border-gray-200 mt-12">
				<div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
					<div className="text-center text-sm text-gray-500">
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
