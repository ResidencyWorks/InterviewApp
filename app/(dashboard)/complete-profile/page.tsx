"use client";

import { CheckCircle, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/auth/auth-service";

export default function CompleteProfilePage() {
	const { user } = useAuth();
	const _router = useRouter();

	const [formData, setFormData] = useState({
		full_name: "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Note: Authentication and profile completion routing is now handled by middleware
	// No client-side redirects needed

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
		setError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			if (!user?.id) {
				throw new Error("User ID is required");
			}

			// Update user metadata instead of directly manipulating the users table
			// This approach works with the auth system and triggers
			const updatedUser = await authService.updateProfile({
				full_name: formData.full_name.trim(),
			});

			if (!updatedUser) {
				throw new Error("Failed to update user profile");
			}

			setSuccess(true);

			// Force a full page reload to trigger middleware re-evaluation
			// The middleware will redirect to dashboard if profile is now complete
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error) {
			console.error("Error updating profile:", error);
			setError(
				error instanceof Error ? error.message : "Failed to update profile",
			);
		} finally {
			setLoading(false);
		}
	};

	// Note: Authentication and profile completion routing is handled by middleware
	// No client-side loading checks needed

	if (success) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="text-center">
							<CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
							<h2 className="text-2xl font-bold text-gray-900 mb-2">
								Profile Complete!
							</h2>
							<p className="text-gray-600 mb-4">
								Your profile has been successfully updated. Redirecting to
								dashboard...
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<Card className="w-full max-w-2xl">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold text-gray-900">
						Complete Your Profile
					</CardTitle>
					<CardDescription>
						Please provide your name to get started with your interview
						preparation journey.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Full Name */}
						<div className="space-y-2">
							<Label htmlFor="full_name" className="flex items-center gap-2">
								<UserIcon className="h-4 w-4" />
								Full Name *
							</Label>
							<Input
								id={`full-name-${user?.id}`}
								type="text"
								value={formData.full_name}
								onChange={(e) => handleInputChange("full_name", e.target.value)}
								placeholder="Enter your full name"
								required
							/>
						</div>

						{/* Error message */}
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						{/* Submit button */}
						<Button
							type="submit"
							className="w-full"
							disabled={loading || !formData.full_name.trim()}
						>
							{loading ? "Updating Profile..." : "Complete Profile"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
