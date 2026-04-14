'use client'

// app/(auth)/login/_form.tsx
// Client component — owns all form state and Supabase auth calls.
// Rendered by the server component page.tsx which exports metadata.

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ─── Google icon (inline SVG — no extra dep) ──────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ─── LoginForm ────────────────────────────────────────────────────────────────

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Surface ?error= param from OAuth callback redirect
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) setServerError(decodeURIComponent(urlError))
  }, [searchParams])

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError('')

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0])
        errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      })

      if (error) {
        setServerError(
          error.message === 'Invalid login credentials'
            ? 'Incorrect email or password. Please try again.'
            : error.message,
        )
        return
      }

      router.push('/')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setServerError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    })
    if (error) {
      setServerError(error.message)
      setGoogleLoading(false)
    }
    // On success the page redirects — no need to reset state
  }

  const busy = loading || googleLoading

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* ── Ambient background ───────────────────────────────────────────── */}
      {/* Top radial glow — accent from centre-top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(0,229,176,0.09) 0%, transparent 60%)',
        }}
      />
      {/* Subtle dot grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(26,40,69,0.7) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%)',
        }}
      />
      {/* Ambient orb — bottom right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--info)' }}
      />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[400px] animate-fade-up">

        {/* Wordmark */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group" aria-label="Playbuuk home">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
              style={{
                background: 'rgba(0,229,176,0.12)',
                border: '1px solid rgba(0,229,176,0.3)',
                boxShadow: '0 0 20px rgba(0,229,176,0.15)',
              }}
            >
              <span className="font-mono font-bold text-accent text-lg leading-none">P</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-text">
              play<span className="text-accent">buuk</span>
            </span>
          </Link>
          <p className="font-mono text-xs text-muted mt-2 tracking-wide">
            Trade the plan, not the emotion.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'rgba(9, 15, 28, 0.92)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(26,40,69,0.9)',
            borderTop: '1px solid rgba(0,229,176,0.18)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(0,229,176,0.06)',
          }}
        >
          <h1 className="text-[1.375rem] font-bold text-text mb-1">Welcome back</h1>
          <p className="text-sm text-dim mb-6">Sign in to continue to your playbooks</p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: 'var(--text)',
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
            }}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-dim" />
            ) : (
              <GoogleIcon className="w-4 h-4 flex-shrink-0" />
            )}
            {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-2xs font-mono text-muted tracking-wide uppercase">
              or email
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Server error banner */}
          {serverError && (
            <div
              className="flex items-start gap-2.5 p-3.5 rounded-xl mb-4 animate-fade-in"
              role="alert"
              aria-live="polite"
              style={{
                background: 'rgba(255,77,106,0.08)',
                border: '1px solid rgba(255,77,106,0.25)',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px text-danger" aria-hidden="true" />
              <p className="text-xs text-danger leading-relaxed">{serverError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearFieldError('email')
                }}
                placeholder="you@example.com"
                disabled={busy}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className="input disabled:opacity-50 disabled:cursor-not-allowed"
                style={fieldErrors.email ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px rgba(255,77,106,0.25)' } : {}}
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs mt-1.5 text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-text">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-dim hover:text-accent transition-colors"
                  tabIndex={busy ? -1 : undefined}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearFieldError('password')
                  }}
                  placeholder="••••••••"
                  disabled={busy}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className="input pr-11 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    fieldErrors.password
                      ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px rgba(255,77,106,0.25)' }
                      : {}
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={busy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors text-muted hover:text-dim disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" role="alert" className="text-xs mt-1.5 text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full mt-1 h-11 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={
                !busy
                  ? { boxShadow: '0 0 0 0 var(--accent-glow)' }
                  : {}
              }
              onMouseEnter={(e) => {
                if (!busy)
                  e.currentTarget.style.boxShadow = '0 0 28px var(--accent-glow)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0 var(--accent-glow)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sign-up link */}
        <p className="text-center text-sm text-dim mt-5">
          New to Playbuuk?{' '}
          <Link href="/signup" className="font-semibold text-accent hover:text-[#00c49a] transition-colors">
            Create an account
          </Link>
        </p>

        {/* Legal disclaimer */}
        <p className="text-center font-mono text-2xs text-muted mt-4 leading-relaxed">
          Not financial advice. Trading carries substantial risk.
        </p>
      </div>
    </div>
  )
}
