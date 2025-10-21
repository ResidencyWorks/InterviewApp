import { databaseService } from "../../db/database-service";
import { logger } from "../../logging/logger";

/**
 * Add evaluation metrics migration
 * Version: 1.2.0
 * Description: Adds comprehensive evaluation metrics and analytics tables
 */
export const migration003AddEvaluationMetrics = {
	id: "003-add-evaluation-metrics",
	name: "Add Evaluation Metrics",
	version: "1.2.0",
	description: "Adds comprehensive evaluation metrics and analytics tables",
	checksum: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2",

	async up(): Promise<void> {
		logger.info("Running migration: Add Evaluation Metrics", {
			component: "Migration",
			action: "up",
			metadata: { migrationId: "003-add-evaluation-metrics" },
		});

		// Create evaluation_categories table
		const createEvaluationCategoriesTable = `
      CREATE TABLE IF NOT EXISTS evaluation_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        weight DECIMAL(5,2) DEFAULT 1.0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

		// Create evaluation_scores table
		const createEvaluationScoresTable = `
      CREATE TABLE IF NOT EXISTS evaluation_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES evaluation_categories(id),
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(evaluation_id, category_id)
      )
    `;

		// Create evaluation_analytics table
		const createEvaluationAnalyticsTable = `
      CREATE TABLE IF NOT EXISTS evaluation_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_evaluations INTEGER DEFAULT 0,
        average_score DECIMAL(5,2),
        total_time_spent INTEGER DEFAULT 0,
        categories_breakdown JSONB DEFAULT '{}',
        improvement_trend JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `;

		// Create user_progress table
		const createUserProgressTable = `
      CREATE TABLE IF NOT EXISTS user_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_pack_id UUID REFERENCES content_packs(id),
        total_questions INTEGER DEFAULT 0,
        completed_questions INTEGER DEFAULT 0,
        average_score DECIMAL(5,2),
        best_score INTEGER,
        worst_score INTEGER,
        total_time_spent INTEGER DEFAULT 0,
        last_activity_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, content_pack_id)
      )
    `;

		// Add columns to evaluations table
		const alterEvaluationsTable = [
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS duration_seconds INTEGER",
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS word_count INTEGER",
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS character_count INTEGER",
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS reading_time_seconds INTEGER",
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2)",
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS complexity_score DECIMAL(5,2)",
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS clarity_score DECIMAL(5,2)",
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS relevance_score DECIMAL(5,2)",
			"ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS completeness_score DECIMAL(5,2)",
		];

		// Create indexes
		const createIndexes = [
			"CREATE INDEX IF NOT EXISTS idx_evaluation_categories_name ON evaluation_categories(name)",
			"CREATE INDEX IF NOT EXISTS idx_evaluation_categories_weight ON evaluation_categories(weight)",
			"CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation_id ON evaluation_scores(evaluation_id)",
			"CREATE INDEX IF NOT EXISTS idx_evaluation_scores_category_id ON evaluation_scores(category_id)",
			"CREATE INDEX IF NOT EXISTS idx_evaluation_scores_score ON evaluation_scores(score)",
			"CREATE INDEX IF NOT EXISTS idx_evaluation_analytics_user_id ON evaluation_analytics(user_id)",
			"CREATE INDEX IF NOT EXISTS idx_evaluation_analytics_date ON evaluation_analytics(date)",
			"CREATE INDEX IF NOT EXISTS idx_evaluation_analytics_average_score ON evaluation_analytics(average_score)",
			"CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id)",
			"CREATE INDEX IF NOT EXISTS idx_user_progress_content_pack_id ON user_progress(content_pack_id)",
			"CREATE INDEX IF NOT EXISTS idx_user_progress_average_score ON user_progress(average_score)",
			"CREATE INDEX IF NOT EXISTS idx_user_progress_last_activity ON user_progress(last_activity_at)",
			"CREATE INDEX IF NOT EXISTS idx_evaluations_duration ON evaluations(duration_seconds)",
			"CREATE INDEX IF NOT EXISTS idx_evaluations_word_count ON evaluations(word_count)",
			"CREATE INDEX IF NOT EXISTS idx_evaluations_confidence_score ON evaluations(confidence_score)",
		];

		// Insert default evaluation categories
		const insertDefaultCategories = `
      INSERT INTO evaluation_categories (name, description, weight) VALUES
      ('Clarity', 'How clear and understandable the response is', 1.0),
      ('Relevance', 'How relevant the response is to the question', 1.0),
      ('Completeness', 'How complete and comprehensive the response is', 1.0),
      ('Structure', 'How well-structured and organized the response is', 0.8),
      ('Confidence', 'How confident and assertive the response sounds', 0.8),
      ('Examples', 'Use of relevant examples and evidence', 0.6),
      ('Grammar', 'Grammar and language quality', 0.5),
      ('Creativity', 'Creativity and originality in the response', 0.4)
      ON CONFLICT DO NOTHING
    `;

		// Execute all SQL statements
		const statements = [
			createEvaluationCategoriesTable,
			createEvaluationScoresTable,
			createEvaluationAnalyticsTable,
			createUserProgressTable,
			...alterEvaluationsTable,
			...createIndexes,
			insertDefaultCategories,
		];

		for (const statement of statements) {
			const result = await databaseService.query(statement);
			if (result.error) {
				throw new Error(
					`Failed to execute migration statement: ${result.error}`,
				);
			}
		}

		logger.info("Migration completed: Add Evaluation Metrics", {
			component: "Migration",
			action: "up",
			metadata: { migrationId: "003-add-evaluation-metrics" },
		});
	},

	async down(): Promise<void> {
		logger.info("Rolling back migration: Add Evaluation Metrics", {
			component: "Migration",
			action: "down",
			metadata: { migrationId: "003-add-evaluation-metrics" },
		});

		// Drop tables
		const dropStatements = [
			"DROP TABLE IF EXISTS user_progress CASCADE",
			"DROP TABLE IF EXISTS evaluation_analytics CASCADE",
			"DROP TABLE IF EXISTS evaluation_scores CASCADE",
			"DROP TABLE IF EXISTS evaluation_categories CASCADE",
		];

		// Remove columns from evaluations table
		const alterEvaluationsTable = [
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS duration_seconds",
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS word_count",
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS character_count",
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS reading_time_seconds",
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS confidence_score",
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS complexity_score",
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS clarity_score",
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS relevance_score",
			"ALTER TABLE evaluations DROP COLUMN IF EXISTS completeness_score",
		];

		// Execute all SQL statements
		const statements = [...dropStatements, ...alterEvaluationsTable];

		for (const statement of statements) {
			const result = await databaseService.query(statement);
			if (result.error) {
				throw new Error(
					`Failed to execute rollback statement: ${result.error}`,
				);
			}
		}

		logger.info("Migration rollback completed: Add Evaluation Metrics", {
			component: "Migration",
			action: "down",
			metadata: { migrationId: "003-add-evaluation-metrics" },
		});
	},
};
