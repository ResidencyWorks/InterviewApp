"use client";

import { useEffect, useState } from "react";

export default function TestCallbackPage() {
	const [result, setResult] = useState<string>("Testing...");

	useEffect(() => {
		// Test if we can access the callback route
		fetch("/auth/callback?test=1")
			.then((response) => {
				if (response.redirected) {
					setResult(`Redirected to: ${response.url}`);
				} else {
					setResult(`Status: ${response.status}`);
				}
			})
			.catch((error) => {
				setResult(`Error: ${error.message}`);
			});
	}, []);

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-2xl mx-auto">
				<h1 className="text-2xl font-bold mb-4">Callback Route Test</h1>
				<div className="bg-white p-6 rounded-lg shadow">
					<p>Result: {result}</p>
				</div>
			</div>
		</div>
	);
}
