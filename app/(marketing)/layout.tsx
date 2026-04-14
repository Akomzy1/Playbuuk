// app/(marketing)/layout.tsx
// Layout for all public marketing / legal pages.
// No auth required. Full landing-page nav with Sign In + Start Free CTAs.
// Server Component — hover states are CSS-only (no event handlers).

import Link from 'next/link'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
        style={{
          background:    'rgba(5,8,16,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom:  '1px solid rgba(26,40,69,0.7)',
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">

          {/* Wordmark */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 group flex-shrink-0"
            aria-label="Playbuuk home"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
              style={{
                background: 'rgba(0,229,176,0.12)',
                border: '1px solid rgba(0,229,176,0.3)',
                boxShadow: '0 0 14px rgba(0,229,176,0.12)',
              }}
            >
              <span className="font-mono font-bold text-accent text-sm leading-none">P</span>
            </div>
            <span className="font-bold text-text tracking-tight hidden sm:block">
              play<span className="text-accent">buuk</span>
            </span>
          </Link>

          {/* Centre nav */}
          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Main navigation"
          >
            {[
              { href: '/home#features',  label: 'Features' },
              { href: '/home#pricing',   label: 'Pricing'  },
              { href: '/home#faq',       label: 'FAQ'       },
              { href: '/disclaimer',     label: 'Risk'      },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-medium transition-colors hover:text-text"
                style={{ color: '#6b7fa3' }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-2 rounded-xl transition-colors hover:text-text"
              style={{ color: '#6b7fa3' }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:brightness-110"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                boxShadow: '0 0 16px rgba(0,229,176,0.25)',
              }}
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="flex-1" id="main-content">
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-10"
        style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-8">
            {/* Brand */}
            <div>
              <Link href="/" className="inline-flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.25)' }}
                >
                  <span className="font-mono font-bold text-accent text-sm leading-none">P</span>
                </div>
                <span className="font-bold text-text">play<span className="text-accent">buuk</span></span>
              </Link>
              <p className="text-xs font-mono mt-1" style={{ color: '#3d5078' }}>
                Trade the plan, not the emotion.
              </p>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap gap-x-6 gap-y-2 justify-center" aria-label="Footer navigation">
              {[
                { href: '/home',       label: 'Home'       },
                { href: '/signup',     label: 'Sign Up'    },
                { href: '/terms',      label: 'Terms'      },
                { href: '/privacy',    label: 'Privacy'    },
                { href: '/disclaimer', label: 'Risk Disclosure' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-xs font-mono transition-colors hover:text-dim"
                  style={{ color: '#3d5078' }}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Bottom row */}
          <div
            className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-2xs font-mono"
            style={{ borderTop: '1px solid rgba(26,40,69,0.5)', color: '#2a3d5f' }}
          >
            <p>© {new Date().getFullYear()} Playbuuk · AkomzyAi Consulting. All rights reserved.</p>
            <p style={{ color: '#2a3d5f' }}>
              Not financial advice. Trading carries substantial risk of loss.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
