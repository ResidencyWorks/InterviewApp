import { NextResponse } from "next/server";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ analysisId: string }> },
) {
	const { analysisId } = await params;
	// Placeholder: In a full implementation we'd fetch from storage/cache
	return NextResponse.json({
		success: true,
		data: {
			analysisId,
			status: "completed",
			progress: 100,
			startedAt: new Date(Date.now() - 2500).toISOString(),
			completedAt: new Date().toISOString(),
			estimatedTimeRemaining: 0,
		},
	});
}
