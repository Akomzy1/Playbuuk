'use client'

// components/portal/portal-shell.tsx
// Client shell for the mentor portal — owns sidebar collapse state.
// Separate from AppShell; the portal has its own nav that doesn't appear
// in the main platform.
//
// Sidebar layout:
//   ← Back to Playbuuk
//   ─────────────────────
//   [emoji]  Display Name  ✓
//   @handle
//   ─────────────────────
//   Dashboard
//   My Playbook
//   Settings

import { useState }      from 'react'
import Link              from 'next/link'
import { usePathname }   from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Settings2,
  PanelLeftClose, PanelLeftOpen,
  ArrowLeft, ShieldCheck,
  ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalShellProps {
  mentorName:   string
  mentorHandle: string
  mentorEmoji:  string
  isVerified:   boolean
  children:     React.ReactNode
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const PORTAL_NAV = [
  { href: '/portal',          label: 'Dashboard',   icon: LayoutDashboard, exact: true },
  { href: '/portal/playbook', label: 'My Playbook', icon: BookOpen,        exact: false },
  { href: '/portal/settings', label: 'Settings',    icon: Settings2,       exact: false },
]

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  href, label, icon: Icon, exact, collapsed,
}: {
  href: string; label: string; icon: React.ElementType
  exact: boolean; collapsed: boolean
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 outline-none focus-visible:ring-2"
      style={{
        background: isActive ? 'rgba(0,229,176,0.1)' : 'transparent',
        color:      isActive ? 'var(--accent)'        : 'var(--dim)',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = 'var(--text)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--dim)'
        }
      }}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: 'var(--accent)' }}
        />
      )}
      <Icon
        size={18}
        strokeWidth={isActive ? 2.2 : 1.8}
        className="flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
        aria-hidden="true"
      />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
      {collapsed && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
          style={{
            background: 'var(--card)',
            border:     '1px solid var(--border)',
            color:      'var(--text)',
          }}
        >
          {label}
        </span>
      )}
    </Link>
  )
}

// ─── MobilePortalNav ──────────────────────────────────────────────────────────
// Extracted so usePathname() is called at top level of a component, not in map()

function MobilePortalNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Portal mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2"
      style={{
        background:      'rgba(9,15,28,0.97)',
        backdropFilter:  'blur(20px)',
        borderTop:       '1px solid var(--border)',
      }}
    >
      {PORTAL_NAV.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-150"
            style={{ color: isActive ? 'var(--accent)' : 'var(--muted)' }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
            <span className="text-2xs font-medium">{label}</span>
          </Link>
        )
      })}
      <Link
        href="/"
        className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={20} strokeWidth={1.8} aria-hidden="true" />
        <span className="text-2xs font-medium">Back</span>
      </Link>
    </nav>
  )
}

// ─── PortalShell ──────────────────────────────────────────────────────────────

export function PortalShell({
  mentorName, mentorHandle, mentorEmoji, isVerified, children,
}: PortalShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const width = collapsed ? 72 : 240

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Portal sidebar ─────────────────────────────────────────────────── */}
      <aside
        aria-label="Mentor portal navigation"
        className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 overflow-hidden transition-all duration-200"
        style={{
          width,
          background:       'rgba(9,15,28,0.97)',
          backdropFilter:   'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight:      '1px solid var(--border)',
        }}
      >

        {/* ── Top: logo + collapse ─────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(26,40,69,0.6)', minHeight: 64 }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(0,229,176,0.12)',
              border:     '1px solid rgba(0,229,176,0.28)',
              boxShadow:  '0 0 16px rgba(0,229,176,0.12)',
            }}
          >
            <span className="font-mono font-bold text-accent" style={{ fontSize: 14 }}>P</span>
          </div>
          {!collapsed && (
            <span className="text-[1.0625rem] font-bold tracking-tight text-text leading-none">
              play<span style={{ color: 'var(--accent)' }}>buuk</span>
              <span
                className="ml-1.5 text-2xs font-mono font-normal px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(0,229,176,0.08)',
                  border:     '1px solid rgba(0,229,176,0.2)',
                  color:      'var(--accent)',
                  verticalAlign: 'middle',
                }}
              >
                PORTAL
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(v => !v)}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-150 text-muted hover:text-text ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen  size={16} strokeWidth={1.8} aria-hidden="true" />
              : <PanelLeftClose size={16} strokeWidth={1.8} aria-hidden="true" />}
          </button>
        </div>

        {/* ── Mentor identity block ─────────────────────────────────────────── */}
        <div
          className="px-4 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(26,40,69,0.6)' }}
        >
          {!collapsed ? (
            <div className="flex flex-col gap-2">
              {/* Avatar emoji + verified */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: 'rgba(0,229,176,0.06)',
                    border:     '1px solid rgba(0,229,176,0.15)',
                  }}
                  aria-hidden="true"
                >
                  {mentorEmoji}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-sm font-bold text-text truncate"
                      style={{ letterSpacing: '-0.01em' }}
                    >
                      {mentorName}
                    </span>
                    {isVerified && (
                      <ShieldCheck
                        size={14}
                        className="flex-shrink-0"
                        style={{ color: 'var(--accent)' }}
                        aria-label="Verified mentor"
                      />
                    )}
                  </div>
                  <span className="text-2xs font-mono text-muted block">@{mentorHandle}</span>
                </div>
              </div>

              {/* Verified / Draft status pill */}
              <div className="flex items-center gap-1.5">
                <span
                  className="text-2xs font-mono font-bold px-2 py-0.5 rounded"
                  style={isVerified ? {
                    background: 'rgba(0,229,176,0.08)',
                    border:     '1px solid rgba(0,229,176,0.2)',
                    color:      'var(--accent)',
                  } : {
                    background: 'rgba(251,191,36,0.08)',
                    border:     '1px solid rgba(251,191,36,0.2)',
                    color:      'var(--gold)',
                  }}
                >
                  {isVerified ? '✓ Verified' : 'Draft'}
                </span>
                <span className="text-2xs font-mono text-muted">Mentor</span>
              </div>
            </div>
          ) : (
            /* Collapsed: just emoji */
            <div className="flex justify-center">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{
                  background: 'rgba(0,229,176,0.06)',
                  border:     '1px solid rgba(0,229,176,0.15)',
                }}
                title={mentorName}
                aria-label={`${mentorName} — mentor portal`}
              >
                {mentorEmoji}
              </div>
            </div>
          )}
        </div>

        {/* ── Portal nav ───────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {PORTAL_NAV.map(item => (
            <NavLink key={item.href} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* ── Bottom: back to platform ─────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-2 py-3"
          style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
        >
          <Link
            href="/"
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-muted hover:text-text"
            title={collapsed ? 'Back to Playbuuk' : undefined}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = 'var(--dim)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--muted)'
            }}
            style={{ color: 'var(--muted)' }}
          >
            <ArrowLeft
              size={16}
              strokeWidth={1.8}
              className="flex-shrink-0 group-hover:-translate-x-0.5 transition-transform duration-150"
              aria-hidden="true"
            />
            {!collapsed && (
              <span className="text-sm font-medium">Back to Playbuuk</span>
            )}
            {collapsed && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
                style={{
                  background: 'var(--card)',
                  border:     '1px solid var(--border)',
                  color:      'var(--text)',
                }}
              >
                Back to Playbuuk
              </span>
            )}
          </Link>
        </div>
      </aside>

      {/* ── Mobile header ─────────────────────────────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background:    'rgba(9,15,28,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom:  '1px solid var(--border)',
          height:        56,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold text-text">
            play<span style={{ color: 'var(--accent)' }}>buuk</span>
          </span>
          <span
            className="text-2xs font-mono px-1.5 py-0.5 rounded"
            style={{
              background: 'rgba(0,229,176,0.08)',
              border:     '1px solid rgba(0,229,176,0.2)',
              color:      'var(--accent)',
            }}
          >
            PORTAL
          </span>
        </div>
        <span className="text-lg">{mentorEmoji}</span>
      </div>

      {/* ── Mobile nav strip ──────────────────────────────────────────────── */}
      <MobilePortalNav />

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ paddingTop: 'clamp(56px, 0px, 0px)' }}
      >
        <main className="flex-1 min-h-0 lg:pt-0 pt-14 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
