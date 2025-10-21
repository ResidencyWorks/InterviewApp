import { NextResponse } from "next/server";
import { contentPackLoader } from "@/lib/content";
import { timeOperation } from "@/lib/monitoring/performance";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const { result } = await timeOperation("content.list", async () => {
			const packs = await contentPackLoader.list();
			const active = await contentPackLoader.getActive();
			return {
				activeId: active?.id ?? null,
				packs,
			};
		});

		return NextResponse.json(result);
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}
