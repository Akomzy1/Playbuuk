'use client'

// components/layout/profile-modal.tsx
// Centred modal dialog for editing display_name and avatar_url.
// Opened from both the sidebar profile button and the mobile nav profile tab.

import { useState, useEffect, useRef } from 'react'
import {
  X,
  Camera,
  User,
  Check,
  Loader2,
  AlertCircle,
  LogOut,
  Sparkles,
  Shield,
  LayoutDashboard,
} from 'lucide-react'
import { z } from 'zod'
import { useUserStore } from '@/stores/user-store'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const profileSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(40, 'Name must be under 40 characters')
    .regex(/^[a-zA-Z0-9 _'-]+$/, "Only letters, numbers, spaces and _ ' - allowed"),
  avatar_url: z.union([z.string().url('Enter a valid URL'), z.literal('')]).optional(),
})

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

function roleBadgeStyle(role: string) {
  if (role === 'admin')
    return {
      bg: 'rgba(167,139,250,0.12)',
      border: 'rgba(167,139,250,0.3)',
      color: 'var(--purple)',
      icon: Shield,
    }
  if (role === 'mentor')
    return {
      bg: 'rgba(77,142,255,0.12)',
      border: 'rgba(77,142,255,0.3)',
      color: 'var(--info)',
      icon: LayoutDashboard,
    }
  return {
    bg: 'rgba(107,127,163,0.12)',
    border: 'rgba(107,127,163,0.25)',
    color: 'var(--dim)',
    icon: User,
  }
}

// ─── ProfileModal ─────────────────────────────────────────────────────────────

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const profile = useUserStore((s) => s.profile)
  const updateProfile = useUserStore((s) => s.updateProfile)
  const signOut = useUserStore((s) => s.signOut)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const firstInputRef = useRef<HTMLInputElement>(null)

  // Reset form fields whenever the modal opens (picks up latest profile state)
  useEffect(() => {
    if (open) {
      setDisplayName(profile?.display_name ?? '')
      setAvatarUrl(profile?.avatar_url ?? '')
      setFieldErrors({})
      setServerError('')
      setSaved(false)
      // Focus first input after animation settles
      setTimeout(() => firstInputRef.current?.focus(), 80)
    }
  }, [open, profile])

  // Keyboard: close on Escape
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Lock body scroll while modal is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    setServerError('')

    const result = profileSchema.safeParse({ display_name: displayName, avatar_url: avatarUrl })
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0])
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSaving(true)

    const updates: { display_name?: string; avatar_url?: string | null } = {
      display_name: result.data.display_name,
      avatar_url: result.data.avatar_url || null,
    }

    const { error } = await updateProfile(updates)
    setSaving(false)

    if (error) {
      setServerError(error)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleSignOut() {
    onClose()
    await signOut()
  }

  if (!open) return null

  const roleStyle = roleBadgeStyle(profile?.role ?? 'trader')
  const RoleIcon = roleStyle.icon

  const previewInitials = initials(displayName || profile?.display_name || null)
  const previewAvatar = avatarUrl || profile?.avatar_url || null

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profile settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(6px)' }}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-[420px] rounded-3xl overflow-hidden animate-slide-up"
        style={{
          background: 'rgba(11,17,33,0.97)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(26,40,69,0.9)',
          borderTop: '1px solid rgba(0,229,176,0.2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(0,229,176,0.06)',
        }}
      >
        {/* Subtle gradient line across top */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(0,229,176,0.5), transparent)',
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-all duration-150 text-muted hover:text-text hover:bg-card z-10"
          aria-label="Close profile settings"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>

        {/* ── Header: avatar preview + identity ── */}
        <div
          className="px-8 pt-8 pb-6"
          style={{ borderBottom: '1px solid rgba(26,40,69,0.7)' }}
        >
          <h2 className="text-lg font-bold text-text mb-4">Profile settings</h2>

          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              {previewAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewAvatar}
                  alt="Avatar preview"
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-accent/30"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                  style={{
                    background: 'rgba(0,229,176,0.12)',
                    border: '2px solid rgba(0,229,176,0.25)',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {previewInitials}
                </div>
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ background: 'rgba(5,8,16,0.65)' }}
              >
                <Camera size={18} className="text-text" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-text truncate leading-tight">
                {displayName || profile?.display_name || 'Your name'}
              </p>
              <p className="text-sm text-dim truncate mt-0.5">
                {profile?.id ? `${profile.id.slice(0, 8)}…` : '—'}
              </p>

              {/* Badges row */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Role badge */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-semibold"
                  style={{
                    background: roleStyle.bg,
                    border: `1px solid ${roleStyle.border}`,
                    color: roleStyle.color,
                  }}
                >
                  <RoleIcon size={10} strokeWidth={2.5} aria-hidden="true" />
                  {profile?.role ?? 'trader'}
                </span>

                {/* Pro badge */}
                {profile?.tier === 'pro' && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-bold"
                    style={{
                      background: 'rgba(251,191,36,0.12)',
                      border: '1px solid rgba(251,191,36,0.3)',
                      color: 'var(--gold)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <Sparkles size={10} strokeWidth={2.5} aria-hidden="true" />
                    PRO
                  </span>
                )}

                {/* Free upgrade CTA */}
                {profile?.tier === 'free' && (
                  <a
                    href="/upgrade"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-semibold transition-all duration-150 hover:scale-105"
                    style={{
                      background: 'rgba(0,229,176,0.08)',
                      border: '1px solid rgba(0,229,176,0.2)',
                      color: 'var(--accent)',
                    }}
                    onClick={onClose}
                  >
                    <Sparkles size={10} strokeWidth={2.5} aria-hidden="true" />
                    Upgrade to Pro
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Edit form ── */}
        <form onSubmit={handleSave} className="px-8 py-6 space-y-4" noValidate>

          {/* Server error */}
          {serverError && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-xl animate-fade-in"
              role="alert"
              style={{
                background: 'rgba(255,77,106,0.08)',
                border: '1px solid rgba(255,77,106,0.25)',
              }}
            >
              <AlertCircle size={14} className="flex-shrink-0 mt-px text-danger" aria-hidden="true" />
              <p className="text-xs text-danger">{serverError}</p>
            </div>
          )}

          {/* Display name */}
          <div>
            <label htmlFor="modal-display-name" className="block text-sm font-medium text-text mb-1.5">
              Display name
            </label>
            <input
              id="modal-display-name"
              ref={firstInputRef}
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                if (fieldErrors.display_name) {
                  setFieldErrors((p) => { const n = { ...p }; delete n.display_name; return n })
                }
              }}
              placeholder="How you appear to others"
              maxLength={40}
              disabled={saving}
              autoComplete="name"
              aria-invalid={!!fieldErrors.display_name}
              aria-describedby={fieldErrors.display_name ? 'modal-name-error' : undefined}
              className="input disabled:opacity-50"
              style={
                fieldErrors.display_name
                  ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px rgba(255,77,106,0.25)' }
                  : {}
              }
            />
            {fieldErrors.display_name && (
              <p id="modal-name-error" role="alert" className="text-xs mt-1.5 text-danger flex items-center gap-1">
                <AlertCircle size={11} aria-hidden="true" />
                {fieldErrors.display_name}
              </p>
            )}
          </div>

          {/* Avatar URL */}
          <div>
            <label htmlFor="modal-avatar-url" className="block text-sm font-medium text-text mb-1.5">
              Avatar URL
              <span className="ml-1.5 text-2xs text-muted font-normal">optional</span>
            </label>
            <input
              id="modal-avatar-url"
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value)
                if (fieldErrors.avatar_url) {
                  setFieldErrors((p) => { const n = { ...p }; delete n.avatar_url; return n })
                }
              }}
              placeholder="https://example.com/avatar.jpg"
              disabled={saving}
              autoComplete="off"
              aria-invalid={!!fieldErrors.avatar_url}
              aria-describedby={fieldErrors.avatar_url ? 'modal-avatar-error' : 'modal-avatar-hint'}
              className="input disabled:opacity-50"
              style={
                fieldErrors.avatar_url
                  ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px rgba(255,77,106,0.25)' }
                  : {}
              }
            />
            {fieldErrors.avatar_url ? (
              <p id="modal-avatar-error" role="alert" className="text-xs mt-1.5 text-danger flex items-center gap-1">
                <AlertCircle size={11} aria-hidden="true" />
                {fieldErrors.avatar_url}
              </p>
            ) : (
              <p id="modal-avatar-hint" className="text-xs mt-1.5 text-muted">
                Link to a publicly accessible image. Leave blank to use initials.
              </p>
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary h-10 text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
              style={{ boxShadow: 'none' }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.boxShadow = '0 0 24px var(--accent-glow)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  Saved
                </>
              ) : (
                'Save changes'
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-ghost h-10 text-sm px-4"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* ── Footer: sign out ── */}
        <div
          className="px-8 pb-6 pt-2"
          style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
        >
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150 text-muted hover:text-danger"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,77,106,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={14} strokeWidth={2} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
