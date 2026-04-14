'use client'

// components/layout/app-sidebar.tsx
// Desktop left sidebar — collapsible, role-aware, premium feel.
// Hidden below the `lg` breakpoint (mobile uses MobileNav instead).

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Heart,
  ScanLine,
  BookOpen,
  Link2,
  Users,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { ProfileModal } from '@/components/layout/profile-modal'

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  /** Highlight colour class override (defaults to accent) */
  color?: string
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/',          label: 'Marketplace',  icon: LayoutGrid },
  { href: '/mentors',   label: 'My Mentors',   icon: Heart },
  { href: '/scanner',   label: 'Scanner',      icon: ScanLine },
  { href: '/journal',   label: 'Journal',      icon: BookOpen },
  { href: '/accounts',  label: 'Accounts',     icon: Link2 },
  { href: '/requests',  label: 'Requests',     icon: Users },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')
}

// ─── NavLink ─────────────────────────────────────────────────────────────────

function NavLink({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive =
    item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{
        background: isActive ? 'rgba(0,229,176,0.1)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--dim)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = 'var(--text)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--dim)'
        }
      }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: 'var(--accent)' }}
        />
      )}

      <item.icon
        className="flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
        size={18}
        strokeWidth={isActive ? 2.2 : 1.8}
        aria-hidden="true"
      />

      {!collapsed && (
        <span className="text-sm font-medium leading-none truncate transition-opacity duration-150">
          {item.label}
        </span>
      )}

      {/* Tooltip when collapsed */}
      {collapsed && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          {item.label}
        </span>
      )}
    </Link>
  )
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profile = useUserStore((s) => s.profile)
  const signOut = useUserStore((s) => s.signOut)
  const pathname = usePathname()

  const width = collapsed ? 72 : 240

  return (
    <>
      <aside
        aria-label="Main navigation"
        className="hidden lg:flex flex-col flex-shrink-0 relative h-screen sticky top-0 overflow-hidden transition-all duration-200"
        style={{
          width,
          background: 'rgba(9,15,28,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* ── Top: wordmark + collapse toggle ── */}
        <div
          className="flex items-center gap-3 px-4 py-5 flex-shrink-0"
          style={{
            borderBottom: '1px solid rgba(26,40,69,0.6)',
            minHeight: 64,
          }}
        >
          {/* Logo mark */}
          <Link
            href="/"
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 hover:scale-105"
            aria-label="Playbuuk home"
            style={{
              background: 'rgba(0,229,176,0.12)',
              border: '1px solid rgba(0,229,176,0.28)',
              boxShadow: '0 0 16px rgba(0,229,176,0.12)',
            }}
          >
            <span
              className="font-mono font-bold text-accent leading-none"
              style={{ fontSize: 14 }}
            >
              P
            </span>
          </Link>

          {!collapsed && (
            <Link
              href="/"
              className="text-[1.0625rem] font-bold tracking-tight text-text leading-none hover:text-accent transition-colors"
            >
              play<span className="text-accent">buuk</span>
            </Link>
          )}

          {/* Collapse toggle — push to far right when expanded */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-150 text-muted hover:text-text hover:bg-card ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ── Primary nav ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}

          {/* Role-gated nav items */}
          {(profile?.role === 'mentor' || profile?.role === 'admin') && (
            <>
              {/* Subtle divider */}
              <div
                className="mx-3 my-2"
                style={{ height: 1, background: 'var(--border)' }}
                role="separator"
                aria-orientation="horizontal"
              />
              <NavLink
                item={{ href: '/portal', label: 'Mentor Portal', icon: LayoutDashboard }}
                collapsed={collapsed}
              />
            </>
          )}

          {profile?.role === 'admin' && (
            <NavLink
              item={{ href: '/admin', label: 'Admin', icon: ShieldCheck }}
              collapsed={collapsed}
            />
          )}
        </nav>

        {/* ── Bottom: user profile + settings ── */}
        <div
          className="flex-shrink-0 px-2 py-3 space-y-1"
          style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
        >
          {/* Settings link */}
          <NavLink
            item={{ href: '/settings', label: 'Settings', icon: Settings2 }}
            collapsed={collapsed}
          />

          {/* Profile row — opens edit modal */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style={{ color: 'var(--dim)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--dim)'
            }}
            title={collapsed ? (profile?.display_name ?? 'Profile') : undefined}
            aria-label="Open profile settings"
          >
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? 'Avatar'}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: 'rgba(0,229,176,0.15)',
                    border: '1px solid rgba(0,229,176,0.25)',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {initials(profile?.display_name ?? null)}
                </div>
              )}

              {/* Online indicator dot */}
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{
                  background: 'var(--accent)',
                  borderColor: 'rgb(9,15,28)',
                }}
              />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-text truncate leading-none">
                    {profile?.display_name ?? 'Set up profile'}
                  </span>
                  {/* Pro badge */}
                  {profile?.tier === 'pro' && (
                    <span
                      className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-2xs font-bold leading-none"
                      style={{
                        background: 'rgba(251,191,36,0.15)',
                        border: '1px solid rgba(251,191,36,0.3)',
                        color: 'var(--gold)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <Sparkles size={9} strokeWidth={2.5} aria-hidden="true" />
                      PRO
                    </span>
                  )}
                </div>
                <span className="text-2xs text-muted capitalize leading-none mt-0.5 block">
                  {profile?.role ?? 'trader'}
                </span>
              </div>
            )}

            {!collapsed && (
              <ChevronRight
                size={14}
                strokeWidth={1.8}
                className="flex-shrink-0 opacity-40 group-hover:opacity-70 transition-opacity"
                aria-hidden="true"
              />
            )}
          </button>

          {/* Sign out — only show when expanded */}
          {!collapsed && (
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 text-muted hover:text-danger"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,77,106,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Profile edit modal */}
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
