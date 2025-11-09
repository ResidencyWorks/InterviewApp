import { NextResponse } from "next/server";
import { healthService } from "@/features/scheduling/infrastructure/monitoring/health-service";

export async function GET() {
	try {
		const health = await healthService.getSystemHealth();
		const statusCode = health.status === "healthy" ? 200 : 503;
		return NextResponse.json(health, { status: statusCode });
	} catch (error) {
		return NextResponse.json(
			{
				status: "unhealthy",
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
