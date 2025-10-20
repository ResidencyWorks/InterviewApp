import type { UserProfile } from '@/types'
import posthog from 'posthog-js'
import type { PostHog } from 'posthog-js'

/**
 * PostHog analytics configuration and utilities
 * Handles user tracking and event analytics
 */

// PostHog configuration
const posthogConfig = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  person_profiles: 'identified_only', // Only create profiles for identified users
  capture_pageview: false, // We'll handle pageview tracking manually
  capture_pageleave: true,
  loaded: (posthog: PostHog) => {
    if (process.env.NODE_ENV === 'development') {
      posthog.debug()
    }
  },
}

/**
 * Analytics service for PostHog
 */
export class AnalyticsService {
  private posthog: PostHog | null = null
  private isInitialized = false

  /**
   * Initialize PostHog
   */
  init(): void {
    if (typeof window === 'undefined' || this.isInitialized) {
      return
    }

    try {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
        ...posthogConfig,
        person_profiles: 'identified_only',
      })
      this.posthog = posthog
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize PostHog:', error)
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string, userProfile?: UserProfile): void {
    if (!this.posthog) {
      this.init()
    }

    if (this.posthog) {
      this.posthog.identify(userId, {
        email: userProfile?.email,
        full_name: userProfile?.full_name,
        entitlement_level: userProfile?.entitlement_level,
        created_at: userProfile?.created_at,
      })
    }
  }

  /**
   * Reset user identification
   */
  reset(): void {
    if (this.posthog) {
      this.posthog.reset()
    }
  }

  /**
   * Track an event
   */
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.posthog) {
      this.init()
    }

    if (this.posthog) {
      this.posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * Track page view
   */
  trackPageView(pageName?: string, properties?: Record<string, any>): void {
    if (!this.posthog) {
      this.init()
    }

    if (this.posthog) {
      this.posthog.capture('$pageview', {
        page: pageName || window.location.pathname,
        ...properties,
      })
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (this.posthog) {
      this.posthog.people.set(properties)
    }
  }

  /**
   * Track evaluation events
   */
  trackEvaluationStarted(userId: string, contentPackId?: string): void {
    this.track('evaluation_started', {
      user_id: userId,
      content_pack_id: contentPackId,
    })
  }

  trackEvaluationCompleted(
    userId: string,
    result: {
      score: number
      categories: Record<string, number>
      duration: number
      word_count: number
    },
    contentPackId?: string
  ): void {
    this.track('evaluation_completed', {
      user_id: userId,
      content_pack_id: contentPackId,
      score: result.score,
      categories: result.categories,
      duration: result.duration,
      word_count: result.word_count,
    })
  }

  trackEvaluationFailed(
    userId: string,
    error: string,
    contentPackId?: string
  ): void {
    this.track('evaluation_failed', {
      user_id: userId,
      content_pack_id: contentPackId,
      error,
    })
  }

  /**
   * Track authentication events
   */
  trackLogin(method: 'magic_link' | 'email' | 'oauth'): void {
    this.track('user_login', {
      method,
    })
  }

  trackLogout(): void {
    this.track('user_logout')
  }

  trackSignup(method: 'magic_link' | 'email' | 'oauth'): void {
    this.track('user_signup', {
      method,
    })
  }

  /**
   * Track content pack events
   */
  trackContentPackLoaded(packId: string, version: string): void {
    this.track('content_pack_loaded', {
      pack_id: packId,
      version,
    })
  }

  trackContentPackUploaded(
    packId: string,
    version: string,
    success: boolean
  ): void {
    this.track('content_pack_uploaded', {
      pack_id: packId,
      version,
      success,
    })
  }

  /**
   * Track UI events
   */
  trackButtonClick(buttonName: string, location?: string): void {
    this.track('button_clicked', {
      button_name: buttonName,
      location,
    })
  }

  trackFormSubmission(formName: string, success: boolean): void {
    this.track('form_submitted', {
      form_name: formName,
      success,
    })
  }

  trackModalOpened(modalName: string): void {
    this.track('modal_opened', {
      modal_name: modalName,
    })
  }

  trackModalClosed(modalName: string): void {
    this.track('modal_closed', {
      modal_name: modalName,
    })
  }

  /**
   * Track performance events
   */
  trackPageLoad(pageName: string, loadTime: number): void {
    this.track('page_load', {
      page_name: pageName,
      load_time: loadTime,
    })
  }

  trackApiCall(endpoint: string, duration: number, success: boolean): void {
    this.track('api_call', {
      endpoint,
      duration,
      success,
    })
  }

  /**
   * Track error events
   */
  trackError(error: string, context?: Record<string, any>): void {
    this.track('error_occurred', {
      error,
      context,
    })
  }

  /**
   * Track business events
   */
  trackSubscriptionCreated(plan: string, amount: number): void {
    this.track('subscription_created', {
      plan,
      amount,
    })
  }

  trackSubscriptionCancelled(plan: string): void {
    this.track('subscription_cancelled', {
      plan,
    })
  }

  trackTrialStarted(plan: string): void {
    this.track('trial_started', {
      plan,
    })
  }

  trackTrialEnded(plan: string, converted: boolean): void {
    this.track('trial_ended', {
      plan,
      converted,
    })
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()

/**
 * React hook for analytics
 */
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    identify: analytics.identify.bind(analytics),
    reset: analytics.reset.bind(analytics),
    setUserProperties: analytics.setUserProperties.bind(analytics),
  }
}

/**
 * Analytics event constants
 */
export const ANALYTICS_EVENTS = {
  // User events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_SIGNUP: 'user_signup',

  // Evaluation events
  EVALUATION_STARTED: 'evaluation_started',
  EVALUATION_COMPLETED: 'evaluation_completed',
  EVALUATION_FAILED: 'evaluation_failed',

  // Content events
  CONTENT_PACK_LOADED: 'content_pack_loaded',
  CONTENT_PACK_UPLOADED: 'content_pack_uploaded',

  // UI events
  BUTTON_CLICKED: 'button_clicked',
  FORM_SUBMITTED: 'form_submitted',
  MODAL_OPENED: 'modal_opened',
  MODAL_CLOSED: 'modal_closed',

  // Performance events
  PAGE_LOAD: 'page_load',
  API_CALL: 'api_call',

  // Error events
  ERROR_OCCURRED: 'error_occurred',

  // Business events
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  TRIAL_STARTED: 'trial_started',
  TRIAL_ENDED: 'trial_ended',
} as const

/**
 * Initialize analytics on app start
 */
export function initializeAnalytics(): void {
  if (typeof window !== 'undefined') {
    analytics.init()
  }
}
