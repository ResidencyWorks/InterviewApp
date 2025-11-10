"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

/**
 * Magic link login page
 * Allows users to sign in using their email address via magic link
 */
export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [emailId, setEmailId] = useState("email-input");
	const { signIn, user, loading: authLoading } = useAuth();
	const router = useRouter();

	// Generate unique ID only on client side to prevent hydration mismatch
	useEffect(() => {
		setEmailId(`email-${Math.random().toString(36).substr(2, 9)}`);
	}, []);

	// Redirect authenticated users to dashboard (middleware will handle profile completion routing)
	useEffect(() => {
		if (user && !authLoading) {
			console.log("Login page - User authenticated, redirecting to dashboard");
			router.push("/dashboard");
		}
	}, [user, authLoading, router]);

	// Show loading state while checking authentication
	if (user && authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-2 text-gray-600">Redirecting...</p>
				</div>
			</div>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setMessage("");

		try {
			await signIn(email);
			setMessage("Check your email for the magic link!");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to send magic link",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900">Interview Drills</h1>
					<p className="mt-2 text-sm text-gray-600">
						Practice your interview skills with AI-powered feedback
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Sign in to your account</CardTitle>
						<CardDescription>
							Enter your email address and we'll send you a magic link to sign
							in
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email address</Label>
								<Input
									id={emailId}
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Enter your email"
									required
									disabled={loading}
								/>
							</div>

							{error && <Alert variant="destructive">{error}</Alert>}

							{message && <Alert>{message}</Alert>}

							<Button
								type="submit"
								className="w-full"
								disabled={loading || !email}
							>
								{loading ? "Sending magic link..." : "Send magic link"}
							</Button>
						</form>

						<div className="mt-6 text-center">
							<p className="text-sm text-gray-600">
								New to Interview Drills?{" "}
								<span className="text-blue-600">
									Just enter your email to get started
								</span>
							</p>
						</div>
					</CardContent>
				</Card>

				<div className="text-center">
					<p className="text-xs text-gray-500">
						By signing in, you agree to our Terms of Service and Privacy Policy
					</p>
				</div>
			</div>
		</div>
	);
}
