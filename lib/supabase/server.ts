// lib/supabase/server.ts
// Server-side Supabase client for App Router (Next.js 14).
// Use in Server Components, Route Handlers, and Server Actions.
// Reads/writes cookies via Next.js cookies() for session management.

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types'

// ─── Standard server client ────────────────────────────────────────────────
// Uses the anon key — RLS is fully enforced.
// Use for all data fetching on behalf of the authenticated user.
export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookies are read-only here.
            // The root middleware.ts handles the actual session refresh.
          }
        },
      },
    },
  )
}

// ─── Admin client ──────────────────────────────────────────────────────────
// Uses the service role key — bypasses RLS entirely.
// Use ONLY in server-side API routes that need elevated privileges:
//   - Stripe webhook handlers
//   - Admin dashboard API routes
//   - Supabase Edge Function equivalents running server-side
// NEVER call this from client components or expose the key to the browser.
export function createAdminClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Read-only context — middleware handles refresh
          }
        },
      },
      auth: {
        // Prevent the admin client from persisting a session in cookies
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

// ─── Service client ────────────────────────────────────────────────────────
// Cookie-free admin client using supabase-js directly (no @supabase/ssr).
// Use in webhook handlers, cron jobs, background tasks — contexts that have
// no user session and no Next.js request/response cookies to manage.
// NEVER use in browser-facing routes.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
