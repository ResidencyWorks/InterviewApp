import { databaseService } from "../../db/database-service";
import { logger } from "../../logging/logger";

/**
 * Add user preferences migration
 * Version: 1.1.0
 * Description: Adds user preferences table and related functionality
 */
export const migration002AddUserPreferences = {
	id: "002-add-user-preferences",
	name: "Add User Preferences",
	version: "1.1.0",
	description: "Adds user preferences table and related functionality",
	checksum: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1",

	async up(): Promise<void> {
		logger.info("Running migration: Add User Preferences", {
			component: "Migration",
			action: "up",
			metadata: { migrationId: "002-add-user-preferences" },
		});

		// Create user_preferences table
		const createUserPreferencesTable = `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        preference_key VARCHAR(255) NOT NULL,
        preference_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, preference_key)
      )
    `;

		// Create user_profiles table
		const createUserProfilesTable = `
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        location VARCHAR(255),
        timezone VARCHAR(100),
        language VARCHAR(10) DEFAULT 'en',
        notification_preferences JSONB DEFAULT '{}',
        privacy_settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `;

		// Add columns to users table
		const alterUsersTable = [
			"ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
			"ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE",
			"ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
			"ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)",
			"ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100)",
			"ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en'",
			"ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE",
			"ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE",
		];

		// Create indexes
		const createIndexes = [
			"CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)",
			"CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key)",
			"CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)",
			"CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)",
			"CREATE INDEX IF NOT EXISTS idx_users_country ON users(country)",
			"CREATE INDEX IF NOT EXISTS idx_users_language ON users(language)",
			"CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)",
		];

		// Execute all SQL statements
		const statements = [
			createUserPreferencesTable,
			createUserProfilesTable,
			...alterUsersTable,
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

		logger.info("Migration completed: Add User Preferences", {
			component: "Migration",
			action: "up",
			metadata: { migrationId: "002-add-user-preferences" },
		});
	},

	async down(): Promise<void> {
		logger.info("Rolling back migration: Add User Preferences", {
			component: "Migration",
			action: "down",
			metadata: { migrationId: "002-add-user-preferences" },
		});

		// Drop tables
		const dropStatements = [
			"DROP TABLE IF EXISTS user_profiles CASCADE",
			"DROP TABLE IF EXISTS user_preferences CASCADE",
		];

		// Remove columns from users table
		const alterUsersTable = [
			"ALTER TABLE users DROP COLUMN IF EXISTS phone",
			"ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth",
			"ALTER TABLE users DROP COLUMN IF EXISTS gender",
			"ALTER TABLE users DROP COLUMN IF EXISTS country",
			"ALTER TABLE users DROP COLUMN IF EXISTS timezone",
			"ALTER TABLE users DROP COLUMN IF EXISTS language",
			"ALTER TABLE users DROP COLUMN IF EXISTS email_verified",
			"ALTER TABLE users DROP COLUMN IF EXISTS phone_verified",
		];

		// Execute all SQL statements
		const statements = [...dropStatements, ...alterUsersTable];

		for (const statement of statements) {
			const result = await databaseService.query(statement);
			if (result.error) {
				throw new Error(
					`Failed to execute rollback statement: ${result.error}`,
				);
			}
		}

		logger.info("Migration rollback completed: Add User Preferences", {
			component: "Migration",
			action: "down",
			metadata: { migrationId: "002-add-user-preferences" },
		});
	},
};
