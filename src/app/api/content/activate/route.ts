import { type NextRequest, NextResponse } from "next/server";
import { contentPackLoader } from "@/features/booking/application/content";
import { timeOperation } from "@/features/scheduling/infrastructure/monitoring/performance";

export async function POST(request: NextRequest) {
	try {
		const { packId } = await request.json();
		if (!packId || typeof packId !== "string") {
			return NextResponse.json(
				{ error: "packId is required" },
				{ status: 400 },
			);
		}

		const { result } = await timeOperation("content.activate", async () => {
			await contentPackLoader.setActive(packId);
			const active = await contentPackLoader.getActive();
			return { activeId: active?.id ?? null };
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
