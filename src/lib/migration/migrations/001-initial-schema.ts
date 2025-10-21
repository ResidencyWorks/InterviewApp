import { databaseService } from "../../db/database-service";
import { logger } from "../../logging/logger";

/**
 * Initial database schema migration
 * Version: 1.0.0
 * Description: Creates the initial database schema for the Interview Drills application
 */
export const migration001InitialSchema = {
	id: "001-initial-schema",
	name: "Initial Database Schema",
	version: "1.0.0",
	description:
		"Creates the initial database schema for the Interview Drills application",
	checksum: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",

	async up(): Promise<void> {
		logger.info("Running migration: Initial Database Schema", {
			component: "Migration",
			action: "up",
			metadata: { migrationId: "001-initial-schema" },
		});

		// Create users table
		const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

		// Create sessions table
		const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

		// Create content_packs table
		const createContentPacksTable = `
      CREATE TABLE IF NOT EXISTS content_packs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL,
        description TEXT,
        content JSONB NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id)
      )
    `;

		// Create evaluations table
		const createEvaluationsTable = `
      CREATE TABLE IF NOT EXISTS evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_pack_id UUID REFERENCES content_packs(id),
        question_id VARCHAR(255),
        question_text TEXT NOT NULL,
        response_text TEXT,
        response_audio_url TEXT,
        response_type VARCHAR(50) NOT NULL CHECK (response_type IN ('text', 'audio')),
        score INTEGER CHECK (score >= 0 AND score <= 100),
        feedback TEXT,
        categories JSONB,
        metrics JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

		// Create audit_logs table
		const createAuditLogsTable = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(255),
        resource_id VARCHAR(255),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

		// Create indexes
		const createIndexes = [
			"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
			"CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
			"CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
			"CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)",
			"CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)",
			"CREATE INDEX IF NOT EXISTS idx_content_packs_name ON content_packs(name)",
			"CREATE INDEX IF NOT EXISTS idx_content_packs_version ON content_packs(version)",
			"CREATE INDEX IF NOT EXISTS idx_content_packs_is_active ON content_packs(is_active)",
			"CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id)",
			"CREATE INDEX IF NOT EXISTS idx_evaluations_content_pack_id ON evaluations(content_pack_id)",
			"CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at)",
			"CREATE INDEX IF NOT EXISTS idx_evaluations_score ON evaluations(score)",
			"CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
			"CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
			"CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)",
		];

		// Execute all SQL statements
		const statements = [
			createUsersTable,
			createSessionsTable,
			createContentPacksTable,
			createEvaluationsTable,
			createAuditLogsTable,
			...createIndexes,
		];

		for (const statement of statements) {
			const result = await databaseService.query(statement);
			if (result.error) {
				throw new Error(
					`Failed to execute migration statement: ${result.error}`,
				);
			}
		}

		logger.info("Migration completed: Initial Database Schema", {
			component: "Migration",
			action: "up",
			metadata: { migrationId: "001-initial-schema" },
		});
	},

	async down(): Promise<void> {
		logger.info("Rolling back migration: Initial Database Schema", {
			component: "Migration",
			action: "down",
			metadata: { migrationId: "001-initial-schema" },
		});

		// Drop tables in reverse order (due to foreign key constraints)
		const dropStatements = [
			"DROP TABLE IF EXISTS audit_logs CASCADE",
			"DROP TABLE IF EXISTS evaluations CASCADE",
			"DROP TABLE IF EXISTS content_packs CASCADE",
			"DROP TABLE IF EXISTS sessions CASCADE",
			"DROP TABLE IF EXISTS users CASCADE",
		];

		for (const statement of dropStatements) {
			const result = await databaseService.query(statement);
			if (result.error) {
				throw new Error(
					`Failed to execute rollback statement: ${result.error}`,
				);
			}
		}

		logger.info("Migration rollback completed: Initial Database Schema", {
			component: "Migration",
			action: "down",
			metadata: { migrationId: "001-initial-schema" },
		});
	},
};
