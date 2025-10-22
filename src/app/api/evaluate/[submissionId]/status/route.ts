import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_request: NextRequest,
	{ params }: { params: { submissionId: string } },
) {
	try {
		const { submissionId } = params;

		if (!submissionId) {
			return NextResponse.json(
				{ error: "Submission ID is required" },
				{ status: 400 },
			);
		}

		// Mock implementation - replace with actual status lookup
		const status = {
			submissionId,
			status: "completed",
			progress: 100,
			createdAt: new Date().toISOString(),
		};

		return NextResponse.json(status);
	} catch {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
