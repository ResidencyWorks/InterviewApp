import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Next.js middleware for authentication and route protection
 * Handles Supabase session management and protected route access
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set({ name, value, ...options })
          }
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedRoutes = ['/drill', '/loader']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Auth routes that should redirect if already authenticated
  const authRoutes = ['/login', '/callback']
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing auth routes with session
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/drill', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
