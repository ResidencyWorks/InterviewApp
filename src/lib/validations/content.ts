import { z } from 'zod'

/**
 * Content pack validation schemas
 * Validates content pack data and uploads
 */

export const contentCategorySchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1,000 characters'),
  weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
  criteria: z
    .array(z.string().min(1, 'Criteria cannot be empty'))
    .min(1, 'At least one criteria is required'),
})

export const contentQuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  category_id: z.string().min(1, 'Category ID is required'),
  text: z
    .string()
    .min(1, 'Question text is required')
    .max(2000, 'Question text must be less than 2,000 characters'),
  type: z.enum(['behavioral', 'technical', 'situational']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  time_limit: z
    .number()
    .int()
    .min(30, 'Time limit must be at least 30 seconds')
    .max(1800, 'Time limit must be less than 30 minutes'),
  tips: z
    .array(z.string().min(1, 'Tip cannot be empty'))
    .min(1, 'At least one tip is required'),
})

export const evaluationCriteriaSchema = z.object({
  clarity: z.object({
    weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
    description: z.string().min(1, 'Description is required'),
    factors: z
      .array(z.string().min(1, 'Factor cannot be empty'))
      .min(1, 'At least one factor is required'),
  }),
  structure: z.object({
    weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
    description: z.string().min(1, 'Description is required'),
    factors: z
      .array(z.string().min(1, 'Factor cannot be empty'))
      .min(1, 'At least one factor is required'),
  }),
  content: z.object({
    weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
    description: z.string().min(1, 'Description is required'),
    factors: z
      .array(z.string().min(1, 'Factor cannot be empty'))
      .min(1, 'At least one factor is required'),
  }),
  delivery: z.object({
    weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
    description: z.string().min(1, 'Description is required'),
    factors: z
      .array(z.string().min(1, 'Factor cannot be empty'))
      .min(1, 'At least one factor is required'),
  }),
})

export const contentPackMetadataSchema = z.object({
  author: z
    .string()
    .min(1, 'Author is required')
    .max(255, 'Author name must be less than 255 characters'),
  created_at: z.string().datetime('Invalid created_at format'),
  updated_at: z.string().datetime('Invalid updated_at format'),
  tags: z
    .array(z.string().min(1, 'Tag cannot be empty'))
    .min(1, 'At least one tag is required'),
  language: z
    .string()
    .min(2, 'Language code must be at least 2 characters')
    .max(10, 'Language code must be less than 10 characters'),
  target_audience: z
    .array(z.string().min(1, 'Target audience cannot be empty'))
    .min(1, 'At least one target audience is required'),
})

export const contentPackDataSchema = z.object({
  version: z
    .string()
    .min(1, 'Version is required')
    .max(50, 'Version must be less than 50 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1,000 characters'),
  categories: z
    .array(contentCategorySchema)
    .min(1, 'At least one category is required'),
  questions: z
    .array(contentQuestionSchema)
    .min(1, 'At least one question is required'),
  evaluation_criteria: evaluationCriteriaSchema,
  metadata: contentPackMetadataSchema,
})

export const contentPackSchema = z.object({
  id: z.string().uuid('Invalid content pack ID'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  version: z
    .string()
    .min(1, 'Version is required')
    .max(50, 'Version must be less than 50 characters'),
  content: contentPackDataSchema,
  is_active: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const contentUploadSchema = z.object({
  file: z.instanceof(File),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  version: z
    .string()
    .min(1, 'Version is required')
    .max(50, 'Version must be less than 50 characters'),
})

export const contentValidationSchema = z.object({
  valid: z.boolean(),
  version: z.string().min(1, 'Version is required'),
  timestamp: z.string().datetime('Invalid timestamp format'),
  message: z.string().min(1, 'Message is required'),
  errors: z.array(z.string().min(1, 'Error cannot be empty')).optional(),
})

// Type exports
export type ContentCategory = z.infer<typeof contentCategorySchema>
export type ContentQuestion = z.infer<typeof contentQuestionSchema>
export type EvaluationCriteria = z.infer<typeof evaluationCriteriaSchema>
export type ContentPackMetadata = z.infer<typeof contentPackMetadataSchema>
export type ContentPackData = z.infer<typeof contentPackDataSchema>
export type ContentPack = z.infer<typeof contentPackSchema>
export type ContentUpload = z.infer<typeof contentUploadSchema>
export type ContentValidation = z.infer<typeof contentValidationSchema>
