import { NextResponse } from "next/server";

export async function GET(
	_request: Request,
	{ params }: { params: { analysisId: string } },
) {
	// Placeholder: In a full implementation we'd fetch from storage/cache
	const { analysisId } = params;
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
