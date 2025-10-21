import { type NextRequest, NextResponse } from "next/server";
import { contentPackLoader } from "@/lib/content";
import { timeOperation } from "@/lib/monitoring/performance";

export async function POST(request: NextRequest) {
	try {
		const { backupId } = await request.json();
		if (!backupId || typeof backupId !== "string") {
			return NextResponse.json(
				{ error: "backupId is required" },
				{ status: 400 },
			);
		}

		const { result } = await timeOperation("content.rollback", async () => {
			const restored = await contentPackLoader.restore(backupId);
			if (!restored) throw new Error("Backup not found");
			await contentPackLoader.setActive(restored.id);
			return { activeId: restored.id };
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
