// app/admin/layout.tsx
// Admin panel layout — admin-only gate + sidebar nav.
// Completely separate from the platform and portal layouts.

import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, Users, Wallet, GitMerge, MessageSquare,
} from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin',           label: 'Dashboard',  icon: LayoutDashboard, exact: true  },
  { href: '/admin/pipeline',  label: 'Pipeline',   icon: GitMerge,        exact: false },
  { href: '/admin/add-mentor',label: 'Add Mentor', icon: Users,           exact: false },
  { href: '/admin/payouts',   label: 'Payouts',    icon: Wallet,          exact: false },
  { href: '/admin/requests',  label: 'Requests',   icon: MessageSquare,   exact: false },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 w-56 h-screen sticky top-0"
        style={{
          background:   'rgba(9,15,28,0.97)',
          borderRight:  '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5"
          style={{ borderBottom: '1px solid rgba(26,40,69,0.6)' }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,77,106,0.12)', border: '1px solid rgba(255,77,106,0.3)' }}
          >
            <span className="font-mono font-bold text-xs" style={{ color: '#ff4d6a' }}>A</span>
          </div>
          <div>
            <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
              play<span style={{ color: 'var(--accent)' }}>buuk</span>
            </span>
            <span
              className="block text-2xs font-mono font-bold"
              style={{ color: '#ff4d6a', letterSpacing: '0.05em' }}
            >
              ADMIN
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{ color: 'var(--dim)' }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = 'var(--text)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--dim)'
              }}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" className="flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Back link */}
        <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted transition-all duration-150"
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.color = 'var(--dim)'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.color = 'var(--muted)'
            }}
          >
            ← Platform
          </Link>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
