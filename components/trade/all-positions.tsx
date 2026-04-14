'use client'

// components/trade/all-positions.tsx
// Aggregated open positions view for the /accounts page.
// Shows all open positions across every connected account, grouped by account.
// Polls each account every 10 seconds (staggered by 1s to avoid burst).

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, RotateCcw, AlertCircle,
} from 'lucide-react'
import { PositionCard }    from '@/components/trade/position-card'
import type { Position }   from '@/lib/metaapi/positions'
import type { TradingAccountFull } from '@/app/(platform)/accounts/page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountPositions {
  account:   TradingAccountFull
  positions: Position[]
  loading:   boolean
  error:     string | null
}

interface AllPositionsProps {
  accounts: TradingAccountFull[]
}

// ─── AllPositions ─────────────────────────────────────────────────────────────

export function AllPositions({ accounts }: AllPositionsProps) {
  const [accountPositions, setAccountPositions] = useState<AccountPositions[]>(
    accounts.map(a => ({ account: a, positions: [], loading: true, error: null })),
  )
  const [closingId, setClosingId] = useState<string | null>(null)
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

  // ── Fetch for one account ──────────────────────────────────────────────────

  const fetchForAccount = useCallback(async (accountId: string) => {
    try {
      const res  = await fetch(`/api/trade/positions?accountId=${accountId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { positions: Position[] }
      setAccountPositions(prev =>
        prev.map(ap =>
          ap.account.id === accountId
            ? { ...ap, positions: data.positions, loading: false, error: null }
            : ap,
        ),
      )
    } catch (err) {
      setAccountPositions(prev =>
        prev.map(ap =>
          ap.account.id === accountId
            ? { ...ap, loading: false, error: err instanceof Error ? err.message : 'Failed' }
            : ap,
        ),
      )
    }
  }, [])

  // ── Start polling on mount ─────────────────────────────────────────────────

  useEffect(() => {
    // Stagger initial fetches by 1s per account to avoid a request burst
    accounts.forEach((account, i) => {
      const timeout = setTimeout(() => {
        fetchForAccount(account.id)
        const interval = setInterval(() => fetchForAccount(account.id), 10_000)
        intervalsRef.current.push(interval)
      }, i * 1_000)
      intervalsRef.current.push(timeout as unknown as ReturnType<typeof setInterval>)
    })

    return () => { intervalsRef.current.forEach(clearInterval) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close a position ──────────────────────────────────────────────────────

  const handleClose = useCallback(async (accountId: string, positionId: string) => {
    setClosingId(positionId)
    try {
      const res = await fetch('/api/trade/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, positionId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      // Optimistic remove
      setAccountPositions(prev =>
        prev.map(ap =>
          ap.account.id === accountId
            ? { ...ap, positions: ap.positions.filter(p => p.id !== positionId) }
            : ap,
        ),
      )
      setTimeout(() => fetchForAccount(accountId), 2_000)
    } catch (err) {
      console.error('[all-positions] Close error:', err)
    } finally {
      setClosingId(null)
    }
  }, [fetchForAccount])

  // ── Derived state ──────────────────────────────────────────────────────────

  const totalPositions = accountPositions.reduce((sum, ap) => sum + ap.positions.length, 0)
  const anyLoading     = accountPositions.some(ap => ap.loading)
  const totalPnl       = accountPositions.reduce(
    (sum, ap) => sum + ap.positions.reduce((s, p) => s + p.profit, 0),
    0,
  )

  if (totalPositions === 0 && !anyLoading) return null

  return (
    <section aria-label="All open positions" className="mt-8">
      {/* ── Section header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2
            className="text-base font-bold text-text"
            style={{ letterSpacing: '-0.02em' }}
          >
            Open Positions
          </h2>
          {anyLoading && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
              aria-label="Refreshing positions"
            >
              <RotateCcw size={13} style={{ color: 'var(--muted)' }} />
            </motion.div>
          )}
          {totalPositions > 0 && (
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{
                background: 'var(--surface)',
                border:     '1px solid var(--border)',
                color:      'var(--dim)',
              }}
            >
              {totalPositions} open
            </span>
          )}
        </div>

        {/* Total P&L across all accounts */}
        {totalPositions > 0 && (
          <span
            className="text-sm font-bold font-mono tabular-nums"
            style={{ color: totalPnl >= 0 ? 'var(--accent)' : 'var(--danger)' }}
          >
            {totalPnl >= 0 ? '+' : ''}
            {totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* ── Per-account position groups ─────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {accountPositions.map(({ account, positions, loading, error }) => {
          if (!loading && positions.length === 0 && !error) return null

          const accountPnl  = positions.reduce((sum, p) => sum + p.profit, 0)
          const buys        = positions.filter(p => p.type === 'buy').length
          const sells       = positions.filter(p => p.type === 'sell').length

          return (
            <div key={account.id}>
              {/* Account label row */}
              <div
                className="flex items-center justify-between rounded-xl px-3 py-2 mb-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: account.account_type === 'demo'
                        ? 'rgba(77,142,255,0.1)'
                        : 'rgba(251,146,60,0.08)',
                      border: account.account_type === 'demo'
                        ? '1px solid rgba(77,142,255,0.25)'
                        : '1px solid rgba(251,146,60,0.25)',
                      color: account.account_type === 'demo'
                        ? 'var(--info)'
                        : 'var(--warning)',
                    }}
                  >
                    {account.account_type.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-text">
                    {account.broker_name}
                  </span>
                  <span className="text-2xs font-mono text-muted">
                    #{account.account_number}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Buy/sell counts */}
                  {buys > 0 && (
                    <span className="flex items-center gap-1 text-2xs font-mono" style={{ color: 'var(--info)' }}>
                      <TrendingUp size={10} aria-hidden="true" />
                      {buys}
                    </span>
                  )}
                  {sells > 0 && (
                    <span className="flex items-center gap-1 text-2xs font-mono" style={{ color: 'var(--danger)' }}>
                      <TrendingDown size={10} aria-hidden="true" />
                      {sells}
                    </span>
                  )}
                  {/* Account P&L */}
                  {positions.length > 0 && (
                    <span
                      className="text-xs font-bold font-mono tabular-nums"
                      style={{ color: accountPnl >= 0 ? 'var(--accent)' : 'var(--danger)' }}
                    >
                      {accountPnl >= 0 ? '+' : ''}
                      {accountPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {/* Per-account spinner */}
                  {loading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      style={{ display: 'inline-flex' }}
                    >
                      <RotateCcw size={11} style={{ color: 'var(--muted)' }} />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2 text-xs font-mono"
                  style={{
                    background: 'rgba(255,77,106,0.05)',
                    border:     '1px solid rgba(255,77,106,0.15)',
                    color:      'var(--danger)',
                  }}
                >
                  <AlertCircle size={13} aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* Position cards */}
              <AnimatePresence mode="popLayout">
                {positions.map(pos => (
                  <motion.div
                    key={pos.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{   opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.18 }}
                    className="mb-2 last:mb-0"
                  >
                    <PositionCard
                      position={pos}
                      onClose={posId => handleClose(account.id, posId)}
                      closing={closingId === pos.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
