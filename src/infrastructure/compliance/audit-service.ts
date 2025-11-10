import { databaseService } from "../db/database-service";
import { logger } from "../logging/logger";

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
	id?: string;
	userId?: string;
	action: string;
	resourceType?: string;
	resourceId?: string;
	details?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
	timestamp?: Date;
	sessionId?: string;
	requestId?: string;
	severity: "low" | "medium" | "high" | "critical";
	category:
		| "authentication"
		| "authorization"
		| "data_access"
		| "data_modification"
		| "system"
		| "security"
		| "compliance";
	outcome: "success" | "failure" | "error";
	riskLevel: "low" | "medium" | "high" | "critical";
}

/**
 * Compliance rule interface
 */
export interface ComplianceRule {
	id: string;
	name: string;
	description: string;
	category: string;
	severity: "low" | "medium" | "high" | "critical";
	enabled: boolean;
	conditions: Record<string, unknown>;
	actions: string[];
}

/**
 * Compliance violation interface
 */
export interface ComplianceViolation {
	id: string;
	ruleId: string;
	userId?: string;
	action: string;
	details: Record<string, unknown>;
	severity: "low" | "medium" | "high" | "critical";
	timestamp: Date;
	resolved: boolean;
	resolvedAt?: Date;
	resolvedBy?: string;
}

/**
 * Audit service for compliance and audit logging
 */
export class AuditService {
	private static instance: AuditService;
	private complianceRules: Map<string, ComplianceRule> = new Map();
	private auditTable = "audit_logs";
	private violationsTable = "compliance_violations";

	private constructor() {}

	static getInstance(): AuditService {
		if (!AuditService.instance) {
			AuditService.instance = new AuditService();
		}
		return AuditService.instance;
	}

	/**
	 * Initialize audit service
	 */
	async initialize(): Promise<void> {
		try {
			// Create audit logs table if it doesn't exist
			await this.createAuditTable();

			// Create compliance violations table if it doesn't exist
			await this.createViolationsTable();

			// Load compliance rules
			await this.loadComplianceRules();

			logger.info("Audit service initialized", {
				component: "AuditService",
				action: "initialize",
				metadata: { ruleCount: this.complianceRules.size },
			});
		} catch (error) {
			logger.error("Failed to initialize audit service", error as Error, {
				component: "AuditService",
				action: "initialize",
			});
			throw error;
		}
	}

	/**
	 * Log an audit event
	 */
	async logAuditEvent(entry: AuditLogEntry): Promise<void> {
		try {
			// Set default values
			const auditEntry: AuditLogEntry = {
				...entry,
				timestamp: entry.timestamp || new Date(),
				severity: entry.severity || "medium",
				category: entry.category || "system",
				outcome: entry.outcome || "success",
				riskLevel: entry.riskLevel || "low",
			};

			// Insert audit log entry
			const sql = `
        INSERT INTO ${this.auditTable} (
          user_id, action, resource_type, resource_id, details,
          ip_address, user_agent, session_id, request_id,
          severity, category, outcome, risk_level, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;

			const result = await databaseService.rawQuery(sql, [
				auditEntry.userId,
				auditEntry.action,
				auditEntry.resourceType,
				auditEntry.resourceId,
				JSON.stringify(auditEntry.details),
				auditEntry.ipAddress,
				auditEntry.userAgent,
				auditEntry.sessionId,
				auditEntry.requestId,
				auditEntry.severity,
				auditEntry.category,
				auditEntry.outcome,
				auditEntry.riskLevel,
				auditEntry.timestamp,
			]);

			if (result.error) {
				throw new Error(`Failed to insert audit log: ${result.error}`);
			}

			// Check compliance rules
			await this.checkComplianceRules(auditEntry);

			logger.info("Audit event logged", {
				component: "AuditService",
				action: "logAuditEvent",
				metadata: {
					action: auditEntry.action,
					category: auditEntry.category,
					severity: auditEntry.severity,
				},
			});
		} catch (error) {
			logger.error("Failed to log audit event", error as Error, {
				component: "AuditService",
				action: "logAuditEvent",
				metadata: { entry },
			});
			throw error;
		}
	}

	/**
	 * Get audit logs with filtering
	 */
	async getAuditLogs(
		filters: {
			userId?: string;
			action?: string;
			category?: string;
			severity?: string;
			startDate?: Date;
			endDate?: Date;
			limit?: number;
			offset?: number;
		} = {},
	): Promise<AuditLogEntry[]> {
		try {
			let sql = `SELECT * FROM ${this.auditTable} WHERE 1=1`;
			const params: unknown[] = [];
			let paramIndex = 1;

			if (filters.userId) {
				sql += ` AND user_id = $${paramIndex}`;
				params.push(filters.userId);
				paramIndex++;
			}

			if (filters.action) {
				sql += ` AND action = $${paramIndex}`;
				params.push(filters.action);
				paramIndex++;
			}

			if (filters.category) {
				sql += ` AND category = $${paramIndex}`;
				params.push(filters.category);
				paramIndex++;
			}

			if (filters.severity) {
				sql += ` AND severity = $${paramIndex}`;
				params.push(filters.severity);
				paramIndex++;
			}

			if (filters.startDate) {
				sql += ` AND created_at >= $${paramIndex}`;
				params.push(filters.startDate);
				paramIndex++;
			}

			if (filters.endDate) {
				sql += ` AND created_at <= $${paramIndex}`;
				params.push(filters.endDate);
				paramIndex++;
			}

			sql += ` ORDER BY created_at DESC`;

			if (filters.limit) {
				sql += ` LIMIT $${paramIndex}`;
				params.push(filters.limit);
				paramIndex++;
			}

			if (filters.offset) {
				sql += ` OFFSET $${paramIndex}`;
				params.push(filters.offset);
				paramIndex++;
			}

			const result = await databaseService.rawQuery<AuditLogEntry>(sql, params);
			if (result.error) {
				throw new Error(`Failed to get audit logs: ${result.error}`);
			}

			return result.data || [];
		} catch (error) {
			logger.error("Failed to get audit logs", error as Error, {
				component: "AuditService",
				action: "getAuditLogs",
				metadata: { filters },
			});
			throw error;
		}
	}

	/**
	 * Get compliance violations
	 */
	async getComplianceViolations(
		filters: {
			ruleId?: string;
			userId?: string;
			severity?: string;
			resolved?: boolean;
			startDate?: Date;
			endDate?: Date;
			limit?: number;
			offset?: number;
		} = {},
	): Promise<ComplianceViolation[]> {
		try {
			let sql = `SELECT * FROM ${this.violationsTable} WHERE 1=1`;
			const params: unknown[] = [];
			let paramIndex = 1;

			if (filters.ruleId) {
				sql += ` AND rule_id = $${paramIndex}`;
				params.push(filters.ruleId);
				paramIndex++;
			}

			if (filters.userId) {
				sql += ` AND user_id = $${paramIndex}`;
				params.push(filters.userId);
				paramIndex++;
			}

			if (filters.severity) {
				sql += ` AND severity = $${paramIndex}`;
				params.push(filters.severity);
				paramIndex++;
			}

			if (filters.resolved !== undefined) {
				sql += ` AND resolved = $${paramIndex}`;
				params.push(filters.resolved);
				paramIndex++;
			}

			if (filters.startDate) {
				sql += ` AND created_at >= $${paramIndex}`;
				params.push(filters.startDate);
				paramIndex++;
			}

			if (filters.endDate) {
				sql += ` AND created_at <= $${paramIndex}`;
				params.push(filters.endDate);
				paramIndex++;
			}

			sql += ` ORDER BY created_at DESC`;

			if (filters.limit) {
				sql += ` LIMIT $${paramIndex}`;
				params.push(filters.limit);
				paramIndex++;
			}

			if (filters.offset) {
				sql += ` OFFSET $${paramIndex}`;
				params.push(filters.offset);
				paramIndex++;
			}

			const result = await databaseService.rawQuery<ComplianceViolation>(
				sql,
				params,
			);
			if (result.error) {
				throw new Error(`Failed to get compliance violations: ${result.error}`);
			}

			return result.data || [];
		} catch (error) {
			logger.error("Failed to get compliance violations", error as Error, {
				component: "AuditService",
				action: "getComplianceViolations",
				metadata: { filters },
			});
			throw error;
		}
	}

	/**
	 * Resolve a compliance violation
	 */
	async resolveViolation(
		violationId: string,
		resolvedBy: string,
	): Promise<void> {
		try {
			const sql = `
        UPDATE ${this.violationsTable}
        SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1
        WHERE id = $2
      `;

			const result = await databaseService.rawQuery(sql, [
				resolvedBy,
				violationId,
			]);
			if (result.error) {
				throw new Error(`Failed to resolve violation: ${result.error}`);
			}

			logger.info("Compliance violation resolved", {
				component: "AuditService",
				action: "resolveViolation",
				metadata: { violationId, resolvedBy },
			});
		} catch (error) {
			logger.error("Failed to resolve compliance violation", error as Error, {
				component: "AuditService",
				action: "resolveViolation",
				metadata: { violationId, resolvedBy },
			});
			throw error;
		}
	}

	/**
	 * Add a compliance rule
	 */
	addComplianceRule(rule: ComplianceRule): void {
		this.complianceRules.set(rule.id, rule);

		logger.info("Compliance rule added", {
			component: "AuditService",
			action: "addComplianceRule",
			metadata: { ruleId: rule.id, name: rule.name },
		});
	}

	/**
	 * Remove a compliance rule
	 */
	removeComplianceRule(ruleId: string): void {
		this.complianceRules.delete(ruleId);

		logger.info("Compliance rule removed", {
			component: "AuditService",
			action: "removeComplianceRule",
			metadata: { ruleId },
		});
	}

	/**
	 * Get all compliance rules
	 */
	getComplianceRules(): ComplianceRule[] {
		return Array.from(this.complianceRules.values());
	}

	/**
	 * Generate compliance report
	 */
	async generateComplianceReport(
		startDate: Date,
		endDate: Date,
	): Promise<{
		summary: {
			totalEvents: number;
			violations: number;
			resolvedViolations: number;
			unresolvedViolations: number;
		};
		violationsBySeverity: Record<string, number>;
		violationsByCategory: Record<string, number>;
		topViolations: Array<{
			ruleId: string;
			count: number;
			severity: string;
		}>;
	}> {
		try {
			// Get total events
			const totalEventsResult = await databaseService.rawQuery(
				`SELECT COUNT(*) as count FROM ${this.auditTable} WHERE created_at BETWEEN $1 AND $2`,
				[startDate, endDate],
			);
			const totalEvents = parseInt(
				(totalEventsResult.data?.[0] as { count: string })?.count || "0",
				10,
			);

			// Get violations
			const violationsResult = await databaseService.rawQuery(
				`SELECT COUNT(*) as count FROM ${this.violationsTable} WHERE created_at BETWEEN $1 AND $2`,
				[startDate, endDate],
			);
			const violations = parseInt(
				(violationsResult.data?.[0] as { count: string })?.count || "0",
				10,
			);

			// Get resolved violations
			const resolvedResult = await databaseService.rawQuery(
				`SELECT COUNT(*) as count FROM ${this.violationsTable} WHERE created_at BETWEEN $1 AND $2 AND resolved = TRUE`,
				[startDate, endDate],
			);
			const resolvedViolations = parseInt(
				(resolvedResult.data?.[0] as { count: string })?.count || "0",
				10,
			);

			// Get violations by severity
			const severityResult = await databaseService.rawQuery(
				`SELECT severity, COUNT(*) as count FROM ${this.violationsTable} WHERE created_at BETWEEN $1 AND $2 GROUP BY severity`,
				[startDate, endDate],
			);
			const violationsBySeverity: Record<string, number> = {};
			severityResult.data?.forEach((row) => {
				const typedRow = row as Record<string, unknown>;
				violationsBySeverity[typedRow.severity as string] = parseInt(
					typedRow.count as string,
					10,
				);
			});

			// Get violations by category
			const categoryResult = await databaseService.rawQuery(
				`SELECT action, COUNT(*) as count FROM ${this.violationsTable} WHERE created_at BETWEEN $1 AND $2 GROUP BY action`,
				[startDate, endDate],
			);
			const violationsByCategory: Record<string, number> = {};
			categoryResult.data?.forEach((row) => {
				const typedRow = row as Record<string, unknown>;
				violationsByCategory[typedRow.action as string] = parseInt(
					typedRow.count as string,
					10,
				);
			});

			// Get top violations
			const topViolationsResult = await databaseService.rawQuery(
				`SELECT rule_id, COUNT(*) as count, severity FROM ${this.violationsTable} WHERE created_at BETWEEN $1 AND $2 GROUP BY rule_id, severity ORDER BY count DESC LIMIT 10`,
				[startDate, endDate],
			);
			const topViolations =
				topViolationsResult.data?.map((row) => {
					const typedRow = row as {
						rule_id: string;
						count: string;
						severity: string;
					};
					return {
						ruleId: typedRow.rule_id as string,
						count: parseInt(typedRow.count, 10),
						severity: typedRow.severity,
					};
				}) || [];

			return {
				summary: {
					totalEvents,
					violations,
					resolvedViolations,
					unresolvedViolations: violations - resolvedViolations,
				},
				violationsBySeverity,
				violationsByCategory,
				topViolations,
			};
		} catch (error) {
			logger.error("Failed to generate compliance report", error as Error, {
				component: "AuditService",
				action: "generateComplianceReport",
				metadata: { startDate, endDate },
			});
			throw error;
		}
	}

	/**
	 * Create audit table
	 */
	private async createAuditTable(): Promise<void> {
		const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.auditTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(255),
        resource_id VARCHAR(255),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        session_id VARCHAR(255),
        request_id VARCHAR(255),
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        category VARCHAR(50) NOT NULL CHECK (category IN ('authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security', 'compliance')),
        outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('success', 'failure', 'error')),
        risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

		const result = await databaseService.query(createTableSQL);
		if (result.error) {
			throw new Error(`Failed to create audit table: ${result.error}`);
		}

		// Create indexes
		const indexes = [
			`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON ${this.auditTable}(user_id)`,
			`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON ${this.auditTable}(action)`,
			`CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON ${this.auditTable}(category)`,
			`CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON ${this.auditTable}(severity)`,
			`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON ${this.auditTable}(created_at)`,
			`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON ${this.auditTable}(resource_type, resource_id)`,
		];

		for (const indexSQL of indexes) {
			await databaseService.query(indexSQL);
		}
	}

	/**
	 * Create violations table
	 */
	private async createViolationsTable(): Promise<void> {
		const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.violationsTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        details JSONB,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        resolved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

		const result = await databaseService.query(createTableSQL);
		if (result.error) {
			throw new Error(`Failed to create violations table: ${result.error}`);
		}

		// Create indexes
		const indexes = [
			`CREATE INDEX IF NOT EXISTS idx_violations_rule_id ON ${this.violationsTable}(rule_id)`,
			`CREATE INDEX IF NOT EXISTS idx_violations_user_id ON ${this.violationsTable}(user_id)`,
			`CREATE INDEX IF NOT EXISTS idx_violations_severity ON ${this.violationsTable}(severity)`,
			`CREATE INDEX IF NOT EXISTS idx_violations_resolved ON ${this.violationsTable}(resolved)`,
			`CREATE INDEX IF NOT EXISTS idx_violations_created_at ON ${this.violationsTable}(created_at)`,
		];

		for (const indexSQL of indexes) {
			await databaseService.query(indexSQL);
		}
	}

	/**
	 * Load compliance rules
	 */
	private async loadComplianceRules(): Promise<void> {
		// Add default compliance rules
		this.addComplianceRule({
			id: "auth-failed-login",
			name: "Failed Login Attempts",
			description: "Monitor failed login attempts",
			category: "authentication",
			severity: "medium",
			enabled: true,
			conditions: { action: "login", outcome: "failure" },
			actions: ["alert", "log"],
		});

		this.addComplianceRule({
			id: "data-access-sensitive",
			name: "Sensitive Data Access",
			description: "Monitor access to sensitive data",
			category: "data_access",
			severity: "high",
			enabled: true,
			conditions: { resourceType: "sensitive_data" },
			actions: ["alert", "log", "audit"],
		});

		this.addComplianceRule({
			id: "admin-actions",
			name: "Administrative Actions",
			description: "Monitor administrative actions",
			category: "authorization",
			severity: "high",
			enabled: true,
			conditions: { action: "admin_*" },
			actions: ["alert", "log", "audit"],
		});

		this.addComplianceRule({
			id: "data-export",
			name: "Data Export",
			description: "Monitor data export activities",
			category: "data_access",
			severity: "medium",
			enabled: true,
			conditions: { action: "export_data" },
			actions: ["log", "audit"],
		});

		this.addComplianceRule({
			id: "system-changes",
			name: "System Configuration Changes",
			description: "Monitor system configuration changes",
			category: "system",
			severity: "high",
			enabled: true,
			conditions: { action: "system_config_*" },
			actions: ["alert", "log", "audit"],
		});
	}

	/**
	 * Check compliance rules
	 */
	private async checkComplianceRules(entry: AuditLogEntry): Promise<void> {
		for (const rule of Array.from(this.complianceRules.values())) {
			if (!rule.enabled) continue;

			// Check if rule conditions match
			if (this.matchesRule(entry, rule)) {
				// Create violation
				await this.createViolation(rule, entry);
			}
		}
	}

	/**
	 * Check if audit entry matches rule conditions
	 */
	private matchesRule(entry: AuditLogEntry, rule: ComplianceRule): boolean {
		for (const [key, value] of Object.entries(rule.conditions)) {
			if (key === "action" && typeof value === "string") {
				if (value.endsWith("*")) {
					const prefix = value.slice(0, -1);
					if (!entry.action.startsWith(prefix)) return false;
				} else {
					if (entry.action !== value) return false;
				}
			} else if (key === "outcome" && entry.outcome !== value) {
				return false;
			} else if (key === "resourceType" && entry.resourceType !== value) {
				return false;
			} else if (key === "category" && entry.category !== value) {
				return false;
			} else if (key === "severity" && entry.severity !== value) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Create compliance violation
	 */
	private async createViolation(
		rule: ComplianceRule,
		entry: AuditLogEntry,
	): Promise<void> {
		try {
			const sql = `
        INSERT INTO ${this.violationsTable} (
          rule_id, user_id, action, details, severity, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

			const result = await databaseService.rawQuery(sql, [
				rule.id,
				entry.userId,
				entry.action,
				JSON.stringify(entry.details),
				rule.severity,
				new Date(),
			]);

			if (result.error) {
				throw new Error(`Failed to create violation: ${result.error}`);
			}

			logger.warn("Compliance violation detected", {
				component: "AuditService",
				action: "createViolation",
				metadata: {
					ruleId: rule.id,
					ruleName: rule.name,
					action: entry.action,
					severity: rule.severity,
				},
			});
		} catch (error) {
			logger.error("Failed to create compliance violation", error as Error, {
				component: "AuditService",
				action: "createViolation",
				metadata: { ruleId: rule.id, entry },
			});
		}
	}
}

// Export singleton instance
export const auditService = AuditService.getInstance();
