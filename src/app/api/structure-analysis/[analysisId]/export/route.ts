import { NextResponse } from "next/server";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ analysisId: string }> },
) {
	const { analysisId } = await params;
	const u = new URL(request.url);
	const format = (u.searchParams.get("format") ?? "json").toLowerCase();
	const downloadUrl = `/api/structure-analysis/${analysisId}/download/report.${format}`;
	return NextResponse.json({
		success: true,
		data: {
			format,
			downloadUrl,
			expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
		},
	});
}
