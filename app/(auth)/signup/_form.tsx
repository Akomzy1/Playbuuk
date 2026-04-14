'use client'

// app/(auth)/signup/_form.tsx
// Client component — signup form with email/password/display name,
// Google OAuth, and automatic profile creation on sign-up.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const signupSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(40, 'Display name must be under 40 characters')
    .regex(/^[a-zA-Z0-9 _'-]+$/, 'Only letters, numbers, spaces, and _ \'  - allowed'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
})

type SignupData = z.infer<typeof signupSchema>

// ─── Password strength indicator ─────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++

  if (score <= 2) return { score, label: 'Weak', color: 'var(--danger)' }
  if (score === 3) return { score, label: 'Fair', color: 'var(--warning)' }
  if (score === 4) return { score, label: 'Good', color: 'var(--cyan)' }
  return { score, label: 'Strong', color: 'var(--accent)' }
}

// ─── Google icon (inline SVG) ─────────────────────────────────────────────────

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

// ─── SignupForm ───────────────────────────────────────────────────────────────

export function SignupForm() {
  const router = useRouter()

  const [fields, setFields] = useState<SignupData>({
    displayName: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignupData, string>>>({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const strength = passwordStrength(fields.password)

  function setField<K extends keyof SignupData>(key: K, value: SignupData[K]) {
    setFields((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError('')

    const result = signupSchema.safeParse(fields)
    if (!result.success) {
      const errors: Partial<Record<keyof SignupData, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SignupData
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setLoading(true)

    try {
      const supabase = createClient()

      // 1. Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          // Pass display_name in auth metadata — Supabase trigger can read this
          data: { display_name: result.data.displayName },
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      })

      if (signUpError) {
        setServerError(
          signUpError.message.includes('already registered')
            ? 'An account with this email already exists. Try signing in instead.'
            : signUpError.message,
        )
        return
      }

      // 2. If session is immediately available (email confirmation off), upsert profile.
      //    If confirmation is required, the profile will be created by the Supabase
      //    trigger on auth.users INSERT when the user confirms their email.
      if (data.session && data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: result.data.displayName,
          role: 'trader',
          tier: 'free',
        })

        router.push('/')
        router.refresh()
        return
      }

      // Email confirmation required — show success state
      setSuccess(true)
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
  }

  const busy = loading || googleLoading

  // ── Email confirmation sent state ──────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(0,229,176,0.09) 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[400px] animate-fade-up">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex flex-col items-center gap-2" aria-label="Playbuuk home">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,229,176,0.12)', border: '1px solid rgba(0,229,176,0.3)' }}
              >
                <span className="font-mono font-bold text-accent text-lg leading-none">P</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-text">
                play<span className="text-accent">buuk</span>
              </span>
            </Link>
          </div>

          <div
            className="rounded-3xl p-8 text-center"
            style={{
              background: 'rgba(9,15,28,0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(26,40,69,0.9)',
              borderTop: '1px solid rgba(0,229,176,0.18)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0,229,176,0.12)', border: '1px solid rgba(0,229,176,0.3)' }}
            >
              <CheckCircle2 className="w-7 h-7 text-accent" />
            </div>
            <h1 className="text-xl font-bold text-text mb-2">Check your inbox</h1>
            <p className="text-sm text-dim leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="font-mono text-text text-xs">{fields.email}</span>.
              Click the link to activate your account.
            </p>
            <p className="text-xs text-muted mt-4">
              No email?{' '}
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="text-accent hover:text-[#00c49a] transition-colors font-medium"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main signup form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(0,229,176,0.09) 0%, transparent 60%)',
        }}
      />
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--purple)' }}
      />

      {/* Content */}
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
            background: 'rgba(9,15,28,0.92)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(26,40,69,0.9)',
            borderTop: '1px solid rgba(0,229,176,0.18)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(0,229,176,0.06)',
          }}
        >
          <h1 className="text-[1.375rem] font-bold text-text mb-1">Create your account</h1>
          <p className="text-sm text-dim mb-6">Join thousands of disciplined traders</p>

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
            {googleLoading ? 'Redirecting to Google…' : 'Sign up with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-2xs font-mono text-muted tracking-wide uppercase">
              or with email
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Server error */}
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

            {/* Display name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-text mb-1.5">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                value={fields.displayName}
                onChange={(e) => setField('displayName', e.target.value)}
                placeholder="How you'll appear to others"
                disabled={busy}
                maxLength={40}
                aria-invalid={!!fieldErrors.displayName}
                aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
                className="input disabled:opacity-50 disabled:cursor-not-allowed"
                style={
                  fieldErrors.displayName
                    ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px rgba(255,77,106,0.25)' }
                    : {}
                }
              />
              {fieldErrors.displayName && (
                <p id="displayName-error" role="alert" className="text-xs mt-1.5 text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={fields.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="you@example.com"
                disabled={busy}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className="input disabled:opacity-50 disabled:cursor-not-allowed"
                style={
                  fieldErrors.email
                    ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px rgba(255,77,106,0.25)' }
                    : {}
                }
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
              <label htmlFor="password" className="block text-sm font-medium text-text mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={fields.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  disabled={busy}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby="password-requirements"
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

              {/* Password strength bar */}
              {fields.password.length > 0 && (
                <div id="password-requirements" className="mt-2 space-y-1.5" aria-live="polite">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background:
                            level <= strength.score ? strength.color : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-2xs font-mono" style={{ color: strength.color }}>
                    {strength.label} password
                  </p>
                </div>
              )}

              {fieldErrors.password && (
                <p id="password-error" role="alert" className="text-xs mt-1.5 text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Terms + risk notice */}
            <div className="space-y-2">
              <p className="text-xs text-muted leading-relaxed">
                By creating an account you agree to our{' '}
                <Link href="/terms" className="text-dim hover:text-accent transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-dim hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
                .
              </p>
              <p className="text-xs leading-relaxed"
                style={{ color: '#3d5078' }}>
                <span className="font-semibold" style={{ color: '#5a6e8a' }}>Risk warning:</span>{' '}
                Playbuuk is a discipline tool, not financial advice. Trading carries substantial
                risk of loss.{' '}
                <Link href="/disclaimer" className="underline underline-offset-2 hover:text-dim transition-colors">
                  Full disclosure
                </Link>
                .
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full h-11 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              onMouseEnter={(e) => {
                if (!busy) e.currentTarget.style.boxShadow = '0 0 28px var(--accent-glow)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0 var(--accent-glow)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-dim mt-5">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-accent hover:text-[#00c49a] transition-colors">
            Sign in
          </Link>
        </p>

        {/* Disclaimer */}
        <p className="text-center font-mono text-2xs mt-4 leading-relaxed" style={{ color: '#2a3d5f' }}>
          Not financial advice. Trading carries substantial risk of loss.{' '}
          <Link href="/disclaimer" className="underline underline-offset-2 hover:text-muted transition-colors">
            Risk disclosure
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
