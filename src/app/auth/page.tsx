"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
	const router = useRouter();

	useEffect(() => {
		console.log("Auth page - Redirecting to login");
		console.log("Router:", router);
		// Redirect to login page
		router.replace("/login");
	}, [router]);

	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<div className="text-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
				<p className="mt-2 text-muted-foreground">Redirecting to login...</p>
			</div>
		</div>
	);
}
