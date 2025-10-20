import { z } from 'zod'

/**
 * Evaluation validation schemas
 * Validates evaluation requests and responses
 */

export const evaluationCategoriesSchema = z.object({
  clarity: z
    .number()
    .min(0)
    .max(100, 'Clarity score must be between 0 and 100'),
  structure: z
    .number()
    .min(0)
    .max(100, 'Structure score must be between 0 and 100'),
  content: z
    .number()
    .min(0)
    .max(100, 'Content score must be between 0 and 100'),
  delivery: z
    .number()
    .min(0)
    .max(100, 'Delivery score must be between 0 and 100'),
})

export const evaluationRequestSchema = z.object({
  response: z
    .string()
    .min(1, 'Response is required')
    .max(10000, 'Response must be less than 10,000 characters'),
  type: z.enum(['text', 'audio']),
  audio_url: z.string().url('Invalid audio URL').optional(),
  content_pack_id: z.string().uuid('Invalid content pack ID').optional(),
})

export const evaluationResponseSchema = z.object({
  duration: z.number().min(0, 'Duration must be positive'),
  word_count: z.number().int().min(0, 'Word count must be non-negative'),
  wpm: z
    .number()
    .min(0, 'WPM must be non-negative')
    .max(1000, 'WPM must be less than 1000'),
  categories: evaluationCategoriesSchema,
  feedback: z
    .string()
    .min(1, 'Feedback is required')
    .max(5000, 'Feedback must be less than 5,000 characters'),
  score: z.number().min(0).max(100, 'Score must be between 0 and 100'),
  timestamp: z.string().datetime('Invalid timestamp format'),
})

export const evaluationResultSchema = z.object({
  id: z.string().uuid('Invalid evaluation ID'),
  user_id: z.string().uuid('Invalid user ID'),
  content_pack_id: z.string().uuid('Invalid content pack ID').optional(),
  response_text: z.string().optional(),
  response_audio_url: z.string().url('Invalid audio URL').optional(),
  response_type: z.enum(['text', 'audio']),
  duration_seconds: z.number().int().min(0).optional(),
  word_count: z.number().int().min(0).optional(),
  wpm: z.number().min(0).max(1000).optional(),
  categories: evaluationCategoriesSchema,
  feedback: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const evaluationErrorSchema = z.object({
  message: z.string().min(1, 'Error message is required'),
  code: z.string().min(1, 'Error code is required'),
  status: z.number().int().min(100).max(599),
})

// Type exports
export type EvaluationCategories = z.infer<typeof evaluationCategoriesSchema>
export type EvaluationRequest = z.infer<typeof evaluationRequestSchema>
export type EvaluationResponse = z.infer<typeof evaluationResponseSchema>
export type EvaluationResult = z.infer<typeof evaluationResultSchema>
export type EvaluationError = z.infer<typeof evaluationErrorSchema>
