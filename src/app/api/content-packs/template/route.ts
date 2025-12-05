import { NextResponse } from "next/server";
import { generateContentPackTemplate } from "@/features/booking/application/content-pack/excel-utils";

export async function GET() {
	const buffer = generateContentPackTemplate();
	return new NextResponse(buffer as unknown as BodyInit, {
		headers: {
			"Content-Type":
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Disposition":
				'attachment; filename="content-pack-template.xlsx"',
			"Cache-Control": "no-store",
		},
	});
}
