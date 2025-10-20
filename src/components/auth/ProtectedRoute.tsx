'use client'

import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  requiredEntitlement?: 'FREE' | 'TRIAL' | 'PRO'
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * Protected route wrapper component
 * Ensures user is authenticated and has required permissions
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredEntitlement,
  fallback,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push(redirectTo)
      return
    }

    // Check role requirement
    if (requiredRole) {
      const userRole = user.user_metadata?.role || 'user'
      if (userRole !== requiredRole) {
        router.push('/unauthorized')
        return
      }
    }

    // Check entitlement requirement
    if (requiredEntitlement) {
      const userEntitlement = user.user_metadata?.entitlement_level || 'FREE'
      const entitlementLevels = { FREE: 0, TRIAL: 1, PRO: 2 }

      if (
        entitlementLevels[userEntitlement as keyof typeof entitlementLevels] <
        entitlementLevels[requiredEntitlement]
      ) {
        router.push('/upgrade')
        return
      }
    }

    setIsAuthorized(true)
    setIsChecking(false)
  }, [user, loading, requiredRole, requiredEntitlement, router, redirectTo])

  if (loading || isChecking) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
      )
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

/**
 * Higher-order component for protecting routes
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

/**
 * Hook to check if user has required permissions
 */
export function usePermissions() {
  const { user } = useAuth()

  const hasRole = (role: string): boolean => {
    if (!user) return false
    return user.user_metadata?.role === role
  }

  const hasEntitlement = (entitlement: 'FREE' | 'TRIAL' | 'PRO'): boolean => {
    if (!user) return false

    const userEntitlement = user.user_metadata?.entitlement_level || 'FREE'
    const entitlementLevels = { FREE: 0, TRIAL: 1, PRO: 2 }

    return (
      entitlementLevels[userEntitlement as keyof typeof entitlementLevels] >=
      entitlementLevels[entitlement]
    )
  }

  const canAccess = (resource: string): boolean => {
    if (!user) return false

    // Define access rules based on user role and entitlement
    const userRole = user.user_metadata?.role || 'user'

    switch (resource) {
      case 'admin':
        return userRole === 'admin'
      case 'pro_features':
        return hasEntitlement('PRO')
      case 'trial_features':
        return hasEntitlement('TRIAL')
      case 'basic_features':
        return hasEntitlement('FREE')
      default:
        return true
    }
  }

  return {
    hasRole,
    hasEntitlement,
    canAccess,
    user,
  }
}
