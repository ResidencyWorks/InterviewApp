import { NextResponse } from "next/server";
import { ConsistencyValidatorService } from "@/domain/structure-analysis/services/ConsistencyValidator";

export async function GET(
	_request: Request,
	{ params }: { params: { analysisId: string } },
) {
	// Placeholder: in full impl, we'd retrieve files by analysisId
	const validator = new ConsistencyValidatorService();
	const summary = await validator.validate([] as any); // empty for placeholder
	return NextResponse.json({
		success: true,
		data: { analysisId: params.analysisId, summary },
	});
}
