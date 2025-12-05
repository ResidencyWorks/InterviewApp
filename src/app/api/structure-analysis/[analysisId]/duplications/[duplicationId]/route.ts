import { NextResponse } from "next/server";

export async function GET(
	_request: Request,
	{
		params,
	}: { params: Promise<{ analysisId: string; duplicationId: string }> },
) {
	const { analysisId, duplicationId } = await params;
	// Placeholder: In a full implementation we'd fetch duplication details by IDs
	return NextResponse.json({
		success: true,
		data: {
			id: duplicationId,
			serviceName: "UnknownService",
			locations: [],
			duplicationType: "implementation",
			overlapPercentage: 0,
			severity: "low",
			consolidationEffort: "low",
			consolidationImpact: "low",
			analysis: {
				commonFunctions: [],
				uniqueFunctions: [],
				interfaceOverlap: 0,
				implementationOverlap: 0,
			},
			analysisId,
		},
	});
}
