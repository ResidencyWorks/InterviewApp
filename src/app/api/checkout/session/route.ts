/**
 * POST /api/checkout/session
 * Creates a Stripe checkout session for entitlement purchase
 */

import { type NextRequest, NextResponse } from "next/server";
import { CreateCheckoutSessionUseCase } from "@/features/billing/application/checkout/CreateCheckoutSessionUseCase";
import {
	type CreateCheckoutSessionRequest,
	validateCreateCheckoutSessionRequest,
} from "@/features/billing/application/checkout/dto/CreateCheckoutSessionRequest";
import { StripeCheckoutAdapter } from "@/features/billing/infrastructure/stripe/StripeCheckoutAdapter";
import { getPostHogClient } from "@/infrastructure/config/clients";
import { createClient } from "@/infrastructure/supabase/server";
import type { CreateCheckoutSessionResponse } from "@/shared/types/billing";

/**
 * Create a checkout session for entitlement purchase
 * @param request - Next.js request object
 * @returns Promise resolving to NextResponse with checkout session URL or error
 */
export async function POST(request: NextRequest) {
	try {
		// Authenticate user
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{
					error: "Authentication required",
					code: "UNAUTHORIZED",
				},
				{ status: 401 },
			);
		}

		// Parse and validate request body
		let requestBody: CreateCheckoutSessionRequest;
		try {
			const body = await request.json();
			requestBody = validateCreateCheckoutSessionRequest(body);
		} catch (error) {
			return NextResponse.json(
				{
					error:
						error instanceof Error ? error.message : "Invalid request body",
					code: "INVALID_ENTITLEMENT_LEVEL",
				},
				{ status: 400 },
			);
		}

		// Create checkout session
		const checkoutAdapter = new StripeCheckoutAdapter();
		const useCase = new CreateCheckoutSessionUseCase(checkoutAdapter);

		const checkoutSession = await useCase.execute({
			userId: user.id,
			entitlementLevel: requestBody.entitlementLevel,
		});

		// Build response
		const response: CreateCheckoutSessionResponse = {
			sessionId: checkoutSession.id,
			url: checkoutSession.url,
			expiresAt: checkoutSession.expiresAt
				? checkoutSession.expiresAt.toISOString()
				: new Date(Date.now() + 3600000).toISOString(), // Default 1 hour
		};

		// Track analytics event
		const posthog = getPostHogClient();
		if (posthog) {
			posthog.capture({
				distinctId: user.id,
				event: "checkout_session_created",
				properties: {
					sessionId: checkoutSession.id,
					entitlementLevel: requestBody.entitlementLevel,
					userId: user.id,
					timestamp: new Date().toISOString(),
				},
			});
		}

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("Checkout session creation error:", error);

		// Handle Stripe-specific errors
		if (error instanceof Error && error.message.includes("Stripe")) {
			return NextResponse.json(
				{
					error: "Failed to create checkout session",
					code: "STRIPE_ERROR",
					message: error.message,
				},
				{ status: 400 },
			);
		}

		// Generic error response
		return NextResponse.json(
			{
				error: "Internal server error",
				code: "INTERNAL_SERVER_ERROR",
			},
			{ status: 500 },
		);
	}
}
