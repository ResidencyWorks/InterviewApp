import { type NextRequest, NextResponse } from "next/server";
import {
	type PerformanceMetrics,
	performanceOptimizer,
} from "@/features/scheduling/infrastructure/scaling/performance-optimizer";
import { logger } from "@/infrastructure/logging/logger";

/**
 * GET /api/scaling
 * @returns Scaling and performance information
 */
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const action = url.searchParams.get("action") || "metrics";

		switch (action) {
			case "metrics": {
				const metrics = performanceOptimizer.getPerformanceMetrics();
				const currentMetrics =
					performanceOptimizer.getCurrentPerformanceMetrics();
				return NextResponse.json(
					{
						metrics: metrics.slice(-100), // Return last 100 metrics
						current: currentMetrics,
					},
					{ status: 200 },
				);
			}

			case "config": {
				const config = performanceOptimizer.getScalingConfig();
				return NextResponse.json({ config }, { status: 200 });
			}

			case "health": {
				const health = {
					status: "healthy",
					timestamp: new Date().toISOString(),
					metrics: performanceOptimizer.getCurrentPerformanceMetrics(),
				};
				return NextResponse.json({ health }, { status: 200 });
			}

			default:
				return NextResponse.json(
					{
						error: "Invalid action. Supported actions: metrics, config, health",
					},
					{ status: 400 },
				);
		}
	} catch (error) {
		logger.error("Failed to get scaling information", error as Error, {
			component: "ScalingAPI",
			action: "GET",
		});

		return NextResponse.json(
			{
				error: "Failed to get scaling information",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/scaling
 * @param request - Request containing scaling configuration or action
 * @returns Success response
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action, ...data } = body;

		if (!action) {
			return NextResponse.json(
				{ error: "Missing required field: action" },
				{ status: 400 },
			);
		}

		switch (action) {
			case "update-config": {
				const { config } = data;

				if (!config) {
					return NextResponse.json(
						{ error: "Missing required field: config" },
						{ status: 400 },
					);
				}

				performanceOptimizer.updateScalingConfig(config);
				return NextResponse.json({ success: true }, { status: 200 });
			}

			case "add-rule": {
				const {
					id,
					name,
					description,
					enabled,
					condition,
					action: ruleAction,
				} = data;

				if (!id || !name || !description || !condition || !ruleAction) {
					return NextResponse.json(
						{
							error:
								"Missing required fields: id, name, description, condition, action",
						},
						{ status: 400 },
					);
				}

				performanceOptimizer.addOptimizationRule({
					id,
					name,
					description,
					enabled: enabled !== false,
					condition: new Function("metrics", `return ${condition}`) as (
						metrics: PerformanceMetrics,
					) => boolean,
					action: new Function("metrics", `return ${ruleAction}`) as (
						metrics: PerformanceMetrics,
					) => Promise<void>,
				});

				return NextResponse.json({ success: true }, { status: 200 });
			}

			case "remove-rule": {
				const { ruleId } = data;

				if (!ruleId) {
					return NextResponse.json(
						{ error: "Missing required field: ruleId" },
						{ status: 400 },
					);
				}

				performanceOptimizer.removeOptimizationRule(ruleId);
				return NextResponse.json({ success: true }, { status: 200 });
			}

			case "scale-up":
				// Implement scale-up logic
				logger.info("Scale-up requested", {
					component: "ScalingAPI",
					action: "scale-up",
					metadata: data,
				});
				return NextResponse.json(
					{ success: true, message: "Scale-up initiated" },
					{ status: 200 },
				);

			case "scale-down":
				// Implement scale-down logic
				logger.info("Scale-down requested", {
					component: "ScalingAPI",
					action: "scale-down",
					metadata: data,
				});
				return NextResponse.json(
					{ success: true, message: "Scale-down initiated" },
					{ status: 200 },
				);

			default:
				return NextResponse.json(
					{
						error:
							"Invalid action. Supported actions: update-config, add-rule, remove-rule, scale-up, scale-down",
					},
					{ status: 400 },
				);
		}
	} catch (error) {
		logger.error("Failed to execute scaling action", error as Error, {
			component: "ScalingAPI",
			action: "POST",
		});

		return NextResponse.json(
			{
				error: "Failed to execute scaling action",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
