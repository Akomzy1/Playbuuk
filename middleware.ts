// middleware.ts — root Next.js middleware
// Runs on every matched request before the page renders.
//
// Responsibilities:
//   1. Refresh the Supabase auth session (keeps JWT alive without page reload)
//   2. Enforce route protection based on auth state and user role
//
// Route rules (from CLAUDE.md):
//   Public (no auth needed):  /, /login, /signup, /mentor/[id] (preview), /api/public/*
//   Auth required:            /journal, /accounts, /requests, /scanner
//   Mentor or admin only:     /portal/*
//   Admin only:               /admin/*
//   API routes:               /api/* — auth checked per-route, not here

import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import type { Role } from '@/lib/supabase/types'

// ─── Route matchers ────────────────────────────────────────────────────────────

/** Paths the middleware does not run on at all */
const SKIP_PATHS = [
  '/_next/',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/robots.txt',
  '/sitemap.xml',
  '/og/',           // OG image routes
]

/** Fully public paths — no auth check needed */
const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback']

/** Mentor or admin only */
const PORTAL_PREFIX = '/portal'

/** Admin only */
const ADMIN_PREFIX = '/admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSkipped(pathname: string): boolean {
  return SKIP_PATHS.some((p) => pathname.startsWith(p))
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  // Mentor profile pages are publicly accessible (preview — tier gate is in the page)
  if (pathname.startsWith('/mentor/')) return true
  // Auth callback
  if (pathname.startsWith('/auth/')) return true
  return false
}

function requiresPortalAccess(pathname: string): boolean {
  return pathname.startsWith(PORTAL_PREFIX)
}

function requiresAdminAccess(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PREFIX)
}

// ─── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and Next.js internals immediately
  if (isSkipped(pathname)) {
    return NextResponse.next()
  }

  // Create the Supabase client and refresh the session.
  // IMPORTANT: getUser() must be called (not getSession()) — it validates the
  // JWT against Supabase Auth, detecting expired or revoked tokens correctly.
  const { supabase, response } = await createMiddlewareClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Public routes: pass through immediately ─────────────────────────────────
  if (isPublic(pathname)) {
    // Redirect already-authenticated users away from login/signup
    if (user && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // ── Unauthenticated: redirect to login ─────────────────────────────────────
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Role-gated routes: fetch profile role ──────────────────────────────────
  // Only hit the DB for portal/* and admin/* — all other auth routes just need a valid user
  if (requiresPortalAccess(pathname) || requiresAdminAccess(pathname)) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // maybeSingle() return type is inferred from the Database generic — cast to
    // the narrowed shape we actually selected so TypeScript is satisfied.
    const role: Role = ((data as { role: Role } | null)?.role) ?? 'trader'

    // /admin/* — admin only
    if (requiresAdminAccess(pathname) && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // /portal/* — mentor or admin
    if (requiresPortalAccess(pathname) && role !== 'mentor' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── Authenticated route: pass through with refreshed session ───────────────
  return response
}

// ─── Matcher ───────────────────────────────────────────────────────────────────
// Run middleware on all routes except Next.js internals and static files.
// The isSkipped() check inside the function handles fine-grained exclusions.

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - Files with extensions (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot)$).*)',
  ],
}
