/**
 * Database type definitions for Supabase
 * Generated from the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserEntitlementLevel = 'FREE' | 'TRIAL' | 'PRO'
export type EvaluationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          entitlement_level: UserEntitlementLevel
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          entitlement_level?: UserEntitlementLevel
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          entitlement_level?: UserEntitlementLevel
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_entitlements: {
        Row: {
          id: string
          user_id: string
          entitlement_level: UserEntitlementLevel
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entitlement_level: UserEntitlementLevel
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entitlement_level?: UserEntitlementLevel
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      content_packs: {
        Row: {
          id: string
          name: string
          version: string
          content: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          version: string
          content: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          version?: string
          content?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      evaluation_results: {
        Row: {
          id: string
          user_id: string
          content_pack_id: string | null
          response_text: string | null
          response_audio_url: string | null
          response_type: 'text' | 'audio'
          duration_seconds: number | null
          word_count: number | null
          wpm: number | null
          categories: Json
          feedback: string | null
          score: number | null
          status: EvaluationStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_pack_id?: string | null
          response_text?: string | null
          response_audio_url?: string | null
          response_type: 'text' | 'audio'
          duration_seconds?: number | null
          word_count?: number | null
          wpm?: number | null
          categories?: Json
          feedback?: string | null
          score?: number | null
          status?: EvaluationStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_pack_id?: string | null
          response_text?: string | null
          response_audio_url?: string | null
          response_type?: 'text' | 'audio'
          duration_seconds?: number | null
          word_count?: number | null
          wpm?: number | null
          categories?: Json
          feedback?: string | null
          score?: number | null
          status?: EvaluationStatus
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_entitlement_level: UserEntitlementLevel
      evaluation_status: EvaluationStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
