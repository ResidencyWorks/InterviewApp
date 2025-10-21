"use client";

import { useState } from "react";
import { uuidv4 } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks";

interface LoginFormProps {
	onSuccess?: () => void;
	redirectTo?: string;
	className?: string;
}

/**
 * Reusable login form component
 * Can be embedded in other pages or used standalone
 */
export function LoginForm({
	onSuccess,
	redirectTo: _redirectTo,
	className,
}: LoginFormProps) {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const { signIn } = useAuth();
	const emailId = `email-${uuidv4()}-${Date.now()}`;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setMessage("");

		try {
			await signIn(email);
			setMessage("Check your email for the magic link!");
			onSuccess?.();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to send magic link",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className={className}>
			<div className="space-y-4">
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

				<Button type="submit" className="w-full" disabled={loading || !email}>
					{loading ? "Sending magic link..." : "Send magic link"}
				</Button>
			</div>
		</form>
	);
}
