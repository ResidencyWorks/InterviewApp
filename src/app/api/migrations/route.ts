import { type NextRequest, NextResponse } from "next/server";
import { logger } from "../../../infrastructure/logging/logger";

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
				// Return information about Supabase migrations
				const status = {
					message: "Migrations are now managed through Supabase CLI",
					instructions: [
						"Use 'supabase db push' to apply migrations",
						"Use 'supabase db reset' to reset database",
						"Use 'supabase migration list' to see migration status",
						"Migration files are located in supabase/migrations/",
					],
					migrationFiles: [
						"20250127000001_initial_schema.sql",
						"20250127000002_initial_schema_ts.sql",
						"20250127000003_add_user_preferences.sql",
						"20250127000004_add_evaluation_metrics.sql",
						"20250127000005_content_packs.sql",
					],
				};
				return NextResponse.json({ status }, { status: 200 });
			}

			case "current-version": {
				// Return current Supabase migration status
				const version = {
					message:
						"Use 'supabase migration list' to see current migration status",
					supabaseCli: "supabase migration list",
				};
				return NextResponse.json({ version }, { status: 200 });
			}

			case "validate": {
				// Return validation information
				const validation = {
					valid: true,
					message: "Migrations are managed through Supabase CLI",
					instructions:
						"Use 'supabase db push' to validate and apply migrations",
				};
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
		const { action } = body;

		if (!action) {
			return NextResponse.json(
				{ error: "Missing required field: action" },
				{ status: 400 },
			);
		}

		switch (action) {
			case "run": {
				return NextResponse.json(
					{
						message: "Migrations are now managed through Supabase CLI",
						instructions: "Use 'supabase db push' to apply migrations",
						supabaseCli: "supabase db push",
					},
					{ status: 200 },
				);
			}

			case "rollback": {
				return NextResponse.json(
					{
						message: "Rollbacks are now managed through Supabase CLI",
						instructions:
							"Use 'supabase db reset' to reset database or create a new migration to undo changes",
						supabaseCli: "supabase db reset",
					},
					{ status: 200 },
				);
			}

			case "rollback-to-version": {
				return NextResponse.json(
					{
						message: "Version rollbacks are now managed through Supabase CLI",
						instructions:
							"Use 'supabase db reset' to reset database or create a new migration to undo changes",
						supabaseCli: "supabase db reset",
					},
					{ status: 200 },
				);
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
