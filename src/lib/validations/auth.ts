import { z } from 'zod'

/**
 * Authentication validation schemas
 * Validates user authentication requests and responses
 */

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  )

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
  action: z
    .enum(['magiclink', 'signup', 'recovery'])
    .optional()
    .default('magiclink'),
})

export const userProfileSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  email: emailSchema,
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be less than 255 characters')
    .optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  entitlement_level: z.enum(['FREE', 'TRIAL', 'PRO']).default('FREE'),
  stripe_customer_id: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const userUpdateSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be less than 255 characters')
    .optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
})

export const entitlementSchema = z.object({
  id: z.string().uuid('Invalid entitlement ID'),
  user_id: z.string().uuid('Invalid user ID'),
  entitlement_level: z.enum(['FREE', 'TRIAL', 'PRO']),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const authErrorSchema = z.object({
  message: z.string().min(1, 'Error message is required'),
  status: z.number().int().min(100).max(599).optional(),
  code: z.string().optional(),
})

// Type exports
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>
export type UserProfile = z.infer<typeof userProfileSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>
export type Entitlement = z.infer<typeof entitlementSchema>
export type AuthError = z.infer<typeof authErrorSchema>
