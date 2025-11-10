"use client";

import { CheckCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function CheckoutSuccessPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [sessionId, setSessionId] = useState<string | null>(null);

	useEffect(() => {
		const sessionIdParam = searchParams.get("session_id");
		if (sessionIdParam) {
			setSessionId(sessionIdParam);
		}
	}, [searchParams]);

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
						<CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
					</div>
					<CardTitle className="text-2xl">Payment Successful!</CardTitle>
					<CardDescription>
						Your subscription has been activated successfully.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{sessionId && (
						<div className="text-sm text-muted-foreground">
							<p>Session ID: {sessionId}</p>
						</div>
					)}
					<div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
						<p className="text-sm text-green-800 dark:text-green-300">
							Your account has been upgraded. You now have access to all Pro
							features!
						</p>
					</div>
				</CardContent>
				<CardFooter>
					<Button className="w-full" onClick={() => router.push("/dashboard")}>
						Go to Dashboard
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
