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
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks";
import type { DrillProgress } from "@/hooks/useDrillProgress";

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
	const [drillProgress, setDrillProgress] = useState<DrillProgress | null>(
		null,
	);
	const { signIn, user, loading: authLoading } = useAuth();
	const router = useRouter();

	// Generate unique ID only on client side to prevent hydration mismatch
	useEffect(() => {
		setEmailId(`email-${Math.random().toString(36).substr(2, 9)}`);
	}, []);

	// Fetch drill progress for authenticated users
	useEffect(() => {
		const fetchProgress = async () => {
			if (user && !authLoading) {
				try {
					// First, fetch the active content pack evaluations
					const evaluationsResponse = await fetch(
						"/api/content-packs/active/evaluations",
					);
					if (!evaluationsResponse.ok) return;

					const evaluationsResult = await evaluationsResponse.json();
					// The API wraps the response in a 'data' property
					const evaluations = evaluationsResult.data?.evaluations || [];

					if (evaluations.length === 0) return;

					// Get progress for the first evaluation (or any in-progress one)
					for (const evaluation of evaluations) {
						const progressResponse = await fetch(
							`/api/drill/progress?drill_id=${evaluation.id}`,
						);
						if (progressResponse.ok) {
							const progressResult = await progressResponse.json();
							// The API wraps the response in a 'data' property
							const progress =
								progressResult.data?.progress || progressResult.progress;
							if (progress && !progress.completed_at) {
								setDrillProgress(progress);
								return; // Show the first incomplete drill
							}
						}
					}
				} catch (err) {
					console.error("Failed to fetch drill progress:", err);
				}
			}
		};
		fetchProgress();
	}, [user, authLoading]);

	// Redirect authenticated users to dashboard (proxy will handle profile completion routing)
	useEffect(() => {
		if (user && !authLoading) {
			console.log("Login page - User authenticated, redirecting to dashboard");
			router.push("/dashboard");
		}
	}, [user, authLoading, router]);

	// Show loading state while checking authentication
	if (user && authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">Redirecting...</p>
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
		<div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-foreground">
						Interview Drills
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Practice your interview skills with AI-powered feedback
					</p>

					{/* Show drill progress if user is authenticated and has progress */}
					{user && drillProgress && !drillProgress.completed_at && (
						<div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium">Your Progress</span>
								<span className="text-sm text-muted-foreground">
									{drillProgress.completed_questions} /{" "}
									{drillProgress.total_questions} questions
								</span>
							</div>
							<Progress
								value={
									(drillProgress.completed_questions /
										drillProgress.total_questions) *
									100
								}
								className="h-2"
							/>
							<Button
								onClick={() =>
									router.push(`/drill/${drillProgress.current_question_id}`)
								}
								className="w-full mt-3"
								size="sm"
							>
								Resume Drill
							</Button>
						</div>
					)}
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
							<p className="text-sm text-muted-foreground">
								New to Interview Drills?{" "}
								<span className="text-primary">
									Just enter your email to get started
								</span>
							</p>
						</div>
					</CardContent>
				</Card>

				<div className="text-center">
					<p className="text-xs text-muted-foreground">
						By signing in, you agree to our Terms of Service and Privacy Policy
					</p>
				</div>
			</div>
		</div>
	);
}
