-- Add evaluation metrics migration (converted from TypeScript)
-- Version: 1.2.0
-- Description: Adds comprehensive evaluation metrics and analytics tables

-- Create evaluation_categories table
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  weight DECIMAL(5,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create evaluation_scores table
CREATE TABLE IF NOT EXISTS evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES evaluation_categories(id),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(evaluation_id, category_id)
);

-- Create evaluation_analytics table
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
);

-- Create user_progress table
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
);

-- Add columns to evaluations table
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS character_count INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS reading_time_seconds INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS complexity_score DECIMAL(5,2);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS clarity_score DECIMAL(5,2);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS relevance_score DECIMAL(5,2);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS completeness_score DECIMAL(5,2);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_name ON evaluation_categories(name);
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_weight ON evaluation_categories(weight);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation_id ON evaluation_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_category_id ON evaluation_scores(category_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_score ON evaluation_scores(score);
CREATE INDEX IF NOT EXISTS idx_evaluation_analytics_user_id ON evaluation_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_analytics_date ON evaluation_analytics(date);
CREATE INDEX IF NOT EXISTS idx_evaluation_analytics_average_score ON evaluation_analytics(average_score);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_content_pack_id ON user_progress(content_pack_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_average_score ON user_progress(average_score);
CREATE INDEX IF NOT EXISTS idx_user_progress_last_activity ON user_progress(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_duration ON evaluations(duration_seconds);
CREATE INDEX IF NOT EXISTS idx_evaluations_word_count ON evaluations(word_count);
CREATE INDEX IF NOT EXISTS idx_evaluations_confidence_score ON evaluations(confidence_score);

-- Insert default evaluation categories
INSERT INTO evaluation_categories (name, description, weight) VALUES
('Clarity', 'How clear and understandable the response is', 1.0),
('Relevance', 'How relevant the response is to the question', 1.0),
('Completeness', 'How complete and comprehensive the response is', 1.0),
('Structure', 'How well-structured and organized the response is', 0.8),
('Confidence', 'How confident and assertive the response sounds', 0.8),
('Examples', 'Use of relevant examples and evidence', 0.6),
('Grammar', 'Grammar and language quality', 0.5),
('Creativity', 'Creativity and originality in the response', 0.4)
ON CONFLICT DO NOTHING;
