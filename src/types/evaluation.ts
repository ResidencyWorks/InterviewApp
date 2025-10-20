/**
 * Evaluation type definitions
 * Defines types for AI-powered interview evaluation
 */

export interface EvaluationCategories {
  clarity: number
  structure: number
  content: number
  delivery: number
}

export interface EvaluationResult {
  id: string
  user_id: string
  content_pack_id: string | null
  response_text: string | null
  response_audio_url: string | null
  response_type: 'text' | 'audio'
  duration_seconds: number | null
  word_count: number | null
  wpm: number | null
  categories: EvaluationCategories
  feedback: string | null
  score: number | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  created_at: string
  updated_at: string
}

export interface EvaluationRequest {
  response: string
  type: 'text' | 'audio'
  audio_url?: string
  content_pack_id?: string
}

export interface EvaluationResponse {
  duration: number
  word_count: number
  wpm: number
  categories: EvaluationCategories
  feedback: string
  score: number
  timestamp: string
}

export interface EvaluationError {
  message: string
  code: string
  status: number
}
