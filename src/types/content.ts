/**
 * Content pack type definitions
 * Defines types for dynamic content management
 */

export interface ContentPack {
  id: string
  name: string
  version: string
  content: ContentPackData
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContentPackData {
  version: string
  name: string
  description: string
  categories: ContentCategory[]
  questions: ContentQuestion[]
  evaluation_criteria: EvaluationCriteria
  metadata: ContentPackMetadata
}

export interface ContentCategory {
  id: string
  name: string
  description: string
  weight: number
  criteria: string[]
}

export interface ContentQuestion {
  id: string
  category_id: string
  text: string
  type: 'behavioral' | 'technical' | 'situational'
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit: number
  tips: string[]
}

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

export interface ContentPackMetadata {
  author: string
  created_at: string
  updated_at: string
  tags: string[]
  language: string
  target_audience: string[]
}

export interface ContentPackUpload {
  file: File
  name: string
  version: string
}

export interface ContentPackValidation {
  valid: boolean
  version: string
  timestamp: string
  message: string
  errors?: string[]
}
