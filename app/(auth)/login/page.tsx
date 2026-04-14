// app/(auth)/login/page.tsx
// Server Component — exports SEO metadata and renders the login form.
// Form state and Supabase auth calls live in _form.tsx (client component).

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './_form'

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Login',
  description:
    'Sign in to Playbuuk — the trading psychology and discipline platform. Access your mentor playbooks, live setup grading, and trade execution tools.',
  keywords: [
    'playbuuk login',
    'trading discipline app login',
    'trading psychology platform signin',
    'trading checklist app',
    'forex trading discipline',
  ],
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Login — Playbuuk | Trading Discipline Platform',
    description:
      'Sign in to access your mentor playbooks, auto-detecting checklists, and psychology-gated trade execution.',
    url: '/login',
  },
  // Auth pages should not be indexed (no public value)
  robots: {
    index: false,
    follow: false,
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    // Suspense is required by Next.js when a client child reads useSearchParams()
    <Suspense fallback={<AuthPageSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function AuthPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Wordmark placeholder */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div className="h-7 w-32 rounded-lg skeleton" />
          <div className="h-3 w-48 rounded skeleton" />
        </div>
        {/* Card placeholder */}
        <div
          className="rounded-3xl p-8 space-y-4"
          style={{
            background: 'rgba(9,15,28,0.92)',
            border: '1px solid rgba(26,40,69,0.9)',
          }}
        >
          <div className="h-6 w-40 rounded skeleton" />
          <div className="h-4 w-56 rounded skeleton" />
          <div className="h-11 w-full rounded-xl skeleton mt-2" />
          <div className="h-px w-full skeleton" />
          <div className="h-11 w-full rounded-xl skeleton" />
          <div className="h-11 w-full rounded-xl skeleton" />
          <div className="h-11 w-full rounded-xl skeleton" />
        </div>
      </div>
    </div>
  )
}
