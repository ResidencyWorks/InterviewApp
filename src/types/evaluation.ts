/**
 * Evaluation-related types and interfaces
 */

import type { BaseEntity } from './common'

/**
 * Evaluation categories
 */
export interface EvaluationCategories {
  clarity: number
  structure: number
  content: number
  delivery: number
}

/**
 * Evaluation response interface
 */
export interface EvaluationResponse {
  duration: number
  word_count: number
  wpm: number
  categories: EvaluationCategories
  feedback: string
  score: number
  timestamp: string
}

/**
 * Evaluation result interface
 */
export interface EvaluationResult extends BaseEntity {
  user_id: string
  content_pack_id?: string
  response_text?: string
  response_audio_url?: string
  response_type: 'text' | 'audio'
  duration_seconds?: number
  word_count?: number
  wpm?: number
  categories: EvaluationCategories
  feedback?: string
  score?: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  error_message?: string
  metadata?: Record<string, any>
}

/**
 * Evaluation request interface
 */
export interface EvaluationRequest {
  response: string
  type: 'text' | 'audio'
  audio_url?: string
  content_pack_id?: string
  question_id?: string
  metadata?: Record<string, any>
}

/**
 * Evaluation criteria interface
 */
export interface EvaluationCriteria {
  clarity: {
    weight: number
    description: string
    factors: string[]
  }
  structure: {
    weight: number
    description: string
    factors: string[]
  }
  content: {
    weight: number
    description: string
    factors: string[]
  }
  delivery: {
    weight: number
    description: string
    factors: string[]
  }
}

/**
 * Evaluation question interface
 */
export interface EvaluationQuestion {
  id: string
  category_id: string
  text: string
  type: 'behavioral' | 'technical' | 'situational'
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit: number
  tips: string[]
  evaluation_criteria: EvaluationCriteria
}

/**
 * Evaluation session interface
 */
export interface EvaluationSession extends BaseEntity {
  user_id: string
  content_pack_id: string
  question_id: string
  started_at: string
  completed_at?: string
  status: 'in_progress' | 'completed' | 'abandoned'
  current_question_index: number
  total_questions: number
  metadata?: Record<string, any>
}

/**
 * Evaluation analytics interface
 */
export interface EvaluationAnalytics {
  total_evaluations: number
  average_score: number
  score_distribution: Record<string, number>
  category_averages: EvaluationCategories
  improvement_trends: {
    clarity: number[]
    structure: number[]
    content: number[]
    delivery: number[]
  }
  time_spent: number
  completion_rate: number
}

/**
 * Evaluation feedback interface
 */
export interface EvaluationFeedback {
  id: string
  evaluation_id: string
  user_id: string
  rating: number
  comment?: string
  helpful: boolean
  created_at: string
}

/**
 * Evaluation comparison interface
 */
export interface EvaluationComparison {
  current: EvaluationResult
  previous?: EvaluationResult
  improvement: {
    score: number
    categories: Partial<EvaluationCategories>
  }
  trends: {
    score_trend: 'up' | 'down' | 'stable'
    category_trends: Partial<
      Record<keyof EvaluationCategories, 'up' | 'down' | 'stable'>
    >
  }
}

/**
 * Evaluation export interface
 */
export interface EvaluationExport {
  format: 'csv' | 'json' | 'pdf'
  date_range: {
    start: string
    end: string
  }
  filters?: {
    categories?: string[]
    score_range?: {
      min: number
      max: number
    }
  }
  include_feedback: boolean
  include_metadata: boolean
}
