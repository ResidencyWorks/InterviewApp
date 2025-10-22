"use client";

import type { AuthUser } from "@supabase/supabase-js";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks";
import { authService } from "@/lib/auth/auth-service";

interface UserProfileProps {
	className?: string;
}

/**
 * User profile management component
 * Allows users to view and update their profile information
 */
export function UserProfile({ className }: UserProfileProps) {
	const { user } = useAuth() as { user: AuthUser | null };
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [formData, setFormData] = useState({
		avatar_url: user?.user_metadata?.avatar_url || "",
		full_name: user?.user_metadata?.full_name || "",
	});
	const emailId = `email-${user?.id}`;
	const fullNameId = `full-name-${user?.id}`;
	const avatarUrlId = `avatar-url-${user?.id}`;

	if (!user) {
		return (
			<Alert variant="destructive">
				You must be logged in to view your profile.
			</Alert>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setMessage("");

		try {
			await authService.updateProfile(formData);
			setMessage("Profile updated successfully!");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update profile");
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	return (
		<div className={className}>
			<Card>
				<CardHeader>
					<CardTitle>Profile Settings</CardTitle>
					<CardDescription>
						Update your profile information and preferences
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email Address</Label>
							<Input
								id={emailId}
								type="email"
								value={user.email || ""}
								disabled
								className="bg-gray-50"
							/>
							<p className="text-xs text-gray-500">
								Email address cannot be changed
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="full_name">Full Name</Label>
							<Input
								id={fullNameId}
								type="text"
								value={formData.full_name}
								onChange={(e) => handleInputChange("full_name", e.target.value)}
								placeholder="Enter your full name"
								disabled={loading}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="avatar_url">Avatar URL</Label>
							<Input
								id={avatarUrlId}
								type="url"
								value={formData.avatar_url}
								onChange={(e) =>
									handleInputChange("avatar_url", e.target.value)
								}
								placeholder="https://example.com/avatar.jpg"
								disabled={loading}
							/>
						</div>

						<div className="space-y-2">
							<Label>Account Type</Label>
							<div className="flex items-center space-x-2">
								<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
									{user.user_metadata?.entitlement_level || "FREE"}
								</span>
								{user.user_metadata?.entitlement_level === "FREE" && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => window.open("/upgrade", "_blank")}
									>
										Upgrade
									</Button>
								)}
							</div>
						</div>

						{error && <Alert variant="destructive">{error}</Alert>}

						{message && <Alert>{message}</Alert>}

						<Button type="submit" disabled={loading} className="w-full">
							{loading ? "Updating..." : "Update Profile"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
