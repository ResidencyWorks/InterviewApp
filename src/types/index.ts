/**
 * Main type definitions export
 * Centralizes all type definitions for easy importing
 */

// Database types
export * from './database'

// Authentication types
export * from './auth'

// Evaluation types
export * from './evaluation'

// Content types
export * from './content'

// API types
export * from './api'

// Common utility types
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SearchParams {
  query?: string
  filters?: Record<string, any>
  pagination?: PaginationParams
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FormField {
  name: string
  label: string
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio'
  required?: boolean
  placeholder?: string
  options?: SelectOption[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}
