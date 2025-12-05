/**
 * API endpoint for system status information
 * Provides comprehensive system health and status data for admin dashboard
 */

import { NextResponse } from "next/server";
import { healthService } from "@/features/scheduling/infrastructure/monitoring/health-service";
import { performanceOptimizer } from "@/features/scheduling/infrastructure/scaling/performance-optimizer";
import { logger } from "@/infrastructure/logging/logger";
import { contentPackCache } from "@/infrastructure/redis";
import { createClient } from "@/infrastructure/supabase/server";

/**
 * System status data interface matching the frontend component
 */
interface SystemStatusData {
	contentPack: {
		isActive: boolean;
		name?: string;
		version?: string;
		activatedAt?: string;
		activatedBy?: string;
	};
	database: {
		status: "connected" | "disconnected" | "error";
		lastCheck: string;
		responseTime?: number;
	};
	analytics: {
		status: "active" | "inactive" | "error";
		lastEvent?: string;
	};
	fallback: {
		isActive: boolean;
		warningDismissed: boolean;
	};
	uptime: {
		startTime: string;
		lastRestart?: string;
	};
	performance: {
		averageResponseTime: number;
		errorRate: number;
		requestCount: number;
	};
}

/**
 * GET /api/system/status - Get comprehensive system status
 */
export async function GET(): Promise<NextResponse> {
	try {
		logger.info("Fetching system status", { component: "SystemStatusAPI" });

		// Get system health from health service
		const systemHealth = await healthService.getSystemHealth();

		// Get performance metrics
		const performanceMetrics =
			performanceOptimizer.getCurrentPerformanceMetrics();

		// Determine database status based on system health
		let databaseStatus: "connected" | "disconnected" | "error" = "error";
		if (systemHealth.status === "healthy") {
			databaseStatus = "connected";
		} else if (systemHealth.status === "degraded") {
			databaseStatus = "disconnected";
		}

		// Check for active content pack - query database directly for accuracy
		let contentPackStatus: SystemStatusData["contentPack"] = {
			isActive: false,
		};

		try {
			// Query Supabase for activated content packs
			const supabase = await createClient();
			const { data: activatedPacks, error: queryError } = await supabase
				.from("content_packs")
				.select("id, name, version, activated_at, activated_by")
				.eq("status", "activated")
				.order("activated_at", { ascending: false })
				.limit(1);

			if (!queryError && activatedPacks && activatedPacks.length > 0) {
				const activePack = activatedPacks[0];
				contentPackStatus = {
					isActive: true,
					name: activePack.name,
					version: activePack.version,
					activatedAt: activePack.activated_at || undefined,
					activatedBy: activePack.activated_by || undefined,
				};

				logger.info("Active content pack found", {
					component: "SystemStatusAPI",
					metadata: {
						packId: activePack.id,
						packName: activePack.name,
						packVersion: activePack.version,
					},
				});
			} else {
				// Fallback to cache if database query fails or returns no results
				try {
					const activeContentPack = await contentPackCache.getActive();
					if (activeContentPack) {
						contentPackStatus = {
							isActive: true,
							name: activeContentPack.name,
							version: activeContentPack.version,
							activatedAt: undefined,
							activatedBy: undefined,
						};
						logger.info("Active content pack found in cache", {
							component: "SystemStatusAPI",
						});
					}
				} catch (cacheError) {
					logger.warn("Failed to check content pack cache", {
						component: "SystemStatusAPI",
						metadata: {
							errorMessage:
								cacheError instanceof Error
									? cacheError.message
									: String(cacheError),
						},
					});
				}
			}
		} catch (error) {
			logger.warn("Failed to check content pack status", {
				component: "SystemStatusAPI",
				metadata: {
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});
			// Continue with default inactive status
		}

		// Default fallback status (fallback mode is active when no content pack is loaded)
		const fallbackStatus = {
			isActive: !contentPackStatus.isActive,
			warningDismissed: false,
		};

		// Determine analytics status based on system health
		let analyticsStatus: "active" | "inactive" | "error" = "inactive";
		if (systemHealth.status === "healthy") {
			analyticsStatus = "active";
		} else if (systemHealth.status === "unhealthy") {
			analyticsStatus = "error";
		}

		// Calculate uptime
		const startTime = new Date(Date.now() - systemHealth.uptime).toISOString();

		// Build system status data
		const statusData: SystemStatusData = {
			contentPack: contentPackStatus,
			database: {
				status: databaseStatus,
				lastCheck: new Date().toISOString(),
			},
			analytics: {
				status: analyticsStatus,
				lastEvent: new Date().toISOString(),
			},
			fallback: fallbackStatus,
			uptime: {
				startTime,
				lastRestart: startTime, // For now, assume start time is last restart
			},
			performance: {
				averageResponseTime: performanceMetrics?.application?.responseTime || 0,
				errorRate: performanceMetrics?.application?.errorRate || 0,
				requestCount: performanceMetrics?.application?.throughput || 0,
			},
		};

		logger.info("System status fetched successfully", {
			component: "SystemStatusAPI",
		});

		return NextResponse.json(statusData, { status: 200 });
	} catch (error) {
		logger.error("Failed to fetch system status", error as Error, {
			component: "SystemStatusAPI",
		});

		// Return fallback status data
		const fallbackStatusData: SystemStatusData = {
			contentPack: { isActive: false },
			database: {
				status: "error",
				lastCheck: new Date().toISOString(),
			},
			analytics: { status: "error" },
			fallback: { isActive: true, warningDismissed: false },
			uptime: { startTime: new Date().toISOString() },
			performance: { averageResponseTime: 0, errorRate: 0, requestCount: 0 },
		};

		return NextResponse.json(fallbackStatusData, { status: 200 });
	}
}
