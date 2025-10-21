/**
 * Active Content Pack API Route
 *
 * @fileoverview API endpoint for getting the currently active content pack
 */

import type { NextRequest, NextResponse } from "next/server";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/lib/api/api-helpers";
import { ContentPackService } from "@/lib/domain/services/ContentPackService";
import { ContentPackValidator } from "@/lib/domain/services/ContentPackValidator";
import { PostHogAnalyticsService } from "@/lib/infrastructure/posthog/AnalyticsService";
import { SupabaseContentPackRepository } from "@/lib/infrastructure/supabase/ContentPackRepository";
import {
	createPostHogConfig,
	toAnalyticsServiceConfig,
} from "@/lib/posthog/client";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/content-packs/active
 * Get the currently active content pack
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		// Get authenticated user
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createErrorResponse(
				"Authentication required",
				"UNAUTHORIZED",
				401,
			);
		}

		// Initialize services
		const repository = new SupabaseContentPackRepository(supabase);
		const validator = new ContentPackValidator();

		// Initialize analytics service
		const postHogConfig = createPostHogConfig();
		const analyticsConfig = toAnalyticsServiceConfig(postHogConfig);
		const analyticsService = new PostHogAnalyticsService(analyticsConfig);

		// Initialize content pack service
		const contentPackService = new ContentPackService(
			repository,
			validator,
			analyticsService,
			{
				cacheEnabled: true,
				cacheTtl: 30 * 60 * 1000, // 30 minutes
				maxConcurrentActivations: 1,
				validationTimeout: 30000, // 30 seconds
				enableAnalytics: true,
			},
		);

		// Get active content pack
		const activeContentPack = await contentPackService.getActiveContentPack();

		if (!activeContentPack) {
			return createSuccessResponse({
				activeContentPack: null,
				message: "No active content pack found",
			});
		}

		// Get content pack statistics
		const statistics = await contentPackService.getContentPackStatistics(
			activeContentPack.id,
		);

		// Track page view for analytics
		try {
			await analyticsService.trackPageView(
				"active_content_pack_viewed",
				{
					contentPackId: activeContentPack.id,
					version: activeContentPack.version,
				},
				user.id,
			);
		} catch (error) {
			console.warn("Failed to track page view:", error);
			// Don't fail the request if analytics fails
		}

		return createSuccessResponse({
			activeContentPack: {
				id: activeContentPack.id,
				version: activeContentPack.version,
				name: activeContentPack.name,
				description: activeContentPack.description,
				schemaVersion: activeContentPack.schemaVersion,
				status: activeContentPack.status,
				createdAt: activeContentPack.createdAt,
				updatedAt: activeContentPack.updatedAt,
				activatedAt: activeContentPack.activatedAt,
				activatedBy: activeContentPack.activatedBy,
				uploadedBy: activeContentPack.uploadedBy,
				fileSize: activeContentPack.fileSize,
				checksum: activeContentPack.checksum,
				metadata: activeContentPack.metadata,
			},
			statistics: statistics
				? {
						id: statistics.id,
						version: statistics.version,
						name: statistics.name,
						status: statistics.status,
						fileSize: statistics.fileSize,
						createdAt: statistics.createdAt,
						activatedAt: statistics.activatedAt,
						activatedBy: statistics.activatedBy,
						uploadedBy: statistics.uploadedBy,
						validationTimeMs: statistics.validationTimeMs,
						activationTimeMs: statistics.activationTimeMs,
						usageCount: statistics.usageCount,
						lastUsedAt: statistics.lastUsedAt,
					}
				: null,
		});
	} catch (error) {
		console.error("Failed to get active content pack:", error);

		return createErrorResponse(
			"Failed to get active content pack",
			"GET_ACTIVE_FAILED",
			500,
			{ error: error instanceof Error ? error.message : "Unknown error" },
		);
	}
}

/**
 * DELETE /api/content-packs/active
 * Deactivate the currently active content pack
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
	try {
		// Get authenticated user
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createErrorResponse(
				"Authentication required",
				"UNAUTHORIZED",
				401,
			);
		}

		// Check if user has admin role (you may need to implement this based on your auth system)
		// For now, we'll assume all authenticated users can deactivate content packs
		// In a real implementation, you'd check user roles/permissions

		// Initialize services
		const repository = new SupabaseContentPackRepository(supabase);
		const validator = new ContentPackValidator();

		// Initialize analytics service
		const postHogConfig = createPostHogConfig();
		const analyticsConfig = toAnalyticsServiceConfig(postHogConfig);
		const analyticsService = new PostHogAnalyticsService(analyticsConfig);

		// Initialize content pack service
		const contentPackService = new ContentPackService(
			repository,
			validator,
			analyticsService,
			{
				cacheEnabled: true,
				cacheTtl: 30 * 60 * 1000, // 30 minutes
				maxConcurrentActivations: 1,
				validationTimeout: 30000, // 30 seconds
				enableAnalytics: true,
			},
		);

		// Get current active content pack
		const activeContentPack = await contentPackService.getActiveContentPack();
		if (!activeContentPack) {
			return createErrorResponse(
				"No active content pack found",
				"NO_ACTIVE_CONTENT_PACK",
				404,
			);
		}

		// Deactivate the content pack
		const deactivatedContentPack =
			await contentPackService.deactivateContentPack(user.id);

		if (!deactivatedContentPack) {
			return createErrorResponse(
				"No content pack was deactivated",
				"NO_CONTENT_PACK_DEACTIVATED",
				400,
			);
		}

		// Track deactivation event
		try {
			await analyticsService.track(
				"content_pack_deactivated",
				{
					contentPackId: deactivatedContentPack.id,
					version: deactivatedContentPack.version,
					deactivatedBy: user.id,
				},
				user.id,
			);
		} catch (error) {
			console.warn("Failed to track deactivation event:", error);
			// Don't fail the request if analytics fails
		}

		return createSuccessResponse({
			message: "Content pack deactivated successfully",
			contentPack: {
				id: deactivatedContentPack.id,
				version: deactivatedContentPack.version,
				name: deactivatedContentPack.name,
				status: deactivatedContentPack.status,
				updatedAt: deactivatedContentPack.updatedAt,
			},
		});
	} catch (error) {
		console.error("Content pack deactivation failed:", error);

		return createErrorResponse(
			"Failed to deactivate content pack",
			"DEACTIVATION_FAILED",
			500,
			{ error: error instanceof Error ? error.message : "Unknown error" },
		);
	}
}
