import { z } from 'zod'

/**
 * API validation schemas
 * Validates API requests and responses
 */

export const apiResponseSchema = z.object({
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  status: z.number().int().min(100).max(599),
})

export const apiErrorSchema = z.object({
  message: z.string().min(1, 'Error message is required'),
  code: z.string().min(1, 'Error code is required'),
  status: z.number().int().min(100).max(599),
  details: z.any().optional(),
})

export const paginationParamsSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be less than 100')
    .default(20),
  sort_by: z.string().min(1, 'Sort by field is required').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

export const searchParamsSchema = z.object({
  query: z
    .string()
    .min(1, 'Query is required')
    .max(255, 'Query must be less than 255 characters')
    .optional(),
  filters: z.record(z.string(), z.any()).optional(),
  pagination: paginationParamsSchema.optional(),
})

export const selectOptionSchema = z.object({
  value: z.string().min(1, 'Value is required'),
  label: z.string().min(1, 'Label is required'),
  disabled: z.boolean().optional().default(false),
})

export const formFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  label: z.string().min(1, 'Field label is required'),
  type: z.enum([
    'text',
    'email',
    'password',
    'textarea',
    'select',
    'checkbox',
    'radio',
  ]),
  required: z.boolean().optional().default(false),
  placeholder: z.string().optional(),
  options: z.array(selectOptionSchema).optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
})

export const notificationSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
  type: z.enum(['success', 'error', 'warning', 'info']),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(1000, 'Message must be less than 1,000 characters'),
  duration: z
    .number()
    .int()
    .min(1000, 'Duration must be at least 1000ms')
    .max(30000, 'Duration must be less than 30 seconds')
    .optional(),
  action: z
    .object({
      label: z.string().min(1, 'Action label is required'),
      onClick: z.function(),
    })
    .optional(),
})

// Type exports
export type ApiResponse<T = any> = z.infer<typeof apiResponseSchema> & {
  data?: T
}
export type ApiError = z.infer<typeof apiErrorSchema>
export type PaginationParams = z.infer<typeof paginationParamsSchema>
export type SearchParams = z.infer<typeof searchParamsSchema>
export type SelectOption = z.infer<typeof selectOptionSchema>
export type FormField = z.infer<typeof formFieldSchema>
export type Notification = z.infer<typeof notificationSchema>
