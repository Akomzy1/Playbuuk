// lib/supabase/client.ts
// Browser-side Supabase client — safe to use in "use client" components.
// Creates a singleton per browser tab using cookies for session storage.
// Never use this in Server Components or API routes — use server.ts instead.

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
