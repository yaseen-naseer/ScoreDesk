import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/reset-password',
  '/auth/callback',
  '/auth/auth-code-error',
]

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/organizations',
  '/tournaments',
  '/teams',
  '/players',
  '/matches',
  '/stats',
  '/reports',
  '/settings',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Update Supabase session
  const response = await updateSession(request)
  
  // Check if route requires authentication
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  
  // If it's a public route, allow access
  if (isPublicRoute) {
    return response
  }
  
  // For protected routes, check authentication
  if (isProtectedRoute) {
    // If user is not authenticated, redirect to login
    const authCookie = request.cookies.get('sb-access-token')
    if (!authCookie) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
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
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
