"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { EntitlementLevel } from "@/shared/types/billing";

interface Plan {
	id: EntitlementLevel;
	name: string;
	description: string;
	price: string;
	features: string[];
	popular?: boolean;
}

const plans: Plan[] = [
	{
		id: "FREE",
		name: "Free",
		description: "Perfect for getting started",
		price: "$0",
		features: [
			"Limited practice sessions",
			"Basic performance tracking",
			"Community support",
		],
	},
	{
		id: "TRIAL",
		name: "Trial",
		description: "Try Pro features for free",
		price: "Free",
		features: ["All Pro features", "7-day trial period", "Cancel anytime"],
	},
	{
		id: "PRO",
		name: "Pro",
		description: "Unlock your full potential",
		price: "$29",
		popular: true,
		features: [
			"Unlimited practice sessions",
			"Advanced performance analytics",
			"Personalized study recommendations",
			"Priority support",
			"Export your progress data",
		],
	},
	{
		id: "PRO" as EntitlementLevel, // Using PRO for now, can be extended later
		name: "Enterprise",
		description: "For teams and organizations",
		price: "Custom",
		features: [
			"Everything in Pro",
			"Team collaboration tools",
			"Custom content packs",
			"Dedicated account manager",
			"Advanced reporting & analytics",
			"SSO integration",
			"Custom branding",
		],
	},
];

export default function PlansPage() {
	const { user } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleSelectPlan = async (entitlementLevel: EntitlementLevel) => {
		// Don't allow selecting FREE plan
		if (entitlementLevel === "FREE") {
			return;
		}

		setLoading(entitlementLevel);
		setError(null);

		try {
			const response = await fetch("/api/checkout/session", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ entitlementLevel }),
			});

			if (!response.ok) {
				let errorMessage = "Failed to create checkout session";
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorData.message || errorMessage;
					if (errorData.code) {
						errorMessage += ` (${errorData.code})`;
					}
				} catch {
					// If response is not JSON, use status text
					errorMessage = `Server error: ${response.status} ${response.statusText}`;
				}
				throw new Error(errorMessage);
			}

			const data = await response.json();

			// Redirect to Stripe checkout
			if (data.url) {
				window.location.href = data.url;
			} else {
				throw new Error("No checkout URL received from server");
			}
		} catch (err) {
			console.error("Checkout error:", err);
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to start checkout. Please try again.";
			setError(errorMessage);
			setLoading(null);
		}
	};

	return (
		<div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-foreground mb-4">
						Choose Your Plan
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Select the plan that best fits your interview preparation needs
					</p>
				</div>

				{/* Error Message */}
				{error && (
					<div className="max-w-4xl mx-auto mb-6">
						<div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive px-4 py-3 rounded-lg">
							{error}
						</div>
					</div>
				)}

				{/* Plans Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
					{plans.map((plan) => (
						<Card
							key={plan.name}
							className={`relative ${
								plan.popular
									? "border-primary shadow-lg scale-105"
									: "border-border"
							}`}
						>
							{plan.popular && (
								<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
									<span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
										Most Popular
									</span>
								</div>
							)}
							<CardHeader>
								<CardTitle className="text-2xl">{plan.name}</CardTitle>
								<CardDescription>{plan.description}</CardDescription>
								<div className="mt-4">
									<span className="text-4xl font-bold text-foreground">
										{plan.price}
									</span>
									{plan.price !== "Free" && plan.price !== "$0" && (
										<span className="text-muted-foreground">/month</span>
									)}
								</div>
							</CardHeader>
							<CardContent>
								<ul className="space-y-3">
									{plan.features.map((feature) => (
										<li key={feature} className="flex items-start">
											<Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
											<span className="text-sm text-foreground">{feature}</span>
										</li>
									))}
								</ul>
							</CardContent>
							<CardFooter>
								{plan.id === "FREE" ? (
									<Button variant="outline" className="w-full" disabled>
										Current Plan
									</Button>
								) : plan.price === "Custom" ? (
									<Button
										variant="outline"
										className="w-full"
										onClick={() => {
											// For Enterprise, you could link to a contact form or email
											window.location.href =
												"mailto:sales@interviewprep.com?subject=Enterprise Plan Inquiry";
										}}
									>
										Contact Sales
									</Button>
								) : (
									<Button
										className={`w-full ${
											plan.popular ? "bg-primary hover:bg-primary/90" : ""
										}`}
										onClick={() => handleSelectPlan(plan.id)}
										disabled={loading !== null}
									>
										{loading === plan.id
											? "Processing..."
											: plan.id === "TRIAL"
												? "Start Free Trial"
												: "Select Plan"}
									</Button>
								)}
							</CardFooter>
						</Card>
					))}
				</div>

				{/* Back Button */}
				<div className="text-center mt-12">
					<Button variant="outline" onClick={() => router.push("/dashboard")}>
						Back to Dashboard
					</Button>
				</div>
			</div>
		</div>
	);
}
