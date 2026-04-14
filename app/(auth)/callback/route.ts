// app/(auth)/callback/route.ts
// Supabase Auth OAuth callback handler.
// Exchanges the one-time auth code for a session, then redirects the user.
//
// Registered as the redirect URL in:
//   - Supabase dashboard → Auth → URL Configuration → Redirect URLs
//   - Each OAuth provider's app settings (Google Cloud Console, etc.)
//
// URL structure: /callback?code=<code>&next=<path>
//   code  — the one-time auth code Supabase provides after OAuth
//   next  — optional redirect target after successful auth (default: /)

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Session established — forward to the intended destination
      const destination = next.startsWith('/') ? next : '/'
      return NextResponse.redirect(`${origin}${destination}`)
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
  }

  // Missing code or exchange failed — send back to login with an error flag
  return NextResponse.redirect(
    `${origin}/login?error=Could+not+authenticate+with+provider.+Please+try+again.`,
  )
}
