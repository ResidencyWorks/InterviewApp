import { NextResponse } from "next/server";
import { generateSampleContentPackWorkbook } from "@/features/booking/application/content-pack/excel-utils";

export async function GET() {
	const buffer = generateSampleContentPackWorkbook();
	return new NextResponse(buffer as unknown as BodyInit, {
		headers: {
			"Content-Type":
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Disposition": 'attachment; filename="sample-content-pack.xlsx"',
			"Cache-Control": "no-store",
		},
	});
}
