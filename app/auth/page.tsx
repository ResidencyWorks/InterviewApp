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
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="text-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
				<p className="mt-2 text-gray-600">Redirecting to login...</p>
			</div>
		</div>
	);
}
