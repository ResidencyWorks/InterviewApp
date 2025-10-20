/**
 * Validation schemas export
 * Centralizes all Zod validation schemas for easy importing
 */

// Authentication validations
export * from './auth'

// Evaluation validations
export * from './evaluation'

// Content validations
export * from './content'

// API validations
export * from './api'

// Common validation utilities
import { z } from 'zod'

/**
 * Common validation patterns
 */
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  datetime: z.string().datetime('Invalid datetime format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().min(0, 'Must be non-negative'),
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]+$/,
      'Must be a valid slug (lowercase letters, numbers, and hyphens only)'
    ),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  strongPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
}

/**
 * Validation helper functions
 */
export const validationHelpers = {
  /**
   * Validates a form field value against a schema
   */
  validateField: <T>(
    schema: z.ZodSchema<T>,
    value: unknown
  ): { success: boolean; data?: T; error?: string } => {
    try {
      const data = schema.parse(value)
      return { success: true, data }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.issues[0]?.message || 'Validation failed',
        }
      }
      return { success: false, error: 'Unknown validation error' }
    }
  },

  /**
   * Validates multiple form fields
   */
  validateForm: <T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: boolean; data?: T; errors?: Record<string, string> } => {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        for (const err of error.issues) {
          const path = err.path.join('.')
          errors[path] = err.message
        }
        return { success: false, errors }
      }
      return { success: false, errors: { general: 'Unknown validation error' } }
    }
  },

  /**
   * Creates a safe parser that returns a result object instead of throwing
   */
  safeParse: <T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: boolean; data?: T; error?: z.ZodError } => {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
  },
}
