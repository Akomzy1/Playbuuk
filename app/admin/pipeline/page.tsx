'use client'

// app/admin/pipeline/page.tsx
// Mentor partnership pipeline — view and manage all mentor onboarding stages.
//
// Table columns: emoji | name | status | followers | escrow | days since added | actions
// Status filters: all, admin_added, draft_ready, invitation_sent, under_review, verified
// Actions: update onboarding_status, copy contact info

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2, AlertCircle, ChevronDown, ChevronUp,
  Copy, Check, ExternalLink, RefreshCw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingStatus =
  | 'admin_added' | 'draft_ready' | 'invitation_sent'
  | 'under_review' | 'verified' | 'withdrawn'

interface MentorRow {
  id:                string
  display_name:      string
  handle:            string
  avatar_emoji:      string
  markets:           string[]
  style:             string | null
  follower_count:    number
  external_followers: string | null
  contact_info:      string | null
  onboarding_status: OnboardingStatus
  verified:          boolean
  created_at:        string
  escrow:            number  // total_accrued from mentor_escrow
  has_playbook:      boolean
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<OnboardingStatus, { label: string; color: string; next: OnboardingStatus | null }> = {
  admin_added:     { label: 'Added',        color: '#6b7fa3', next: 'draft_ready'     },
  draft_ready:     { label: 'Draft Ready',  color: '#4d8eff', next: 'invitation_sent' },
  invitation_sent: { label: 'Invited',      color: '#fbbf24', next: 'under_review'    },
  under_review:    { label: 'In Review',    color: '#fb923c', next: 'verified'        },
  verified:        { label: 'Verified',     color: '#00e5b0', next: null              },
  withdrawn:       { label: 'Withdrawn',    color: '#ff4d6a', next: null              },
}

const ALL_STATUSES = Object.keys(STATUS_META) as OnboardingStatus[]

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button type="button" onClick={copy}
      className="p-1 rounded transition-all"
      style={{ background: 'none', border: 'none', color: copied ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer' }}
      aria-label="Copy contact info"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

// ─── StatusSelect ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OnboardingStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className="text-2xs font-mono font-bold px-2 py-0.5 rounded whitespace-nowrap"
      style={{
        background: `${meta.color}15`,
        border:     `1px solid ${meta.color}35`,
        color:       meta.color,
      }}
    >
      {meta.label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [mentors,    setMentors]    = useState<MentorRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [filter,     setFilter]     = useState<OnboardingStatus | 'all'>('all')
  const [sortBy,     setSortBy]     = useState<'days' | 'followers' | 'escrow'>('days')
  const [sortDesc,   setSortDesc]   = useState(true)
  const [updating,   setUpdating]   = useState<string | null>(null)

  const fetchMentors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/pipeline')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { mentors: MentorRow[] }
      setMentors(data.mentors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchMentors() }, [fetchMentors])

  async function advanceStatus(mentorId: string, newStatus: OnboardingStatus) {
    setUpdating(mentorId)
    try {
      const res = await fetch('/api/admin/pipeline', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mentor_id: mentorId, onboarding_status: newStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMentors(prev => prev.map(m =>
        m.id === mentorId ? { ...m, onboarding_status: newStatus, verified: newStatus === 'verified' } : m
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdating(null)
    }
  }

  // Filter + sort
  const filtered = mentors
    .filter(m => filter === 'all' || m.onboarding_status === filter)
    .sort((a, b) => {
      const dir = sortDesc ? -1 : 1
      if (sortBy === 'days')      return dir * (daysSince(b.created_at) - daysSince(a.created_at))
      if (sortBy === 'followers') return dir * (b.follower_count - a.follower_count)
      if (sortBy === 'escrow')    return dir * (b.escrow - a.escrow)
      return 0
    })

  // Count per status for filter tabs
  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = mentors.filter(m => m.onboarding_status === s).length
    return acc
  }, {} as Record<OnboardingStatus, number>)

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDesc(d => !d)
    else { setSortBy(col); setSortDesc(true) }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? (sortDesc ? <ChevronDown size={11} /> : <ChevronUp size={11} />)
      : null

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text mb-1" style={{ letterSpacing: '-0.03em' }}>
            Mentor Pipeline
          </h1>
          <p className="text-sm text-muted">{mentors.length} total mentors across all stages.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchMentors}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <Link href="/admin/add-mentor"
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            + Add Mentor
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
        >
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        <button type="button" onClick={() => setFilter('all')}
          className="text-xs font-mono px-3 py-1.5 rounded-lg transition-all"
          style={filter === 'all' ? {
            background: 'rgba(255,255,255,0.08)', color: 'var(--text)',
            border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
          } : {
            background: 'var(--surface)', color: 'var(--dim)',
            border: '1px solid var(--border)', cursor: 'pointer',
          }}
        >
          All ({mentors.length})
        </button>
        {ALL_STATUSES.map(s => {
          const meta  = STATUS_META[s]
          const active = filter === s
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className="text-xs font-mono px-3 py-1.5 rounded-lg transition-all"
              style={active ? {
                background: `${meta.color}18`, color: meta.color,
                border: `1px solid ${meta.color}40`, cursor: 'pointer',
              } : {
                background: 'var(--surface)', color: 'var(--dim)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              {meta.label} ({counts[s] ?? 0})
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl px-6 py-12 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm text-muted">No mentors in this stage.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Table header */}
          <div
            className="grid gap-3 px-5 py-3 text-2xs font-mono text-muted"
            style={{
              gridTemplateColumns: '2.5rem 1fr 9rem 7rem 7rem 6rem 10rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span />
            <span>Mentor</span>
            <span>Status</span>
            <button type="button" className="flex items-center gap-1 text-left" onClick={() => toggleSort('followers')}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
            >
              Followers <SortIcon col="followers" />
            </button>
            <button type="button" className="flex items-center gap-1 text-left" onClick={() => toggleSort('escrow')}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
            >
              Escrow <SortIcon col="escrow" />
            </button>
            <button type="button" className="flex items-center gap-1 text-left" onClick={() => toggleSort('days')}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
            >
              Age <SortIcon col="days" />
            </button>
            <span>Actions</span>
          </div>

          {/* Rows */}
          {filtered.map(mentor => {
            const meta     = STATUS_META[mentor.onboarding_status]
            const nextSt   = meta.next
            const isUpdating = updating === mentor.id
            const days     = daysSince(mentor.created_at)

            return (
              <div
                key={mentor.id}
                className="grid gap-3 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors"
                style={{
                  gridTemplateColumns: '2.5rem 1fr 9rem 7rem 7rem 6rem 10rem',
                  borderBottom: '1px solid rgba(26,40,69,0.5)',
                }}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.12)' }}
                >
                  {mentor.avatar_emoji}
                </div>

                {/* Name + handle */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-bold text-text truncate">{mentor.display_name}</p>
                    {mentor.verified && (
                      <span className="text-2xs text-accent flex-shrink-0">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-2xs font-mono text-muted">@{mentor.handle}</p>
                    {mentor.contact_info && (
                      <CopyButton text={mentor.contact_info} />
                    )}
                  </div>
                  {mentor.external_followers && (
                    <p className="text-2xs font-mono text-muted mt-0.5">{mentor.external_followers}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={mentor.onboarding_status} />
                </div>

                {/* Followers */}
                <p className="text-sm font-mono text-text">{mentor.follower_count.toLocaleString()}</p>

                {/* Escrow */}
                <p className="text-sm font-mono"
                  style={{ color: mentor.escrow > 0 ? 'var(--gold)' : 'var(--muted)' }}
                >
                  {mentor.escrow > 0 ? `$${mentor.escrow.toFixed(2)}` : '—'}
                </p>

                {/* Days */}
                <p className="text-sm font-mono text-dim">
                  {days === 0 ? 'Today' : `${days}d`}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {nextSt && (
                    <button
                      type="button"
                      onClick={() => advanceStatus(mentor.id, nextSt)}
                      disabled={isUpdating}
                      className="text-2xs font-mono px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                      style={{
                        background: isUpdating ? 'var(--surface)' : `${meta.color}15`,
                        border:     `1px solid ${meta.color}35`,
                        color:       isUpdating ? 'var(--muted)' : meta.color,
                        cursor:      isUpdating ? 'not-allowed' : 'pointer',
                        whiteSpace:  'nowrap',
                      }}
                    >
                      {isUpdating && <Loader2 size={9} className="animate-spin" />}
                      → {STATUS_META[nextSt].label}
                    </button>
                  )}
                  {mentor.has_playbook && (
                    <Link
                      href={`/mentor/${mentor.id}`}
                      target="_blank"
                      className="p-1.5 rounded-lg"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                      title="View playbook"
                      aria-label="View playbook"
                    >
                      <ExternalLink size={11} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
