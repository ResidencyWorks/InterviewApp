import { NextResponse } from "next/server";
import type { File } from "@/domain/structure-analysis/entities/File";
import { ConsistencyValidatorService } from "@/domain/structure-analysis/services/ConsistencyValidator";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ analysisId: string }> },
) {
	const { analysisId } = await params;
	// Placeholder: in full impl, we'd retrieve files by analysisId
	const validator = new ConsistencyValidatorService();
	const files: File[] = [];
	const summary = await validator.validate(files); // empty for placeholder
	return NextResponse.json({
		success: true,
		data: { analysisId, summary },
	});
}
