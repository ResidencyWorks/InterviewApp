/**
 * Content Pack Activation API Route
 *
 * @fileoverview API endpoint for activating content packs (hot-swap)
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
 * POST /api/content-packs/[id]/activate
 * Activate a content pack (hot-swap)
 */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
	try {
		const { id } = await params;

		if (!id) {
			return createErrorResponse(
				"Content pack ID is required",
				"MISSING_CONTENT_PACK_ID",
				400,
			);
		}

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
		// For now, we'll assume all authenticated users can activate content packs
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

		// Validate content pack exists and is valid
		const contentPack = await contentPackService.getContentPack(id);
		if (!contentPack) {
			return createErrorResponse(
				"Content pack not found",
				"CONTENT_PACK_NOT_FOUND",
				404,
			);
		}

		// Check if content pack is already active
		if (contentPack.status === "activated") {
			return createErrorResponse(
				"Content pack is already active",
				"ALREADY_ACTIVE",
				400,
			);
		}

		// Check if content pack is valid
		if (contentPack.status !== "valid") {
			return createErrorResponse(
				"Content pack must be valid before activation",
				"INVALID_CONTENT_PACK",
				400,
				{ status: contentPack.status },
			);
		}

		// Activate the content pack
		const activatedContentPack = await contentPackService.activateContentPack(
			id,
			user.id,
		);

		// Track activation event
		try {
			await analyticsService.track(
				"content_pack_activated",
				{
					contentPackId: id,
					version: activatedContentPack.version,
					activatedBy: user.id,
					previousPackId: activatedContentPack.id, // This would be the previous active pack
				},
				user.id,
			);
		} catch (error) {
			console.warn("Failed to track activation event:", error);
			// Don't fail the request if analytics fails
		}

		return createSuccessResponse({
			message: "Content pack activated successfully",
			contentPack: {
				id: activatedContentPack.id,
				version: activatedContentPack.version,
				name: activatedContentPack.name,
				status: activatedContentPack.status,
				activatedAt: activatedContentPack.activatedAt,
				activatedBy: activatedContentPack.activatedBy,
			},
		});
	} catch (error) {
		console.error("Content pack activation failed:", error);

		// Handle specific error types
		if (error instanceof Error) {
			if (error.message.includes("activation is already in progress")) {
				return createErrorResponse(
					"Content pack activation is already in progress",
					"ACTIVATION_IN_PROGRESS",
					409,
				);
			}

			if (error.message.includes("validation failed")) {
				return createErrorResponse(
					"Content pack validation failed",
					"VALIDATION_FAILED",
					400,
					{ error: error.message },
				);
			}
		}

		return createErrorResponse(
			"Failed to activate content pack",
			"ACTIVATION_FAILED",
			500,
			{ error: error instanceof Error ? error.message : "Unknown error" },
		);
	}
}

/**
 * GET /api/content-packs/[id]/activate
 * Get activation status of a content pack
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
	try {
		const { id } = await params;

		if (!id) {
			return createErrorResponse(
				"Content pack ID is required",
				"MISSING_CONTENT_PACK_ID",
				400,
			);
		}

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

		// Get content pack
		const contentPack = await contentPackService.getContentPack(id);
		if (!contentPack) {
			return createErrorResponse(
				"Content pack not found",
				"CONTENT_PACK_NOT_FOUND",
				404,
			);
		}

		// Get validation result
		const validationResult = await contentPackService.validateContentPack(id);

		return createSuccessResponse({
			contentPack: {
				id: contentPack.id,
				version: contentPack.version,
				name: contentPack.name,
				status: contentPack.status,
				createdAt: contentPack.createdAt,
				activatedAt: contentPack.activatedAt,
				activatedBy: contentPack.activatedBy,
			},
			validation: {
				isValid: validationResult.isValid,
				errors: validationResult.errors,
				warnings: validationResult.warnings,
				validatedAt: validationResult.validatedAt,
				validationTimeMs: validationResult.validationTimeMs,
			},
			canActivate: contentPack.status === "valid" && validationResult.isValid,
		});
	} catch (error) {
		console.error("Failed to get content pack activation status:", error);

		return createErrorResponse(
			"Failed to get content pack activation status",
			"GET_STATUS_FAILED",
			500,
			{ error: error instanceof Error ? error.message : "Unknown error" },
		);
	}
}
