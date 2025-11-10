import { type NextRequest, NextResponse } from "next/server";
import { auditService } from "@/infrastructure/compliance/audit-service";
import { logger } from "@/infrastructure/logging/logger";

/**
 * GET /api/audit
 * @returns Audit logs and compliance information
 */
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const action = url.searchParams.get("action") || "logs";

		switch (action) {
			case "logs": {
				const filters = {
					userId: url.searchParams.get("userId") || undefined,
					action: url.searchParams.get("action") || undefined,
					category: url.searchParams.get("category") || undefined,
					severity: url.searchParams.get("severity") || undefined,
					startDate: url.searchParams.get("startDate")
						? new Date(url.searchParams.get("startDate") as string)
						: undefined,
					endDate: url.searchParams.get("endDate")
						? new Date(url.searchParams.get("endDate") as string)
						: undefined,
					limit: url.searchParams.get("limit")
						? parseInt(url.searchParams.get("limit") as string, 10)
						: undefined,
					offset: url.searchParams.get("offset")
						? parseInt(url.searchParams.get("offset") as string, 10)
						: undefined,
				};

				const logs = await auditService.getAuditLogs(filters);
				return NextResponse.json({ logs }, { status: 200 });
			}

			case "violations": {
				const violationFilters = {
					ruleId: url.searchParams.get("ruleId") || undefined,
					userId: url.searchParams.get("userId") || undefined,
					severity: url.searchParams.get("severity") || undefined,
					resolved: url.searchParams.get("resolved")
						? url.searchParams.get("resolved") === "true"
						: undefined,
					startDate: url.searchParams.get("startDate")
						? new Date(url.searchParams.get("startDate") as string)
						: undefined,
					endDate: url.searchParams.get("endDate")
						? new Date(url.searchParams.get("endDate") as string)
						: undefined,
					limit: url.searchParams.get("limit")
						? parseInt(url.searchParams.get("limit") as string, 10)
						: undefined,
					offset: url.searchParams.get("offset")
						? parseInt(url.searchParams.get("offset") as string, 10)
						: undefined,
				};

				const violations =
					await auditService.getComplianceViolations(violationFilters);
				return NextResponse.json({ violations }, { status: 200 });
			}

			case "rules": {
				const rules = auditService.getComplianceRules();
				return NextResponse.json({ rules }, { status: 200 });
			}

			case "report": {
				const startDate = url.searchParams.get("startDate")
					? new Date(url.searchParams.get("startDate") as string)
					: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
				const endDate = url.searchParams.get("endDate")
					? new Date(url.searchParams.get("endDate") as string)
					: new Date();

				const report = await auditService.generateComplianceReport(
					startDate,
					endDate,
				);
				return NextResponse.json({ report }, { status: 200 });
			}

			default:
				return NextResponse.json(
					{
						error:
							"Invalid action. Supported actions: logs, violations, rules, report",
					},
					{ status: 400 },
				);
		}
	} catch (error) {
		logger.error("Failed to get audit information", error as Error, {
			component: "AuditAPI",
			action: "GET",
		});

		return NextResponse.json(
			{
				error: "Failed to get audit information",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/audit
 * @param request - Request containing audit event or action
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
			case "log": {
				const {
					userId,
					action: eventAction,
					resourceType,
					resourceId,
					details,
					ipAddress,
					userAgent,
					sessionId,
					requestId,
					severity,
					category,
					outcome,
					riskLevel,
				} = data;

				if (!eventAction) {
					return NextResponse.json(
						{ error: "Missing required field: action" },
						{ status: 400 },
					);
				}

				await auditService.logAuditEvent({
					userId,
					action: eventAction,
					resourceType,
					resourceId,
					details,
					ipAddress:
						ipAddress ||
						request.headers.get("x-forwarded-for") ||
						request.headers.get("x-real-ip") ||
						"unknown",
					userAgent:
						userAgent || request.headers.get("user-agent") || undefined,
					sessionId,
					requestId,
					severity: severity || "medium",
					category: category || "system",
					outcome: outcome || "success",
					riskLevel: riskLevel || "low",
				});

				return NextResponse.json({ success: true }, { status: 200 });
			}

			case "resolve-violation": {
				const { violationId, resolvedBy } = data;

				if (!violationId || !resolvedBy) {
					return NextResponse.json(
						{ error: "Missing required fields: violationId, resolvedBy" },
						{ status: 400 },
					);
				}

				await auditService.resolveViolation(violationId, resolvedBy);
				return NextResponse.json({ success: true }, { status: 200 });
			}

			case "add-rule": {
				const {
					id,
					name,
					description,
					category,
					severity,
					enabled,
					conditions,
					actions,
				} = data;

				if (
					!id ||
					!name ||
					!description ||
					!category ||
					!severity ||
					!conditions ||
					!actions
				) {
					return NextResponse.json(
						{
							error:
								"Missing required fields: id, name, description, category, severity, conditions, actions",
						},
						{ status: 400 },
					);
				}

				auditService.addComplianceRule({
					id,
					name,
					description,
					category,
					severity,
					enabled: enabled !== false,
					conditions,
					actions,
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

				auditService.removeComplianceRule(ruleId);
				return NextResponse.json({ success: true }, { status: 200 });
			}

			default:
				return NextResponse.json(
					{
						error:
							"Invalid action. Supported actions: log, resolve-violation, add-rule, remove-rule",
					},
					{ status: 400 },
				);
		}
	} catch (error) {
		logger.error("Failed to execute audit action", error as Error, {
			component: "AuditAPI",
			action: "POST",
		});

		return NextResponse.json(
			{
				error: "Failed to execute audit action",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
