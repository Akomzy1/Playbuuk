// lib/supabase/middleware.ts
// Creates a Supabase client scoped to a middleware Request/Response pair.
// Used exclusively by the root middleware.ts — not for use elsewhere.
// Must read and write cookies on the request/response to keep the session alive.

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from './types'

export async function createMiddlewareClient(request: NextRequest) {
  // Start with the unmodified request — we'll attach cookie mutations
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies onto both the request (for SSR) and the response (for the browser)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  return { supabase, response: supabaseResponse }
}
