import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logging/logger";
import { migrationService } from "@/lib/migration/migration-service";

/**
 * GET /api/migrations
 * @returns Migration status and information
 */
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const action = url.searchParams.get("action") || "status";

		switch (action) {
			case "status": {
				const status = await migrationService.getMigrationStatus();
				return NextResponse.json({ status }, { status: 200 });
			}

			case "current-version": {
				const currentVersion = await migrationService.getCurrentVersion();
				return NextResponse.json({ version: currentVersion }, { status: 200 });
			}

			case "validate": {
				const validation = await migrationService.validateChecksums();
				return NextResponse.json(validation, { status: 200 });
			}

			default:
				return NextResponse.json(
					{
						error:
							"Invalid action. Supported actions: status, current-version, validate",
					},
					{ status: 400 },
				);
		}
	} catch (error) {
		logger.error("Failed to get migration information", error as Error, {
			component: "MigrationAPI",
			action: "GET",
		});

		return NextResponse.json(
			{
				error: "Failed to get migration information",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/migrations
 * @param request - Request containing migration action
 * @returns Migration result
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action, migrationId, version } = body;

		if (!action) {
			return NextResponse.json(
				{ error: "Missing required field: action" },
				{ status: 400 },
			);
		}

		switch (action) {
			case "run": {
				const runResults = await migrationService.runMigrations();
				return NextResponse.json({ results: runResults }, { status: 200 });
			}

			case "rollback": {
				if (!migrationId) {
					return NextResponse.json(
						{ error: "Missing required field: migrationId" },
						{ status: 400 },
					);
				}
				const rollbackResult =
					await migrationService.rollbackMigration(migrationId);
				return NextResponse.json({ result: rollbackResult }, { status: 200 });
			}

			case "rollback-to-version": {
				if (!version) {
					return NextResponse.json(
						{ error: "Missing required field: version" },
						{ status: 400 },
					);
				}
				const rollbackResults =
					await migrationService.rollbackToVersion(version);
				return NextResponse.json({ results: rollbackResults }, { status: 200 });
			}

			default:
				return NextResponse.json(
					{
						error:
							"Invalid action. Supported actions: run, rollback, rollback-to-version",
					},
					{ status: 400 },
				);
		}
	} catch (error) {
		logger.error("Failed to execute migration action", error as Error, {
			component: "MigrationAPI",
			action: "POST",
		});

		return NextResponse.json(
			{
				error: "Failed to execute migration action",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
