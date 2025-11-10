/**
 * POST /api/webhooks/stripe
 * Processes Stripe webhook events for payment confirmations
 * IMPORTANT: Body must remain raw (not parsed as JSON) for signature verification
 */

import { type NextRequest, NextResponse } from "next/server";
import { handleStripeWebhookRequest } from "@/features/billing/application/stripe-webhook";

/**
 * Handle Stripe webhook events
 * @param request - Next.js request object with raw body
 * @returns Promise resolving to NextResponse with webhook processing result
 */
export async function POST(request: NextRequest) {
	// Body is already raw text in handleStripeWebhookRequest
	// This route handler preserves the raw body for signature verification
	const { body, status } = await handleStripeWebhookRequest(request);
	return NextResponse.json(body, { status });
}
