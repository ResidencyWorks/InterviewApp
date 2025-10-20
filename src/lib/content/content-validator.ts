import type { ContentPackData } from '@/types/content'
import { z } from 'zod'
import type {
  ContentValidationResult,
  ContentValidationRule,
} from './content-types'

/**
 * Content pack validation schema
 */
const contentCategorySchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().min(1, 'Description is required'),
  weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
  criteria: z
    .array(z.string().min(1, 'Criteria cannot be empty'))
    .min(1, 'At least one criteria is required'),
})

const contentQuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  category_id: z.string().min(1, 'Category ID is required'),
  text: z
    .string()
    .min(1, 'Question text is required')
    .max(2000, 'Question text must be less than 2000 characters'),
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

const evaluationCriteriaSchema = z.object({
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

const contentPackMetadataSchema = z.object({
  author: z.string().min(1, 'Author is required'),
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

const contentPackDataSchema = z.object({
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
    .max(1000, 'Description must be less than 1000 characters'),
  categories: z
    .array(contentCategorySchema)
    .min(1, 'At least one category is required'),
  questions: z
    .array(contentQuestionSchema)
    .min(1, 'At least one question is required'),
  evaluation_criteria: evaluationCriteriaSchema,
  metadata: contentPackMetadataSchema,
})

/**
 * Content pack validator class
 */
export class ContentPackValidator {
  private rules: ContentValidationRule[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        name: 'schema_validation',
        description: 'Validate against JSON schema',
        validate: (data) => {
          try {
            contentPackDataSchema.parse(data)
            return { valid: true }
          } catch (error) {
            if (error instanceof z.ZodError) {
              return {
                valid: false,
                error: error.issues.map((e) => e.message).join(', '),
              }
            }
            return { valid: false, error: 'Schema validation failed' }
          }
        },
        severity: 'error',
      },
      {
        name: 'weight_sum_validation',
        description: 'Validate that evaluation criteria weights sum to 1',
        validate: (data) => {
          const criteria = data.evaluation_criteria
          const totalWeight = Object.values(criteria).reduce(
            (sum, category) => sum + category.weight,
            0
          )
          const tolerance = 0.01 // Allow small floating point errors

          if (Math.abs(totalWeight - 1) > tolerance) {
            return {
              valid: false,
              error: `Evaluation criteria weights must sum to 1, got ${totalWeight}`,
            }
          }
          return { valid: true }
        },
        severity: 'error',
      },
      {
        name: 'question_category_consistency',
        description: 'Validate that all questions reference valid categories',
        validate: (data) => {
          const categoryIds = new Set(data.categories.map((c) => c.id))
          const invalidQuestions = data.questions.filter(
            (q) => !categoryIds.has(q.category_id)
          )

          if (invalidQuestions.length > 0) {
            return {
              valid: false,
              error: `Questions reference invalid categories: ${invalidQuestions.map((q) => q.id).join(', ')}`,
            }
          }
          return { valid: true }
        },
        severity: 'error',
      },
      {
        name: 'question_count_validation',
        description: 'Validate minimum question count',
        validate: (data) => {
          if (data.questions.length < 5) {
            return {
              valid: false,
              error: 'Content pack must have at least 5 questions',
            }
          }
          return { valid: true }
        },
        severity: 'warning',
      },
      {
        name: 'category_balance_validation',
        description:
          'Validate balanced distribution of questions across categories',
        validate: (data) => {
          const categoryQuestionCounts = data.categories.map((category) => ({
            category: category.name,
            count: data.questions.filter((q) => q.category_id === category.id)
              .length,
          }))

          const minQuestions = Math.min(
            ...categoryQuestionCounts.map((c) => c.count)
          )
          const maxQuestions = Math.max(
            ...categoryQuestionCounts.map((c) => c.count)
          )

          if (maxQuestions - minQuestions > 3) {
            return {
              valid: false,
              error:
                'Questions should be more evenly distributed across categories',
            }
          }
          return { valid: true }
        },
        severity: 'warning',
      },
      {
        name: 'difficulty_distribution_validation',
        description: 'Validate balanced difficulty distribution',
        validate: (data) => {
          const difficultyCounts = data.questions.reduce(
            (acc, q) => {
              acc[q.difficulty] = (acc[q.difficulty] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )

          const totalQuestions = data.questions.length
          const easyPercent = (difficultyCounts.easy || 0) / totalQuestions
          const hardPercent = (difficultyCounts.hard || 0) / totalQuestions

          if (easyPercent > 0.7) {
            return { valid: false, error: 'Too many easy questions (>70%)' }
          }
          if (hardPercent > 0.5) {
            return { valid: false, error: 'Too many hard questions (>50%)' }
          }
          return { valid: true }
        },
        severity: 'warning',
      },
    ]
  }

  /**
   * Add a custom validation rule
   * @param rule - Validation rule to add
   */
  addRule(rule: ContentValidationRule): void {
    this.rules.push(rule)
  }

  /**
   * Remove a validation rule
   * @param ruleName - Name of the rule to remove
   */
  removeRule(ruleName: string): void {
    this.rules = this.rules.filter((rule) => rule.name !== ruleName)
  }

  /**
   * Validate content pack data
   * @param data - Content pack data to validate
   * @returns Validation result
   */
  async validate(data: ContentPackData): Promise<ContentValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let valid = true

    // Run all validation rules
    for (const rule of this.rules) {
      try {
        const result = rule.validate(data)
        if (!result.valid) {
          if (rule.severity === 'error') {
            errors.push(`${rule.name}: ${result.error}`)
            valid = false
          } else {
            warnings.push(`${rule.name}: ${result.error}`)
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown validation error'
        if (rule.severity === 'error') {
          errors.push(`${rule.name}: ${errorMessage}`)
          valid = false
        } else {
          warnings.push(`${rule.name}: ${errorMessage}`)
        }
      }
    }

    // Calculate metadata
    const metadata = {
      question_count: data.questions.length,
      category_count: data.categories.length,
      estimated_duration: data.questions.reduce(
        (total, q) => total + q.time_limit,
        0
      ),
      file_size: JSON.stringify(data).length,
    }

    return {
      valid,
      errors,
      warnings,
      metadata,
    }
  }

  /**
   * Validate content pack file
   * @param file - File to validate
   * @returns Promise resolving to validation result
   */
  async validateFile(file: File): Promise<ContentValidationResult> {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      return await this.validate(data)
    } catch (error) {
      return {
        valid: false,
        errors: [
          error instanceof Error ? error.message : 'Failed to parse file',
        ],
        warnings: [],
      }
    }
  }

  /**
   * Get validation rules
   * @returns Array of validation rules
   */
  getRules(): ContentValidationRule[] {
    return [...this.rules]
  }
}

// Export singleton instance
export const contentPackValidator = new ContentPackValidator()
