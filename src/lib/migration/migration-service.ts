import { databaseService } from "../db/database-service";
import { logger } from "../logging/logger";

/**
 * Migration status interface
 */
export interface MigrationStatus {
	id: string;
	name: string;
	version: string;
	applied: boolean;
	appliedAt?: Date;
	rolledBack: boolean;
	rolledBackAt?: Date;
	checksum: string;
	description: string;
}

/**
 * Migration result interface
 */
export interface MigrationResult {
	success: boolean;
	migrationId: string;
	message: string;
	duration: number;
	error?: string;
}

/**
 * Migration interface
 */
export interface Migration {
	id: string;
	name: string;
	version: string;
	description: string;
	up: () => Promise<void>;
	down: () => Promise<void>;
	checksum: string;
}

/**
 * Migration service for database schema and data migrations
 */
export class MigrationService {
	private static instance: MigrationService;
	private migrations: Map<string, Migration> = new Map();
	private migrationTable = "schema_migrations";

	private constructor() {}

	static getInstance(): MigrationService {
		if (!MigrationService.instance) {
			MigrationService.instance = new MigrationService();
		}
		return MigrationService.instance;
	}

	/**
	 * Initialize migration service
	 */
	async initialize(): Promise<void> {
		try {
			// Create migrations table if it doesn't exist
			await this.createMigrationsTable();

			// Load existing migrations
			await this.loadMigrations();

			logger.info("Migration service initialized", {
				component: "MigrationService",
				action: "initialize",
				metadata: { migrationCount: this.migrations.size },
			});
		} catch (error) {
			logger.error("Failed to initialize migration service", error as Error, {
				component: "MigrationService",
				action: "initialize",
			});
			throw error;
		}
	}

	/**
	 * Register a migration
	 */
	registerMigration(migration: Migration): void {
		this.migrations.set(migration.id, migration);

		logger.info("Migration registered", {
			component: "MigrationService",
			action: "registerMigration",
			metadata: { migrationId: migration.id, version: migration.version },
		});
	}

	/**
	 * Get all migrations
	 */
	getMigrations(): Migration[] {
		return Array.from(this.migrations.values()).sort((a, b) =>
			a.version.localeCompare(b.version),
		);
	}

	/**
	 * Get migration status
	 */
	async getMigrationStatus(): Promise<MigrationStatus[]> {
		try {
			const result = await databaseService.query<MigrationStatus>(
				`SELECT * FROM ${this.migrationTable} ORDER BY version`,
			);

			if (result.error) {
				throw new Error(result.error);
			}

			return result.data || [];
		} catch (error) {
			logger.error("Failed to get migration status", error as Error, {
				component: "MigrationService",
				action: "getMigrationStatus",
			});
			throw error;
		}
	}

	/**
	 * Run pending migrations
	 */
	async runMigrations(): Promise<MigrationResult[]> {
		const results: MigrationResult[] = [];

		try {
			const statuses = await this.getMigrationStatus();
			const appliedMigrations = new Set(statuses.map((s) => s.id));

			const pendingMigrations = this.getMigrations().filter(
				(migration) => !appliedMigrations.has(migration.id),
			);

			if (pendingMigrations.length === 0) {
				logger.info("No pending migrations", {
					component: "MigrationService",
					action: "runMigrations",
				});
				return results;
			}

			logger.info(`Running ${pendingMigrations.length} pending migrations`, {
				component: "MigrationService",
				action: "runMigrations",
				metadata: { pendingCount: pendingMigrations.length },
			});

			for (const migration of pendingMigrations) {
				const result = await this.runMigration(migration);
				results.push(result);

				if (!result.success) {
					logger.error(
						"Migration failed, stopping",
						new Error(result.error || "Unknown migration error"),
						{
							component: "MigrationService",
							action: "runMigrations",
							metadata: { migrationId: migration.id, error: result.error },
						},
					);
					break;
				}
			}

			return results;
		} catch (error) {
			logger.error("Failed to run migrations", error as Error, {
				component: "MigrationService",
				action: "runMigrations",
			});
			throw error;
		}
	}

	/**
	 * Run a specific migration
	 */
	async runMigration(migration: Migration): Promise<MigrationResult> {
		const startTime = Date.now();

		try {
			logger.info(`Running migration: ${migration.name}`, {
				component: "MigrationService",
				action: "runMigration",
				metadata: { migrationId: migration.id, version: migration.version },
			});

			// Run the migration
			await migration.up();

			// Record the migration
			await this.recordMigration(migration, true);

			const duration = Date.now() - startTime;

			logger.info(`Migration completed: ${migration.name}`, {
				component: "MigrationService",
				action: "runMigration",
				metadata: { migrationId: migration.id, duration },
			});

			return {
				success: true,
				migrationId: migration.id,
				message: `Migration ${migration.name} completed successfully`,
				duration,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			logger.error(`Migration failed: ${migration.name}`, error as Error, {
				component: "MigrationService",
				action: "runMigration",
				metadata: { migrationId: migration.id, duration },
			});

			return {
				success: false,
				migrationId: migration.id,
				message: `Migration ${migration.name} failed`,
				duration,
				error: errorMessage,
			};
		}
	}

	/**
	 * Rollback a specific migration
	 */
	async rollbackMigration(migrationId: string): Promise<MigrationResult> {
		const startTime = Date.now();

		try {
			const migration = this.migrations.get(migrationId);
			if (!migration) {
				throw new Error(`Migration not found: ${migrationId}`);
			}

			logger.info(`Rolling back migration: ${migration.name}`, {
				component: "MigrationService",
				action: "rollbackMigration",
				metadata: { migrationId: migration.id, version: migration.version },
			});

			// Run the rollback
			await migration.down();

			// Record the rollback
			await this.recordMigration(migration, false);

			const duration = Date.now() - startTime;

			logger.info(`Migration rolled back: ${migration.name}`, {
				component: "MigrationService",
				action: "rollbackMigration",
				metadata: { migrationId: migration.id, duration },
			});

			return {
				success: true,
				migrationId: migration.id,
				message: `Migration ${migration.name} rolled back successfully`,
				duration,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			logger.error(
				`Migration rollback failed: ${migrationId}`,
				error as Error,
				{
					component: "MigrationService",
					action: "rollbackMigration",
					metadata: { migrationId, duration },
				},
			);

			return {
				success: false,
				migrationId,
				message: `Migration rollback failed`,
				duration,
				error: errorMessage,
			};
		}
	}

	/**
	 * Rollback to a specific version
	 */
	async rollbackToVersion(version: string): Promise<MigrationResult[]> {
		const results: MigrationResult[] = [];

		try {
			const statuses = await this.getMigrationStatus();
			const migrationsToRollback = statuses
				.filter((status) => status.applied && status.version > version)
				.sort((a, b) => b.version.localeCompare(a.version));

			if (migrationsToRollback.length === 0) {
				logger.info("No migrations to rollback", {
					component: "MigrationService",
					action: "rollbackToVersion",
					metadata: { targetVersion: version },
				});
				return results;
			}

			logger.info(
				`Rolling back ${migrationsToRollback.length} migrations to version ${version}`,
				{
					component: "MigrationService",
					action: "rollbackToVersion",
					metadata: {
						targetVersion: version,
						rollbackCount: migrationsToRollback.length,
					},
				},
			);

			for (const status of migrationsToRollback) {
				const result = await this.rollbackMigration(status.id);
				results.push(result);

				if (!result.success) {
					logger.error(
						"Migration rollback failed, stopping",
						new Error(result.error || "Unknown rollback error"),
						{
							component: "MigrationService",
							action: "rollbackToVersion",
							metadata: { migrationId: status.id, error: result.error },
						},
					);
					break;
				}
			}

			return results;
		} catch (error) {
			logger.error("Failed to rollback to version", error as Error, {
				component: "MigrationService",
				action: "rollbackToVersion",
				metadata: { targetVersion: version },
			});
			throw error;
		}
	}

	/**
	 * Get current database version
	 */
	async getCurrentVersion(): Promise<string> {
		try {
			const statuses = await this.getMigrationStatus();
			const appliedMigrations = statuses
				.filter((status) => status.applied)
				.sort((a, b) => b.version.localeCompare(a.version));

			return appliedMigrations.length > 0
				? appliedMigrations[0].version
				: "0.0.0";
		} catch (error) {
			logger.error("Failed to get current version", error as Error, {
				component: "MigrationService",
				action: "getCurrentVersion",
			});
			return "0.0.0";
		}
	}

	/**
	 * Validate migration checksums
	 */
	async validateChecksums(): Promise<{ valid: boolean; invalid: string[] }> {
		try {
			const statuses = await this.getMigrationStatus();
			const invalid: string[] = [];

			for (const status of statuses) {
				const migration = this.migrations.get(status.id);
				if (migration && migration.checksum !== status.checksum) {
					invalid.push(status.id);
				}
			}

			return {
				valid: invalid.length === 0,
				invalid,
			};
		} catch (error) {
			logger.error("Failed to validate checksums", error as Error, {
				component: "MigrationService",
				action: "validateChecksums",
			});
			throw error;
		}
	}

	/**
	 * Create migrations table
	 */
	private async createMigrationsTable(): Promise<void> {
		const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL,
        applied BOOLEAN NOT NULL DEFAULT FALSE,
        applied_at TIMESTAMP,
        rolled_back BOOLEAN NOT NULL DEFAULT FALSE,
        rolled_back_at TIMESTAMP,
        checksum VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

		const result = await databaseService.query(createTableSQL);
		if (result.error) {
			throw new Error(`Failed to create migrations table: ${result.error}`);
		}
	}

	/**
	 * Load existing migrations
	 */
	private async loadMigrations(): Promise<void> {
		// This would typically load migrations from a directory or configuration
		// For now, we'll just ensure the migrations table exists
		logger.info("Loading existing migrations", {
			component: "MigrationService",
			action: "loadMigrations",
		});
	}

	/**
	 * Record migration in database
	 */
	private async recordMigration(
		migration: Migration,
		applied: boolean,
	): Promise<void> {
		const now = new Date().toISOString();

		if (applied) {
			const sql = `
        INSERT INTO ${this.migrationTable} (id, name, version, applied, applied_at, checksum, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          applied = $4,
          applied_at = $5,
          updated_at = $8
      `;

			const result = await databaseService.rawQuery(sql, [
				migration.id,
				migration.name,
				migration.version,
				true,
				now,
				migration.checksum,
				migration.description,
				now,
			]);

			if (result.error) {
				throw new Error(`Failed to record migration: ${result.error}`);
			}
		} else {
			const sql = `
        UPDATE ${this.migrationTable}
        SET rolled_back = $1, rolled_back_at = $2, updated_at = $3
        WHERE id = $4
      `;

			const result = await databaseService.rawQuery(sql, [
				true,
				now,
				now,
				migration.id,
			]);
			if (result.error) {
				throw new Error(`Failed to record migration rollback: ${result.error}`);
			}
		}
	}
}

// Export singleton instance
export const migrationService = MigrationService.getInstance();
