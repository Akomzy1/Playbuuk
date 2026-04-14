'use client'

// components/layout/mobile-nav.tsx
// Fixed bottom tab bar — visible below the `lg` breakpoint.
// Shows 5 primary routes. Overflow items accessible via a "More" sheet or
// the profile button which opens the profile modal.

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Heart,
  BookOpen,
  ScanLine,
  User,
  Sparkles,
} from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { ProfileModal } from '@/components/layout/profile-modal'

// ─── Tab items ────────────────────────────────────────────────────────────────

interface TabItem {
  href: string
  label: string
  icon: React.ElementType
}

const TABS: TabItem[] = [
  { href: '/',         label: 'Market',  icon: LayoutGrid },
  { href: '/mentors',  label: 'Mentors', icon: Heart },
  { href: '/scanner',  label: 'Scanner', icon: ScanLine },
  { href: '/journal',  label: 'Journal', icon: BookOpen },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname()
  const profile = useUserStore((s) => s.profile)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      {/* Spacer — prevents content from being hidden behind the fixed nav */}
      <style>{`
        @media (max-width: 1023px) {
          :root { --mobile-nav-height: 64px; }
        }
      `}</style>

      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center"
        style={{
          height: 64,
          background: 'rgba(9,15,28,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(26,40,69,0.9)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Accent top-line */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(0,229,176,0.35), transparent)',
          }}
        />

        <div className="flex w-full items-center justify-around px-2">
          {/* Primary route tabs */}
          {TABS.map((tab) => {
            const isActive =
              tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{ color: isActive ? 'var(--accent)' : 'var(--muted)' }}
              >
                {/* Active pill indicator */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}

                <tab.icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  aria-hidden="true"
                  className="transition-transform duration-150"
                  style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
                />
                <span
                  className="text-2xs font-medium leading-none transition-all duration-150"
                  style={{
                    opacity: isActive ? 1 : 0.7,
                    fontFamily: isActive ? 'var(--font-display)' : undefined,
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}

          {/* Profile tab */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Open profile"
            className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style={{ color: 'var(--muted)' }}
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? 'Profile'}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <User size={20} strokeWidth={1.8} aria-hidden="true" />
            )}
            <span className="text-2xs font-medium leading-none opacity-70">
              {profile?.tier === 'pro' ? (
                <span className="inline-flex items-center gap-0.5" style={{ color: 'var(--gold)' }}>
                  <Sparkles size={8} aria-hidden="true" />
                  Pro
                </span>
              ) : (
                'Profile'
              )}
            </span>
          </button>
        </div>
      </nav>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
