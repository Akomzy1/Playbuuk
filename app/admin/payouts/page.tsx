'use client'

// app/admin/payouts/page.tsx
// Admin payout management — process monthly payouts, manage escrow, update statuses.

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, AlertCircle, DollarSign, Lock,
  CheckCircle2, RefreshCw, ChevronDown, Clock, Flame,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PayoutStatus = 'accrued' | 'pending' | 'processing' | 'paid' | 'failed'

interface PayoutRecord {
  id:                string
  mentor_id:         string
  period_start:      string
  period_end:        string
  pro_share_amount:  number
  direct_amount:     number
  total_amount:      number
  status:            PayoutStatus
  stripe_transfer_id: string | null
  created_at:        string
  mentor: {
    display_name:      string
    handle:            string
    avatar_emoji:      string
    verified:          boolean
    stripe_connect_id: string | null
  }
}

interface EscrowRecord {
  id:                 string
  mentor_id:          string
  total_accrued:      number
  last_calculated_at: string
  mentor: {
    display_name:      string
    handle:            string
    avatar_emoji:      string
    verified:          boolean
    stripe_connect_id: string | null
    onboarding_status: string
  }
}

interface EscrowWarning {
  mentor_id:          string
  days_until_expiry:  number
  amount:             number
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<PayoutStatus, { label: string; color: string }> = {
  accrued:    { label: 'Accrued',    color: '#6b7fa3' },
  pending:    { label: 'Pending',    color: '#4d8eff' },
  processing: { label: 'Processing', color: '#fbbf24' },
  paid:       { label: 'Paid',       color: '#00e5b0' },
  failed:     { label: 'Failed',     color: '#ff4d6a' },
}

// ─── CalculateModal ───────────────────────────────────────────────────────────

function CalculateModal({
  onConfirm, onClose, loading,
}: {
  onConfirm: (start: string, end: string) => void
  onClose:   () => void
  loading:   boolean
}) {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end   = new Date(now.getFullYear(), now.getMonth(), 0)

  const [periodStart, setPeriodStart] = useState(start.toISOString().slice(0, 10))
  const [periodEnd,   setPeriodEnd]   = useState(end.toISOString().slice(0, 10))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="rounded-2xl w-full max-w-md p-6"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-base font-bold text-text mb-4" style={{ letterSpacing: '-0.02em' }}>
          Calculate Payouts
        </h2>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          This will calculate usage-based revenue shares for the selected period and create payout records for all active mentors.
          Verified mentors will get status &quot;Pending&quot;; unverified get &quot;Accrued&quot; (added to escrow).
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Period Start</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              className="rounded-xl text-sm focus:outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px' }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Period End</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              className="rounded-xl text-sm focus:outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-muted flex-1"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >Cancel</button>
          <button type="button"
            onClick={() => onConfirm(`${periodStart}T00:00:00.000Z`, `${periodEnd}T23:59:59.999Z`)}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold flex-1"
            style={{ background: loading ? 'var(--surface)' : 'var(--accent)', color: loading ? 'var(--muted)' : 'var(--bg)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ExpireConfirmModal ───────────────────────────────────────────────────────

function ExpireConfirmModal({
  onConfirm, onClose, loading, warnings,
}: {
  onConfirm: () => void
  onClose:   () => void
  loading:   boolean
  warnings:  EscrowWarning[]
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="rounded-2xl w-full max-w-md p-6"
        style={{ background: 'var(--card)', border: '1px solid rgba(255,77,106,0.3)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} style={{ color: 'var(--danger)' }} />
          <h2 className="text-base font-bold text-text" style={{ letterSpacing: '-0.02em' }}>
            Run Escrow Expiry Check
          </h2>
        </div>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          This will expire escrow balances older than 12 months (last calculated at). Expired funds are forfeited
          and an audit record is created with status &quot;Failed&quot;. This action cannot be undone.
        </p>

        {warnings.length > 0 && (
          <div className="rounded-xl p-3 mb-4"
            style={{ background: 'rgba(255,77,106,0.05)', border: '1px solid rgba(255,77,106,0.2)' }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--danger)' }}>
              {warnings.length} escrow{warnings.length > 1 ? 's' : ''} will expire in &lt; 60 days
            </p>
            <div className="flex flex-col gap-1.5">
              {warnings.map(w => (
                <div key={w.mentor_id} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-dim">{w.mentor_id.slice(0, 8)}…</span>
                  <span style={{ color: w.days_until_expiry <= 14 ? 'var(--danger)' : 'var(--gold)' }}>
                    {w.days_until_expiry}d left · ${w.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-muted flex-1"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >Cancel</button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold flex-1"
            style={{ background: loading ? 'var(--surface)' : 'rgba(255,77,106,0.15)', color: loading ? 'var(--muted)' : 'var(--danger)', border: '1px solid rgba(255,77,106,0.3)', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? 'Running…' : 'Run Expiry Check'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayoutsPage() {
  const [payouts,      setPayouts]      = useState<PayoutRecord[]>([])
  const [escrows,      setEscrows]      = useState<EscrowRecord[]>([])
  const [warnings,     setWarnings]     = useState<EscrowWarning[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState<string | null>(null)
  const [showCalc,     setShowCalc]     = useState(false)
  const [showExpire,   setShowExpire]   = useState(false)
  const [calcLoading,  setCalcLoading]  = useState(false)
  const [expireLoading, setExpireLoading] = useState(false)
  const [updatingId,   setUpdatingId]  = useState<string | null>(null)
  const [releasingId,  setReleasingId] = useState<string | null>(null)
  const [filter,       setFilter]      = useState<PayoutStatus | 'all'>('all')
  const [showEscrow,   setShowEscrow]  = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/payouts')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as {
        payouts:  PayoutRecord[]
        escrows:  EscrowRecord[]
        warnings: EscrowWarning[]
      }
      setPayouts(data.payouts)
      setEscrows(data.escrows)
      setWarnings(data.warnings ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  async function handleCalculate(periodStart: string, periodEnd: string) {
    setCalcLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/payouts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'calculate', period_start: periodStart, period_end: periodEnd }),
      })
      const data = await res.json() as { created?: number; total_payout?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setSuccess(`Created ${data.created ?? 0} payout records. Total: $${(data.total_payout ?? 0).toFixed(2)}`)
      setShowCalc(false)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setCalcLoading(false)
    }
  }

  async function handleExpireEscrow() {
    setExpireLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/payouts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'expire_escrow' }),
      })
      const data = await res.json() as { expired_count?: number; total_expired?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      const count   = data.expired_count ?? 0
      const expired = data.total_expired ?? 0
      setSuccess(
        count === 0
          ? 'No escrow balances found past the 12-month cutoff.'
          : `Expired ${count} escrow balance${count > 1 ? 's' : ''} — $${expired.toFixed(2)} forfeited.`
      )
      setShowExpire(false)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Expiry check failed')
    } finally {
      setExpireLoading(false)
    }
  }

  async function updateStatus(payoutId: string, newStatus: PayoutStatus) {
    setUpdatingId(payoutId); setError(null)
    try {
      const res = await fetch('/api/admin/payouts', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ payout_id: payoutId, status: newStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: newStatus } : p))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  async function releaseEscrow(mentorId: string) {
    setReleasingId(mentorId); setError(null)
    try {
      const res = await fetch('/api/admin/payouts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'release_escrow', mentor_id: mentorId }),
      })
      const data = await res.json() as { payout_id?: string; amount?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setSuccess(`Escrow released — $${(data.amount ?? 0).toFixed(2)} payout created`)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release failed')
    } finally {
      setReleasingId(null)
    }
  }

  // Build a quick-lookup map: mentor_id → warning
  const warningByMentor = new Map(warnings.map(w => [w.mentor_id, w]))

  const filtered       = payouts.filter(p => filter === 'all' || p.status === filter)
  const totalEscrow    = escrows.reduce((s, e) => s + e.total_accrued, 0)
  const pendingAmount  = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.total_amount, 0)

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text mb-1" style={{ letterSpacing: '-0.03em' }}>
            Payouts
          </h1>
          <p className="text-sm text-muted">Calculate monthly revenue shares and manage mentor payouts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchData}
            className="p-2 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}
          >
            <RefreshCw size={14} />
          </button>
          <button type="button" onClick={() => setShowExpire(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(255,77,106,0.1)', color: 'var(--danger)', border: '1px solid rgba(255,77,106,0.25)', cursor: 'pointer' }}
          >
            <Flame size={14} />
            Expiry Check
            {warnings.length > 0 && (
              <span className="text-2xs font-mono px-1.5 py-px rounded-full"
                style={{ background: 'rgba(255,77,106,0.2)', color: 'var(--danger)' }}
              >
                {warnings.length}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setShowCalc(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', cursor: 'pointer' }}
          >
            <DollarSign size={14} />
            Calculate Payouts
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
        >
          <AlertCircle size={14} />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.2)', color: 'var(--accent)' }}
        >
          <CheckCircle2 size={14} />{success}
        </div>
      )}

      {/* Expiry warning banner */}
      {warnings.length > 0 && (
        <div className="rounded-2xl px-5 py-4 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.25)' }}
        >
          <Clock size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
          <div>
            <p className="text-sm font-bold text-text mb-1">
              {warnings.length} escrow balance{warnings.length > 1 ? 's' : ''} approaching 12-month expiry
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {warnings.map(w => (
                <span key={w.mentor_id}
                  className="text-2xs font-mono px-2 py-1 rounded-lg"
                  style={{
                    background: w.days_until_expiry <= 14 ? 'rgba(255,77,106,0.1)' : 'rgba(251,191,36,0.08)',
                    border:     `1px solid ${w.days_until_expiry <= 14 ? 'rgba(255,77,106,0.25)' : 'rgba(251,191,36,0.2)'}`,
                    color:      w.days_until_expiry <= 14 ? 'var(--danger)' : 'var(--gold)',
                  }}
                >
                  {w.days_until_expiry}d · ${w.amount.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Payouts', value: `$${pendingAmount.toFixed(2)}`,     color: '#4d8eff' },
          { label: 'Escrow Held',     value: `$${totalEscrow.toFixed(2)}`,       color: '#fbbf24' },
          { label: 'Total Records',   value: payouts.length.toLocaleString(),    color: '#a78bfa' },
          { label: 'Escrow Mentors',  value: escrows.length.toLocaleString(),    color: '#fb923c' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: `2px solid ${card.color}50` }}
          >
            <p className="text-2xs font-mono text-muted mb-1">{card.label}</p>
            <p className="text-xl font-bold font-mono text-text">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Escrow section ─────────────────────────────────────────────── */}
      {escrows.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'var(--card)', border: '1px solid rgba(251,191,36,0.2)', borderTop: '2px solid rgba(251,191,36,0.4)' }}
        >
          <button type="button"
            onClick={() => setShowEscrow(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: showEscrow ? '1px solid var(--border)' : 'none' }}
          >
            <div className="flex items-center gap-2">
              <Lock size={14} style={{ color: 'var(--gold)' }} />
              <span className="text-sm font-bold text-text">Escrow Balances</span>
              <span className="text-2xs font-mono px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'var(--gold)' }}
              >
                {escrows.length} mentors · ${totalEscrow.toFixed(2)}
              </span>
              {warnings.length > 0 && (
                <span className="text-2xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.25)', color: 'var(--danger)' }}
                >
                  {warnings.length} expiring soon
                </span>
              )}
            </div>
            <ChevronDown size={14} style={{ color: 'var(--muted)', transform: showEscrow ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
          </button>

          {showEscrow && (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {escrows.map(escrow => {
                const isReleasing = releasingId === escrow.mentor_id
                const canRelease  = escrow.mentor.verified && !!escrow.mentor.stripe_connect_id && escrow.total_accrued > 0
                const warning     = warningByMentor.get(escrow.mentor_id)

                return (
                  <div key={escrow.id}
                    className="flex items-center justify-between px-5 py-3.5"
                    style={warning ? { background: 'rgba(255,77,106,0.02)' } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.12)' }}
                      >
                        {escrow.mentor.avatar_emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-text">{escrow.mentor.display_name}</p>
                          {warning && (
                            <span className="text-2xs font-mono px-1.5 py-px rounded flex items-center gap-1"
                              style={{
                                background: warning.days_until_expiry <= 14 ? 'rgba(255,77,106,0.12)' : 'rgba(251,191,36,0.1)',
                                border:     `1px solid ${warning.days_until_expiry <= 14 ? 'rgba(255,77,106,0.3)' : 'rgba(251,191,36,0.25)'}`,
                                color:      warning.days_until_expiry <= 14 ? 'var(--danger)' : 'var(--gold)',
                              }}
                            >
                              <Clock size={9} />
                              {warning.days_until_expiry}d until expiry
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-2xs font-mono text-muted">@{escrow.mentor.handle}</span>
                          <span className="text-2xs font-mono px-1 py-px rounded"
                            style={{
                              background: escrow.mentor.verified ? 'rgba(0,229,176,0.08)' : 'rgba(251,191,36,0.08)',
                              color:      escrow.mentor.verified ? 'var(--accent)' : 'var(--gold)',
                              border:     `1px solid ${escrow.mentor.verified ? 'rgba(0,229,176,0.2)' : 'rgba(251,191,36,0.2)'}`,
                            }}
                          >
                            {escrow.mentor.onboarding_status.replace('_', ' ')}
                          </span>
                          {!escrow.mentor.stripe_connect_id && (
                            <span className="text-2xs font-mono text-muted">No Stripe</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold font-mono" style={{ color: 'var(--gold)' }}>
                        ${escrow.total_accrued.toFixed(2)}
                      </p>
                      {canRelease ? (
                        <button type="button"
                          onClick={() => releaseEscrow(escrow.mentor_id)}
                          disabled={isReleasing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                          style={{
                            background: isReleasing ? 'var(--surface)' : 'rgba(0,229,176,0.12)',
                            border:     '1px solid rgba(0,229,176,0.3)',
                            color:      isReleasing ? 'var(--muted)' : 'var(--accent)',
                            cursor:     isReleasing ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isReleasing && <Loader2 size={11} className="animate-spin" />}
                          Release
                        </button>
                      ) : (
                        <span className="text-2xs font-mono text-muted">
                          {!escrow.mentor.verified ? 'Unverified' : 'No Stripe'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Payouts table ──────────────────────────────────────────────── */}
      <div>
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {(['all', 'pending', 'processing', 'paid', 'accrued', 'failed'] as const).map(s => {
            const meta   = s !== 'all' ? STATUS_META[s] : null
            const count  = s === 'all' ? payouts.length : payouts.filter(p => p.status === s).length
            const active = filter === s
            return (
              <button key={s} type="button" onClick={() => setFilter(s)}
                className="text-xs font-mono px-3 py-1.5 rounded-lg transition-all"
                style={active ? {
                  background: meta ? `${meta.color}18` : 'rgba(255,255,255,0.08)',
                  color:       meta ? meta.color : 'var(--text)',
                  border:      `1px solid ${meta ? `${meta.color}40` : 'rgba(255,255,255,0.12)'}`,
                  cursor:      'pointer',
                } : {
                  background: 'var(--surface)', color: 'var(--dim)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                {s === 'all' ? 'All' : STATUS_META[s].label} ({count})
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl px-6 py-12 text-center"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm text-muted">No payout records. Use &quot;Calculate Payouts&quot; to generate them.</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            {/* Header row */}
            <div className="grid gap-3 px-5 py-3 text-2xs font-mono text-muted"
              style={{ gridTemplateColumns: '2.5rem 1fr 8rem 7rem 7rem 8rem 8rem 8rem', borderBottom: '1px solid var(--border)' }}
            >
              <span />
              <span>Mentor</span>
              <span>Period</span>
              <span>Pro Share</span>
              <span>Direct</span>
              <span>Total</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {filtered.map(p => {
              const meta       = STATUS_META[p.status]
              const isUpdating = updatingId === p.id
              const periodStr  = new Date(p.period_start).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
              const NEXT_STATUS: Partial<Record<PayoutStatus, PayoutStatus>> = {
                pending:    'processing',
                processing: 'paid',
                failed:     'pending',
              }
              const nextStatus = NEXT_STATUS[p.status]

              return (
                <div key={p.id}
                  className="grid gap-3 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors"
                  style={{ gridTemplateColumns: '2.5rem 1fr 8rem 7rem 7rem 8rem 8rem 8rem', borderBottom: '1px solid rgba(26,40,69,0.5)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.12)' }}
                  >
                    {p.mentor.avatar_emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text truncate">{p.mentor.display_name}</p>
                    <p className="text-2xs font-mono text-muted">@{p.mentor.handle}</p>
                  </div>
                  <p className="text-xs font-mono text-muted">{periodStr}</p>
                  <p className="text-sm font-mono text-dim">${p.pro_share_amount.toFixed(2)}</p>
                  <p className="text-sm font-mono text-dim">${p.direct_amount.toFixed(2)}</p>
                  <p className="text-sm font-bold font-mono text-text">${p.total_amount.toFixed(2)}</p>
                  <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded w-fit"
                    style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}35`, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <div>
                    {nextStatus && (
                      <button type="button"
                        onClick={() => updateStatus(p.id, nextStatus)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 text-2xs font-mono px-2 py-1 rounded-lg"
                        style={{
                          background: isUpdating ? 'var(--surface)' : `${STATUS_META[nextStatus].color}15`,
                          border:     `1px solid ${STATUS_META[nextStatus].color}35`,
                          color:      isUpdating ? 'var(--muted)' : STATUS_META[nextStatus].color,
                          cursor:     isUpdating ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isUpdating && <Loader2 size={9} className="animate-spin" />}
                        → {STATUS_META[nextStatus].label}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCalc && (
        <CalculateModal
          onConfirm={handleCalculate}
          onClose={() => setShowCalc(false)}
          loading={calcLoading}
        />
      )}
      {showExpire && (
        <ExpireConfirmModal
          onConfirm={handleExpireEscrow}
          onClose={() => setShowExpire(false)}
          loading={expireLoading}
          warnings={warnings}
        />
      )}
    </div>
  )
}
