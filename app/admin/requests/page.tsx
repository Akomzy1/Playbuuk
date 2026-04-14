'use client'

// app/admin/requests/page.tsx
// Admin view of mentor requests — demand signals for outreach.
//
// Shows all requests (including declined) with full action controls.
// Vote counts are the primary demand signal: "347 traders voted for this mentor."
//
// Actions:
//   "Add"         → navigates to /admin/add-mentor pre-filled with name/handle/markets
//   "In Progress" → marks outreach started
//   "Decline"     → removes from public list

import { useEffect, useState, useCallback } from 'react'
import { useRouter }   from 'next/navigation'
import {
  Loader2, AlertCircle, ChevronUp, RefreshCw,
  UserPlus, Clock, X, TrendingUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'open' | 'in_progress' | 'added' | 'declined'

interface AdminRequestItem {
  id:            string
  mentor_name:   string
  mentor_handle: string
  markets:       string[]
  vote_count:    number
  status:        RequestStatus
  admin_notes:   string | null
  created_at:    string
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<RequestStatus, { label: string; color: string }> = {
  open:        { label: 'Open',        color: '#4d8eff'  },
  in_progress: { label: 'In Progress', color: '#fbbf24'  },
  added:       { label: 'Added ✓',     color: '#00e5b0'  },
  declined:    { label: 'Declined',    color: '#6b7fa3'  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRequestsPage() {
  const router = useRouter()

  const [requests,   setRequests]   = useState<AdminRequestItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [filter,     setFilter]     = useState<RequestStatus | 'all'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [noteId,     setNoteId]     = useState<string | null>(null)
  const [noteText,   setNoteText]   = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/requests')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { requests: AdminRequestItem[] }
      // Admin sees all statuses including declined — fetch separately for notes
      const adminRes = await fetch('/api/requests?admin=1')
      if (adminRes.ok) {
        const adminData = await adminRes.json() as { requests: AdminRequestItem[] }
        setRequests(adminData.requests ?? data.requests)
      } else {
        setRequests(data.requests)
      }
    } catch {
      // Fallback to public endpoint
      try {
        const res = await fetch('/api/requests')
        const data = await res.json() as { requests: AdminRequestItem[] }
        setRequests(data.requests)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchRequests() }, [fetchRequests])

  async function updateStatus(id: string, status: RequestStatus, notes?: string) {
    setUpdatingId(id); setError(null)
    try {
      const res = await fetch('/api/admin/requests', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          request_id:  id,
          status,
          ...(notes !== undefined ? { admin_notes: notes } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      setRequests(prev =>
        prev.map(r => r.id === id ? {
          ...r, status,
          ...(notes !== undefined ? { admin_notes: notes } : {}),
        } : r)
      )
      setNoteId(null); setNoteText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  function handleAddMentor(req: AdminRequestItem) {
    const params = new URLSearchParams({
      name:    req.mentor_name,
      handle:  req.mentor_handle,
      markets: req.markets.join(','),
    })
    router.push(`/admin/add-mentor?${params.toString()}`)
  }

  const filtered = requests
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => b.vote_count - a.vote_count || a.created_at.localeCompare(b.created_at))

  const counts = (['open','in_progress','added','declined'] as RequestStatus[]).reduce((acc, s) => {
    acc[s] = requests.filter(r => r.status === s).length
    return acc
  }, {} as Record<RequestStatus, number>)

  const totalVotes = requests.reduce((s, r) => s + r.vote_count, 0)

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text mb-1" style={{ letterSpacing: '-0.03em' }}>
            Mentor Requests
          </h1>
          <p className="text-sm text-muted">
            {requests.length} requests · {totalVotes} total votes — demand signals for outreach.
          </p>
        </div>
        <button type="button" onClick={fetchRequests}
          className="p-2 rounded-xl flex-shrink-0"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}
          aria-label="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Demand highlight */}
      {requests.length > 0 && (
        <div className="rounded-2xl px-5 py-4 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.18)' }}
        >
          <TrendingUp size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-bold text-text mb-0.5">Top demand signal</p>
            {requests[0] && (
              <p className="text-xs text-dim leading-relaxed">
                <strong className="text-text">{requests[0].mentor_name}</strong> has{' '}
                <strong className="text-accent">{requests[0].vote_count} votes</strong> — outreach pitch:{' '}
                <em style={{ fontStyle: 'normal', color: 'var(--dim)' }}>
                  &ldquo;{requests[0].vote_count} traders on Playbuuk voted for your trading strategy.
                  Your playbook is waiting — free to claim.&rdquo;
                </em>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
        >
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <button type="button" onClick={() => setFilter('all')}
          className="text-xs font-mono px-3 py-1.5 rounded-lg"
          style={filter === 'all' ? {
            background: 'rgba(255,255,255,0.08)', color: 'var(--text)',
            border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
          } : {
            background: 'var(--surface)', color: 'var(--dim)',
            border: '1px solid var(--border)', cursor: 'pointer',
          }}
        >All ({requests.length})</button>
        {(['open','in_progress','added','declined'] as RequestStatus[]).map(s => {
          const meta = STATUS_META[s]
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className="text-xs font-mono px-3 py-1.5 rounded-lg"
              style={filter === s ? {
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

      {/* Requests */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl px-6 py-12 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm text-muted">No requests in this category.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {filtered.map((req, i) => {
            const meta       = STATUS_META[req.status]
            const isUpdating = updatingId === req.id
            const isEditNote = noteId === req.id

            return (
              <div key={req.id}
                className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom: '1px solid rgba(26,40,69,0.5)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Rank + vote count */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                    <span className="text-2xs font-mono text-muted">#{i + 1}</span>
                    <div className="flex flex-col items-center px-2.5 py-2 rounded-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <ChevronUp size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                      <span className="text-base font-bold font-mono text-text leading-none mt-0.5">
                        {req.vote_count}
                      </span>
                      <span className="text-2xs font-mono text-muted">votes</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1.5">
                      <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
                        {req.mentor_name}
                      </span>
                      {req.mentor_handle && (
                        <span className="text-sm font-mono text-muted">@{req.mentor_handle}</span>
                      )}
                      <span
                        className="text-2xs font-mono font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${meta.color}15`,
                          border:     `1px solid ${meta.color}35`,
                          color:       meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {req.markets.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {req.markets.map(m => (
                          <span key={m} className="text-2xs font-mono px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                          >{m}</span>
                        ))}
                      </div>
                    )}

                    {/* Admin notes */}
                    {req.admin_notes && !isEditNote && (
                      <p className="text-xs text-dim italic mb-2 leading-relaxed">
                        Note: {req.admin_notes}
                      </p>
                    )}

                    {isEditNote && (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Add admin note…"
                          maxLength={1000}
                          className="flex-1 rounded-lg text-xs focus:outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid rgba(0,229,176,0.3)', color: 'var(--text)', padding: '6px 10px' }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void updateStatus(req.id, req.status, noteText)
                            if (e.key === 'Escape') { setNoteId(null); setNoteText('') }
                          }}
                          autoFocus
                        />
                        <button type="button"
                          onClick={() => void updateStatus(req.id, req.status, noteText)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', cursor: 'pointer' }}
                        >Save</button>
                        <button type="button"
                          onClick={() => { setNoteId(null); setNoteText('') }}
                          className="p-1.5 rounded-lg text-muted"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        ><X size={12} /></button>
                      </div>
                    )}

                    {/* Outreach pitch */}
                    <p className="text-2xs font-mono text-muted leading-relaxed">
                      Pitch: &ldquo;{req.vote_count} trader{req.vote_count !== 1 ? 's' : ''} voted for your strategy on Playbuuk.&rdquo;
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {isUpdating ? (
                      <Loader2 size={16} className="animate-spin text-accent" />
                    ) : (
                      <>
                        {req.status !== 'added' && (
                          <button
                            type="button"
                            onClick={() => handleAddMentor(req)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{
                              background: 'rgba(0,229,176,0.1)',
                              border:     '1px solid rgba(0,229,176,0.3)',
                              color:      'var(--accent)',
                              cursor:     'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,176,0.18)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,176,0.1)' }}
                          >
                            <UserPlus size={11} />
                            Add Mentor
                          </button>
                        )}

                        {req.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => void updateStatus(req.id, 'in_progress')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                            style={{
                              background: 'rgba(251,191,36,0.1)',
                              border:     '1px solid rgba(251,191,36,0.3)',
                              color:      'var(--gold)',
                              cursor:     'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Clock size={11} />
                            In Progress
                          </button>
                        )}

                        {req.status !== 'declined' && req.status !== 'added' && (
                          <button
                            type="button"
                            onClick={() => void updateStatus(req.id, 'declined')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                            style={{
                              background: 'var(--surface)',
                              border:     '1px solid var(--border)',
                              color:      'var(--muted)',
                              cursor:     'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <X size={11} />
                            Decline
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setNoteId(req.id)
                            setNoteText(req.admin_notes ?? '')
                          }}
                          className="text-2xs font-mono text-muted px-2 py-1 rounded-lg"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {req.admin_notes ? 'Edit note' : '+ note'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
