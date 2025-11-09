import { type NextRequest, NextResponse } from "next/server";
import { handleStripeWebhookRequest } from "@/features/billing/application/stripe-webhook";

export async function POST(request: NextRequest) {
	const { body, status } = await handleStripeWebhookRequest(request);
	return NextResponse.json(body, { status });
}
