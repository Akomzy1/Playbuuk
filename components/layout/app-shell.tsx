'use client'

// components/layout/app-shell.tsx
// Client-side shell for all authenticated platform routes.
//
// Responsibilities:
//   1. Seed the Zustand user store from the server-fetched profile (no loading flash)
//   2. Subscribe to Supabase auth events (sign-out redirect, session refresh)
//   3. Render the desktop sidebar + mobile bottom nav alongside page content

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner'
import { AlertBannerStack } from '@/components/alerts/alert-banner'
import { useUserStore, type UserProfile } from '@/stores/user-store'
import { createClient } from '@/lib/supabase/client'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppShellProps {
  /** Profile row pre-fetched by the server layout — avoids an extra round-trip */
  initialProfile: UserProfile | null
  children: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppShell({ initialProfile, children }: AppShellProps) {
  const router = useRouter()
  const setProfile = useUserStore((s) => s.setProfile)
  const seeded = useRef(false)

  // Seed the store exactly once with the SSR-fetched profile.
  // Using a ref guard prevents re-seeding on hot reload in development.
  if (!seeded.current) {
    useUserStore.setState({ profile: initialProfile, loading: false })
    seeded.current = true
  }

  // Subscribe to Supabase auth state changes for real-time session handling.
  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, setProfile])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ── Desktop sidebar (hidden below lg breakpoint) ── */}
      <AppSidebar />

      {/* ── Main content area ── */}
      <div
        className="flex flex-col flex-1 min-w-0"
        // On mobile: add bottom padding for the fixed tab bar
        style={{ paddingBottom: 'var(--mobile-nav-height, 0)' }}
      >
        <main className="flex-1 min-h-0">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar (visible below lg breakpoint) ── */}
      <MobileNav />

      {/* ── In-app setup alert banners (top-right stack) ── */}
      <AlertBannerStack />

      {/* ── Persistent risk disclaimer banner ── */}
      <DisclaimerBanner />
    </div>
  )
}
