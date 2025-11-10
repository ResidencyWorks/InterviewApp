import { NextResponse } from "next/server";

export async function GET(
	_request: Request,
	{ params, url }: { params: { analysisId: string }; url: string },
) {
	const u = new URL(url);
	const format = (u.searchParams.get("format") ?? "json").toLowerCase();
	const downloadUrl = `/api/structure-analysis/${params.analysisId}/download/report.${format}`;
	return NextResponse.json({
		success: true,
		data: {
			format,
			downloadUrl,
			expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
		},
	});
}
