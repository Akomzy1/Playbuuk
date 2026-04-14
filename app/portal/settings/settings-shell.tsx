'use client'

// app/portal/settings/settings-shell.tsx
// Client shell for the mentor profile settings page.
// Sections:
//   1. Identity — emoji, display name, handle (read-only), bio
//   2. Trading profile — markets, trading style
//   3. Public page — signature / tagline, contact info
//   4. Stripe Connect — payout status + connect/dashboard button
//
// Note: preferred_pairs and session_preference live on the Playbook model
// and are edited in the Playbook Editor (/portal/playbook).

import { useState, useTransition, useId } from 'react'
import {
  Save, Loader2, CheckCircle2, AlertCircle,
  User, TrendingUp, Globe, CreditCard,
  ChevronDown, X,
} from 'lucide-react'
import { ConnectStripeButton } from '@/components/portal/connect-stripe-button'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SettingsMentorProps {
  id:                string
  display_name:      string
  handle:            string
  bio:               string
  avatar_emoji:      string
  markets:           string[]
  style:             string
  signature:         string
  contact_info:      string
  stripe_connect_id: string | null
  onboarding_status: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKET_OPTIONS = [
  'Forex', 'Crypto', 'Indices', 'Commodities', 'Stocks', 'Options', 'Futures',
]

const STYLE_OPTIONS = [
  'Scalping', 'Day Trading', 'Swing Trading', 'Position Trading',
  'News Trading', 'Price Action', 'SMC / ICT', 'Smart Money',
  'Fundamentals', 'Algo / Systems',
]

const EMOJI_OPTIONS = [
  '🎯','📈','📊','💹','🔥','⚡','🦁','🐺','🦅','🧠',
  '💎','🏆','🎪','🌊','🚀','💰','📉','🎓','⚔️','🛡️',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: 'rgba(0,229,176,0.08)',
          border:     '1px solid rgba(0,229,176,0.2)',
        }}
      >
        <Icon size={16} style={{ color: 'var(--accent)' }} aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
          {title}
        </h2>
        <p className="text-xs text-dim mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold mb-1.5"
      style={{ color: 'var(--dim)' }}
    >
      {children}
    </label>
  )
}

function TextInput({
  id, value, onChange, placeholder, maxLength, readOnly,
}: {
  id?: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  maxLength?: number
  readOnly?: boolean
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      readOnly={readOnly}
      className="w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-150 outline-none"
      style={{
        background:  readOnly ? 'rgba(255,255,255,0.02)' : 'var(--card)',
        border:      readOnly ? '1px solid rgba(26,40,69,0.5)' : '1px solid var(--border)',
        color:       readOnly ? 'var(--muted)' : 'var(--text)',
        fontFamily:  'inherit',
        cursor:      readOnly ? 'not-allowed' : undefined,
      }}
      onFocus={e => {
        if (!readOnly) e.currentTarget.style.border = '1px solid rgba(0,229,176,0.4)'
      }}
      onBlur={e => {
        if (!readOnly) e.currentTarget.style.border = '1px solid var(--border)'
      }}
    />
  )
}

function TextArea({
  id, value, onChange, placeholder, rows = 4, maxLength,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
}) {
  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-150 outline-none resize-none"
        style={{
          background: 'var(--card)',
          border:     '1px solid var(--border)',
          color:      'var(--text)',
          fontFamily: 'inherit',
          lineHeight: '1.6',
        }}
        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(0,229,176,0.4)' }}
        onBlur={e => { e.currentTarget.style.border = '1px solid var(--border)' }}
      />
      {maxLength && (
        <span
          className="absolute bottom-2.5 right-3 text-2xs font-mono pointer-events-none"
          style={{ color: value.length > maxLength * 0.9 ? 'var(--gold)' : 'var(--muted)' }}
          aria-hidden="true"
        >
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  )
}

function TagPicker({
  label,
  options,
  selected,
  onToggle,
  accentColor = 'accent',
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  accentColor?: 'accent' | 'blue'
}) {
  const activeStyle = accentColor === 'blue' ? {
    background: 'rgba(77,142,255,0.12)',
    border:     '1px solid rgba(77,142,255,0.35)',
    color:      'var(--blue)',
  } : {
    background: 'rgba(0,229,176,0.12)',
    border:     '1px solid rgba(0,229,176,0.35)',
    color:      'var(--accent)',
  }

  const hoverBorder = accentColor === 'blue'
    ? 'rgba(77,142,255,0.2)'
    : 'rgba(0,229,176,0.25)'

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map(opt => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              aria-pressed={active}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all duration-150"
              style={active ? activeStyle : {
                background: 'var(--card)',
                border:     '1px solid var(--border)',
                color:      'var(--dim)',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.borderColor = hoverBorder
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EmojiPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <FieldLabel>Avatar Emoji</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150"
        style={{
          background: 'var(--card)',
          border:     '1px solid var(--border)',
          minWidth:   120,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,176,0.3)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <span className="text-2xl leading-none">{value}</span>
        <span className="text-xs text-dim flex-1 text-left">Change emoji</span>
        <ChevronDown
          size={14}
          className="transition-transform duration-150"
          style={{
            color:     'var(--muted)',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute left-0 top-full mt-1.5 p-3 rounded-2xl z-20 grid grid-cols-7 gap-1.5"
            style={{
              background: 'var(--surface)',
              border:     '1px solid var(--border)',
              boxShadow:  '0 12px 40px rgba(0,0,0,0.5)',
              minWidth:   240,
            }}
            role="listbox"
            aria-label="Select avatar emoji"
          >
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                role="option"
                aria-selected={emoji === value}
                onClick={() => { onChange(emoji); setOpen(false) }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all duration-150"
                style={emoji === value ? {
                  background: 'rgba(0,229,176,0.12)',
                  border:     '1px solid rgba(0,229,176,0.3)',
                } : {
                  background: 'transparent',
                  border:     '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (emoji !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={e => {
                  if (emoji !== value) e.currentTarget.style.background = 'transparent'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── SaveBar ──────────────────────────────────────────────────────────────────

function SaveBar({
  dirty,
  saving,
  saved,
  error,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  saving: boolean
  saved: boolean
  error: string
  onSave: () => void
  onDiscard: () => void
}) {
  if (!dirty && !saved && !error) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 py-3"
      style={{
        background:    'rgba(5,8,16,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop:     '1px solid var(--border)',
        boxShadow:     '0 -8px 32px rgba(0,0,0,0.4)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {saved && !dirty ? (
          <>
            <CheckCircle2 size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              Changes saved
            </span>
          </>
        ) : error ? (
          <>
            <AlertCircle size={15} style={{ color: 'var(--red)', flexShrink: 0 }} aria-hidden="true" />
            <span className="text-xs" style={{ color: 'var(--red)' }}>{error}</span>
          </>
        ) : (
          <span className="text-xs text-dim truncate">Unsaved changes</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {dirty && (
          <button
            type="button"
            onClick={onDiscard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
            style={{
              background: 'transparent',
              border:     '1px solid var(--border)',
              color:      'var(--dim)',
            }}
          >
            <X size={12} aria-hidden="true" />
            Discard
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: dirty ? 'var(--accent)' : 'rgba(0,229,176,0.15)',
            color:      dirty ? 'var(--bg)'     : 'var(--accent)',
          }}
          onMouseEnter={e => {
            if (!saving && dirty) e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,176,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={12} aria-hidden="true" />
          )}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── PortalSettingsShell ──────────────────────────────────────────────────────

export function PortalSettingsShell({ mentor }: { mentor: SettingsMentorProps }) {
  const formId = useId()

  // ── Form state ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(mentor.display_name)
  const [bio,         setBio]         = useState(mentor.bio)
  const [avatarEmoji, setAvatarEmoji] = useState(mentor.avatar_emoji)
  const [markets,     setMarkets]     = useState<string[]>(mentor.markets)
  const [style,       setStyle]       = useState(mentor.style)
  const [signature,   setSignature]   = useState(mentor.signature)
  const [contactInfo, setContactInfo] = useState(mentor.contact_info)

  // ── Save state ──────────────────────────────────────────────────────────
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState('')
  const [isPending, startTransition] = useTransition()

  const dirty = (
    displayName !== mentor.display_name ||
    bio         !== mentor.bio          ||
    avatarEmoji !== mentor.avatar_emoji ||
    JSON.stringify(markets.slice().sort()) !== JSON.stringify(mentor.markets.slice().sort()) ||
    style       !== mentor.style        ||
    signature   !== mentor.signature    ||
    contactInfo !== mentor.contact_info
  )

  function handleDiscard() {
    setDisplayName(mentor.display_name)
    setBio(mentor.bio)
    setAvatarEmoji(mentor.avatar_emoji)
    setMarkets(mentor.markets)
    setStyle(mentor.style)
    setSignature(mentor.signature)
    setContactInfo(mentor.contact_info)
    setError('')
    setSaved(false)
  }

  function handleSave() {
    setError('')
    setSaved(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/mentor/profile', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: displayName.trim(),
            bio:          bio.trim(),
            avatar_emoji: avatarEmoji,
            markets,
            style:        style.trim(),
            signature:    signature.trim(),
            contact_info: contactInfo.trim(),
          }),
        })
        const data = await res.json() as { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Save failed')
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="px-4 py-6 md:px-6 lg:px-8 max-w-[860px] mx-auto pb-28">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-text"
          style={{ letterSpacing: '-0.03em' }}
        >
          Profile Settings
        </h1>
        <p className="text-sm text-dim mt-1">
          This information appears on your public mentor profile and playbook page.
        </p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── Section 1: Identity ──────────────────────────────────────── */}
        <section
          aria-labelledby={`${formId}-identity`}
          className="p-5 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <SectionHeader
            icon={User}
            title="Identity"
            description="Your public name and profile appearance on Playbuuk."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Emoji */}
            <div>
              <EmojiPicker value={avatarEmoji} onChange={setAvatarEmoji} />
            </div>

            {/* Handle (read-only) */}
            <div>
              <FieldLabel htmlFor={`${formId}-handle`}>Handle</FieldLabel>
              <TextInput
                id={`${formId}-handle`}
                value={`@${mentor.handle}`}
                readOnly
              />
              <p className="text-2xs text-muted mt-1 font-mono">
                Handles can&apos;t be changed — contact support.
              </p>
            </div>

            {/* Display name */}
            <div className="sm:col-span-2">
              <FieldLabel htmlFor={`${formId}-name`}>Display Name</FieldLabel>
              <TextInput
                id={`${formId}-name`}
                value={displayName}
                onChange={setDisplayName}
                placeholder="Your public name"
                maxLength={80}
              />
            </div>

            {/* Bio */}
            <div className="sm:col-span-2">
              <FieldLabel htmlFor={`${formId}-bio`}>Bio</FieldLabel>
              <TextArea
                id={`${formId}-bio`}
                value={bio}
                onChange={setBio}
                placeholder="Tell traders about your background, experience, and approach…"
                rows={4}
                maxLength={1200}
              />
            </div>
          </div>
        </section>

        {/* ── Section 2: Trading Profile ───────────────────────────────── */}
        <section
          aria-labelledby={`${formId}-trading`}
          className="p-5 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <SectionHeader
            icon={TrendingUp}
            title="Trading Profile"
            description="Markets and style shown on your public profile card."
          />

          <div className="flex flex-col gap-5">
            {/* Markets */}
            <TagPicker
              label="Markets Traded"
              options={MARKET_OPTIONS}
              selected={markets}
              onToggle={v => setMarkets(prev => toggle(prev, v))}
            />

            {/* Trading style (single-select) */}
            <div>
              <FieldLabel>Trading Style</FieldLabel>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Trading style">
                {STYLE_OPTIONS.map(opt => {
                  const active = style === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setStyle(active ? '' : opt)}
                      aria-pressed={active}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all duration-150"
                      style={active ? {
                        background: 'rgba(77,142,255,0.12)',
                        border:     '1px solid rgba(77,142,255,0.35)',
                        color:      'var(--blue)',
                      } : {
                        background: 'var(--card)',
                        border:     '1px solid var(--border)',
                        color:      'var(--dim)',
                      }}
                      onMouseEnter={e => {
                        if (!active) e.currentTarget.style.borderColor = 'rgba(77,142,255,0.2)'
                      }}
                      onMouseLeave={e => {
                        if (!active) e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Hint about pairs/sessions */}
            <div
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(77,142,255,0.05)',
                border:     '1px solid rgba(77,142,255,0.15)',
              }}
            >
              <span className="text-base leading-none flex-shrink-0 mt-0.5">💡</span>
              <p className="text-xs" style={{ color: 'var(--dim)' }}>
                Preferred pairs and session preference are managed in{' '}
                <a
                  href="/portal/playbook"
                  className="font-semibold underline underline-offset-2 transition-colors"
                  style={{ color: 'var(--blue)' }}
                >
                  My Playbook
                </a>
                {' '}— they live on the playbook, not the profile.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 3: Public Page ───────────────────────────────────── */}
        <section
          aria-labelledby={`${formId}-public`}
          className="p-5 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <SectionHeader
            icon={Globe}
            title="Public Page"
            description="Signature and contact details displayed on your public mentor profile."
          />

          <div className="flex flex-col gap-4">
            {/* Signature / tagline */}
            <div>
              <FieldLabel htmlFor={`${formId}-sig`}>
                Signature / Tagline
              </FieldLabel>
              <TextInput
                id={`${formId}-sig`}
                value={signature}
                onChange={setSignature}
                placeholder="e.g. Trade the plan, not the emotion"
                maxLength={200}
              />
              <p className="text-2xs text-muted mt-1">
                Shown beneath your name on your public profile.
              </p>
            </div>

            {/* Contact info */}
            <div>
              <FieldLabel htmlFor={`${formId}-contact`}>Contact Info</FieldLabel>
              <TextArea
                id={`${formId}-contact`}
                value={contactInfo}
                onChange={setContactInfo}
                placeholder="Twitter @handle, YouTube channel, website URL, Telegram…"
                rows={3}
                maxLength={500}
              />
              <p className="text-2xs text-muted mt-1">
                Used by the Playbuuk team for outreach — only shared with your permission.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 4: Stripe Connect ────────────────────────────────── */}
        <section
          aria-labelledby={`${formId}-stripe`}
          className="p-5 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <SectionHeader
            icon={CreditCard}
            title="Payouts"
            description="Connect Stripe to receive your monthly revenue share from Pro follower usage."
          />

          <ConnectStripeButton
            stripeConnectId={mentor.stripe_connect_id}
            isVerified={mentor.onboarding_status === 'verified'}
          />
        </section>

      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <footer
        className="mt-10 pt-6 text-center"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <p className="text-xs text-muted font-mono">
          Not financial advice. Trading carries substantial risk.
        </p>
      </footer>

      {/* ── Floating save bar ────────────────────────────────────────────── */}
      <SaveBar
        dirty={dirty}
        saving={isPending}
        saved={saved}
        error={error}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

    </main>
  )
}
