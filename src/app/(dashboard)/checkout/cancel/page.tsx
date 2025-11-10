"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function CheckoutCancelPage() {
	const router = useRouter();

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
						<XCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
					</div>
					<CardTitle className="text-2xl">Payment Cancelled</CardTitle>
					<CardDescription>
						Your payment was cancelled. No charges were made.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
						<p className="text-sm text-orange-800 dark:text-orange-300">
							You can return to the plans page anytime to complete your
							subscription.
						</p>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col space-y-2">
					<Button className="w-full" onClick={() => router.push("/plans")}>
						View Plans
					</Button>
					<Button
						variant="outline"
						className="w-full"
						onClick={() => router.push("/dashboard")}
					>
						Back to Dashboard
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
