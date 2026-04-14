'use client'

// components/requests/requests-shell.tsx
// Interactive shell for the mentor requests page.
//
// Sections:
//   ① Header — title + description
//   ② RequestForm — submit a new request
//   ③ Requests list — sorted by votes, with VoteButton per card
//
// Vote interaction:
//   - Optimistic update: count changes immediately, reverts on error
//   - Toggle: if already voted, clicking removes vote
//   - Unauthenticated users see the vote count but clicking prompts login

import { useState }        from 'react'
import Link                from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp, Plus, X, Loader2, AlertCircle, CheckCircle2,
  Users, Sparkles, TrendingUp, Lock,
} from 'lucide-react'
import type { RequestItem } from '@/app/(platform)/requests/page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestsShellProps {
  initialRequests: RequestItem[]
  isAuthed:        boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKET_OPTIONS = [
  'Forex', 'Indices', 'Gold / XAU', 'Crypto',
  'Oil / Commodities', 'US Stocks', 'UK Stocks', 'Futures',
]

const STATUS_META = {
  open:        { label: 'Open',        color: '#4d8eff',  bg: 'rgba(77,142,255,0.1)'  },
  in_progress: { label: 'In Progress', color: '#fbbf24',  bg: 'rgba(251,191,36,0.1)'  },
  added:       { label: 'Added ✓',     color: '#00e5b0',  bg: 'rgba(0,229,176,0.1)'   },
  declined:    { label: 'Declined',    color: '#ff4d6a',  bg: 'rgba(255,77,106,0.1)'  },
}

// ─── VoteButton ───────────────────────────────────────────────────────────────

function VoteButton({
  requestId, voteCount, userVoted, isAuthed, onVote,
}: {
  requestId: string
  voteCount: number
  userVoted: boolean
  isAuthed:  boolean
  onVote:    (id: string, voted: boolean, newCount: number) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isAuthed || loading) return
    setLoading(true)

    // Optimistic update
    const optimisticCount = userVoted ? voteCount - 1 : voteCount + 1
    onVote(requestId, !userVoted, optimisticCount)

    try {
      const method = userVoted ? 'DELETE' : 'POST'
      const res = await fetch(`/api/requests/${requestId}/vote`, { method })
      const data = await res.json() as { vote_count?: number; user_voted?: boolean; error?: string }
      if (res.ok && data.vote_count !== undefined) {
        onVote(requestId, data.user_voted ?? !userVoted, data.vote_count)
      } else {
        // Revert on error
        onVote(requestId, userVoted, voteCount)
      }
    } catch {
      onVote(requestId, userVoted, voteCount)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={userVoted ? `Remove vote (${voteCount})` : `Vote for this mentor (${voteCount})`}
      className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all duration-150 flex-shrink-0 select-none"
      style={userVoted ? {
        background: 'rgba(0,229,176,0.12)',
        border:     '1px solid rgba(0,229,176,0.35)',
        color:      'var(--accent)',
        cursor:     loading ? 'not-allowed' : 'pointer',
        minWidth:   52,
      } : {
        background: 'var(--surface)',
        border:     '1px solid var(--border)',
        color:      isAuthed ? 'var(--dim)' : 'var(--muted)',
        cursor:     isAuthed ? (loading ? 'not-allowed' : 'pointer') : 'default',
        minWidth:   52,
      }}
      onMouseEnter={e => {
        if (!isAuthed || loading || userVoted) return
        e.currentTarget.style.borderColor = 'rgba(0,229,176,0.3)'
        e.currentTarget.style.color       = 'var(--accent)'
        e.currentTarget.style.background  = 'rgba(0,229,176,0.06)'
      }}
      onMouseLeave={e => {
        if (!isAuthed || loading || userVoted) return
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color       = 'var(--dim)'
        e.currentTarget.style.background  = 'var(--surface)'
      }}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin" />
        : <ChevronUp
            size={14}
            strokeWidth={userVoted ? 2.5 : 1.8}
            style={{ transition: 'transform 0.15s' }}
          />
      }
      <span className="text-sm font-bold font-mono leading-none">
        {voteCount}
      </span>
    </button>
  )
}

// ─── RequestCard ──────────────────────────────────────────────────────────────

function RequestCard({
  request, isAuthed, rank, onVote,
}: {
  request:  RequestItem
  isAuthed: boolean
  rank:     number
  onVote:   (id: string, voted: boolean, newCount: number) => void
}) {
  const meta    = STATUS_META[request.status] ?? STATUS_META.open
  const isAdded = request.status === 'added'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{    opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-4 px-5 py-4 group"
      style={{ borderBottom: '1px solid rgba(26,40,69,0.5)' }}
    >
      {/* Rank */}
      <span
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded-lg mt-0.5"
        style={{
          background: rank <= 3 ? 'rgba(251,191,36,0.1)' : 'var(--surface)',
          color:      rank <= 3 ? 'var(--gold)'           : 'var(--muted)',
          border:     `1px solid ${rank <= 3 ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
        }}
        aria-hidden="true"
      >
        {rank}
      </span>

      {/* Vote button */}
      <VoteButton
        requestId={request.id}
        voteCount={request.vote_count}
        userVoted={request.user_voted}
        isAuthed={isAuthed}
        onVote={onVote}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
            {request.mentor_name}
          </span>
          {request.mentor_handle && (
            <span className="text-sm font-mono text-muted">@{request.mentor_handle}</span>
          )}
          <span
            className="text-2xs font-mono font-bold px-2 py-0.5 rounded-full"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}35` }}
          >
            {meta.label}
          </span>
        </div>
        {request.markets.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {request.markets.map(m => (
              <span
                key={m}
                className="text-2xs font-mono px-2 py-0.5 rounded"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Added indicator */}
      {isAdded && (
        <div className="flex-shrink-0 flex items-center gap-1 text-2xs font-mono font-bold mt-1"
          style={{ color: 'var(--accent)' }}
        >
          <CheckCircle2 size={12} />
          On Playbuuk
        </div>
      )}
    </motion.div>
  )
}

// ─── RequestForm ──────────────────────────────────────────────────────────────

function RequestForm({
  isAuthed, onSubmitted,
}: {
  isAuthed:    boolean
  onSubmitted: (item: RequestItem) => void
}) {
  const [open,    setOpen]    = useState(false)
  const [name,    setName]    = useState('')
  const [handle,  setHandle]  = useState('')
  const [markets, setMarkets] = useState<string[]>([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dupeId,  setDupeId]  = useState<string | null>(null)

  function toggleMarket(m: string) {
    setMarkets(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m])
  }

  function reset() {
    setName(''); setHandle(''); setMarkets([])
    setError(null); setSuccess(false); setDupeId(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || markets.length === 0) {
      setError('Name and at least one market are required')
      return
    }
    setSaving(true); setError(null); setDupeId(null)
    try {
      const res = await fetch('/api/requests', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mentor_name: name.trim(), mentor_handle: handle.trim(), markets }),
      })
      const data = await res.json() as {
        request?:    RequestItem
        request_id?: string
        error?:      string
      }
      if (res.status === 409) {
        setError(data.error ?? 'Already requested')
        if (data.request_id) setDupeId(data.request_id)
        return
      }
      if (!res.ok || !data.request) throw new Error(data.error ?? `HTTP ${res.status}`)
      onSubmitted(data.request)
      setSuccess(true)
      setTimeout(() => { reset(); setOpen(false) }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { if (!isAuthed) return; setOpen(true) }}
        className="w-full flex items-center justify-center gap-2.5 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-150"
        style={{
          background: isAuthed ? 'var(--card)' : 'var(--surface)',
          border:     isAuthed ? '2px dashed rgba(0,229,176,0.3)' : '1px dashed var(--border)',
          color:      isAuthed ? 'var(--accent)' : 'var(--muted)',
          cursor:     isAuthed ? 'pointer' : 'default',
        }}
        onMouseEnter={e => {
          if (!isAuthed) return
          e.currentTarget.style.background    = 'rgba(0,229,176,0.05)'
          e.currentTarget.style.borderColor   = 'rgba(0,229,176,0.5)'
        }}
        onMouseLeave={e => {
          if (!isAuthed) return
          e.currentTarget.style.background    = 'var(--card)'
          e.currentTarget.style.borderColor   = 'rgba(0,229,176,0.3)'
        }}
      >
        {isAuthed ? (
          <>
            <Plus size={16} aria-hidden="true" />
            Request a Mentor
          </>
        ) : (
          <>
            <Lock size={14} aria-hidden="true" />
            Sign in to request a mentor
          </>
        )}
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid rgba(0,229,176,0.25)', borderTop: '2px solid rgba(0,229,176,0.4)' }}
    >
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles size={15} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
            Request a Mentor
          </span>
        </div>
        <button type="button" onClick={() => { reset(); setOpen(false) }}
          className="p-1 rounded-lg text-muted hover:text-text transition-colors"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Close form"
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={submit} className="px-5 py-4 flex flex-col gap-4">
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 py-4 text-center justify-center"
          >
            <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-sm font-bold text-text">Request submitted!</p>
              <p className="text-xs text-muted mt-0.5">Your vote has been counted.</p>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="req-name" className="text-xs font-semibold text-muted">
                  Mentor Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="req-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex G"
                  maxLength={200}
                  required
                  className="rounded-xl text-sm focus:outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="req-handle" className="text-xs font-semibold text-muted">
                  Handle / Username
                </label>
                <input
                  id="req-handle"
                  type="text"
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  placeholder="@username or YouTube name"
                  maxLength={100}
                  className="rounded-xl text-sm focus:outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">
                Markets <span style={{ color: 'var(--danger)' }}>*</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MARKET_OPTIONS.map(m => {
                  const active = markets.includes(m)
                  return (
                    <button
                      key={m} type="button"
                      onClick={() => toggleMarket(m)}
                      className="text-xs font-mono px-2.5 py-1 rounded-lg transition-all duration-100"
                      style={active ? {
                        background: 'rgba(0,229,176,0.12)',
                        border:     '1px solid rgba(0,229,176,0.3)',
                        color:      'var(--accent)',
                        cursor:     'pointer',
                      } : {
                        background: 'var(--surface)',
                        border:     '1px solid var(--border)',
                        color:      'var(--dim)',
                        cursor:     'pointer',
                      }}
                    >{m}</button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
                style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
                role="alert"
              >
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                <div>
                  {error}
                  {dupeId && (
                    <button
                      type="button"
                      onClick={() => {
                        // Scroll to the duplicate card
                        document.getElementById(`req-${dupeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        setOpen(false); reset()
                      }}
                      className="block mt-1 underline"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, textAlign: 'left' }}
                    >
                      Vote for the existing request instead →
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => { reset(); setOpen(false) }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-muted"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >Cancel</button>
              <button
                type="submit"
                disabled={saving || !name.trim() || markets.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150"
                style={{
                  background: (saving || !name.trim() || markets.length === 0)
                    ? 'var(--surface)' : 'var(--accent)',
                  color: (saving || !name.trim() || markets.length === 0)
                    ? 'var(--muted)' : 'var(--bg)',
                  border:  'none',
                  cursor:  (saving || !name.trim() || markets.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </form>
    </motion.div>
  )
}

// ─── RequestsShell ────────────────────────────────────────────────────────────

export function RequestsShell({ initialRequests, isAuthed }: RequestsShellProps) {
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests)

  function handleVote(id: string, voted: boolean, newCount: number) {
    setRequests(prev =>
      [...prev.map(r => r.id === id ? { ...r, user_voted: voted, vote_count: newCount } : r)]
        .sort((a, b) => b.vote_count - a.vote_count || a.created_at.localeCompare(b.created_at))
    )
  }

  function handleSubmitted(item: RequestItem) {
    setRequests(prev =>
      [item, ...prev].sort((a, b) => b.vote_count - a.vote_count || a.created_at.localeCompare(b.created_at))
    )
  }

  const open       = requests.filter(r => r.status === 'open' || r.status === 'in_progress')
  const fulfilled  = requests.filter(r => r.status === 'added')
  const totalVotes = requests.reduce((s, r) => s + r.vote_count, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.25)' }}
          >
            <Users size={15} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <span className="text-2xs font-mono font-bold tracking-widest"
            style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}
          >
            COMMUNITY
          </span>
        </div>
        <h1 className="text-3xl font-bold text-text mb-2" style={{ letterSpacing: '-0.03em' }}>
          Request a Mentor
        </h1>
        <p className="text-sm text-dim leading-relaxed mb-4">
          Don&apos;t see your favourite trading mentor? Request them here — most-voted mentors get added first.
          The mentor will be notified: <em style={{ color: 'var(--text)', fontStyle: 'normal' }}>
            &ldquo;{totalVotes} traders voted for your strategy on Playbuuk.&rdquo;
          </em>
        </p>

        {/* Stats strip */}
        <div className="flex items-center gap-4">
          {[
            { icon: TrendingUp, value: requests.length,           label: 'requests'      },
            { icon: ChevronUp,  value: totalVotes,                label: 'total votes'   },
            { icon: CheckCircle2, value: fulfilled.length,        label: 'added'         },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-1.5">
              <stat.icon size={12} style={{ color: 'var(--muted)' }} aria-hidden="true" />
              <span className="text-sm font-bold font-mono text-text">{stat.value}</span>
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Request form ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <RequestForm isAuthed={isAuthed} onSubmitted={handleSubmitted} />
      </div>

      {/* ── Open requests ─────────────────────────────────────────────── */}
      {open.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
              Open Requests
            </span>
            <span className="text-2xs font-mono text-muted">{open.length} mentors</span>
          </div>

          <AnimatePresence initial={false} mode="popLayout">
            {open.map((req, i) => (
              <div key={req.id} id={`req-${req.id}`}>
                <RequestCard
                  request={req}
                  isAuthed={isAuthed}
                  rank={i + 1}
                  onVote={handleVote}
                />
              </div>
            ))}
          </AnimatePresence>

          {!isAuthed && (
            <div className="flex items-center justify-center gap-3 px-5 py-4"
              style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,229,176,0.02)' }}
            >
              <Lock size={13} style={{ color: 'var(--muted)' }} aria-hidden="true" />
              <span className="text-xs text-muted">
                <Link href="/login" className="text-accent underline">Sign in</Link> to vote and submit requests
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {open.length === 0 && (
        <div className="rounded-2xl px-6 py-12 text-center mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-3xl mb-3" aria-hidden="true">🎯</p>
          <p className="text-sm font-bold text-text mb-1">No open requests yet</p>
          <p className="text-xs text-muted">
            Be the first to request a mentor you want to see on Playbuuk.
          </p>
        </div>
      )}

      {/* ── Fulfilled requests ─────────────────────────────────────────── */}
      {fulfilled.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid rgba(0,229,176,0.15)' }}
        >
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
                Added to Playbuuk
              </span>
            </div>
            <span className="text-2xs font-mono text-muted">{fulfilled.length} mentors</span>
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            {fulfilled.map((req, i) => (
              <div key={req.id} id={`req-${req.id}`}>
                <RequestCard
                  request={req}
                  isAuthed={isAuthed}
                  rank={i + 1}
                  onVote={handleVote}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-2xs font-mono text-muted text-center mt-8 leading-relaxed">
        Not financial advice. Trading carries substantial risk.
      </p>
    </div>
  )
}
