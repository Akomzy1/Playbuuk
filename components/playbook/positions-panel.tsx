'use client'

// components/playbook/positions-panel.tsx
// "Your Positions" — live open positions for the selected account,
// filtered to the current pair from the market store.
//
// Polls /api/trade/positions?accountId=<id> every 10 seconds.
// Uses PositionCard for each position.
// Empty state when no positions match the current pair.
// Renders null when no account is selected or no positions at all.

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion }  from 'framer-motion'
import { TrendingUp, TrendingDown, RotateCcw } from 'lucide-react'
import { useTradeStore }   from '@/stores/trade-store'
import { useMarketStore }  from '@/stores/market-store'
import { PositionCard }    from '@/components/trade/position-card'
import type { Position }   from '@/lib/metaapi/positions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PositionsPanelProps {
  /** Whether to filter positions to currentPair from market store */
  filterToPair?: boolean
}

// ─── PositionsPanel ───────────────────────────────────────────────────────────

export function PositionsPanel({ filterToPair = true }: PositionsPanelProps) {
  const selectedAccountId = useTradeStore(s => s.selectedAccountId)
  const currentPair       = useMarketStore(s => s.currentPair)

  const [positions,  setPositions]  = useState<Position[]>([])
  const [loading,    setLoading]    = useState(false)
  const [closingId,  setClosingId]  = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch positions ────────────────────────────────────────────────────────

  const fetchPositions = useCallback(async (accountId: string) => {
    try {
      const res  = await fetch(`/api/trade/positions?accountId=${accountId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { positions: Position[] }
      setPositions(data.positions)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions')
    }
  }, [])

  // On account change — fetch immediately then poll every 10s
  useEffect(() => {
    if (!selectedAccountId) {
      setPositions([])
      return
    }

    setLoading(true)
    fetchPositions(selectedAccountId).finally(() => setLoading(false))

    intervalRef.current = setInterval(() => {
      fetchPositions(selectedAccountId)
    }, 10_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [selectedAccountId, fetchPositions])

  // ── Close position ─────────────────────────────────────────────────────────

  const handleClose = useCallback(async (positionId: string) => {
    if (!selectedAccountId) return
    setClosingId(positionId)
    try {
      const res = await fetch('/api/trade/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, positionId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      // Optimistically remove then re-fetch
      setPositions(prev => prev.filter(p => p.id !== positionId))
      setTimeout(() => fetchPositions(selectedAccountId), 2_000)
    } catch (err) {
      console.error('[positions-panel] Close error:', err)
    } finally {
      setClosingId(null)
    }
  }, [selectedAccountId, fetchPositions])

  // ── Filtered positions ─────────────────────────────────────────────────────

  const visible = filterToPair
    ? positions.filter(p => p.symbol.toUpperCase() === currentPair.toUpperCase())
    : positions

  // Don't render the panel at all until we've fetched at least once
  if (!selectedAccountId) return null
  if (!loading && positions.length === 0 && !error) return null

  // ── Aggregate P&L ──────────────────────────────────────────────────────────

  const totalPnl = visible.reduce((sum, p) => sum + p.profit, 0)
  const buys     = visible.filter(p => p.type === 'buy').length
  const sells    = visible.filter(p => p.type === 'sell').length

  return (
    <section aria-label="Your open positions">
      {/* ── Panel header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold font-mono text-dim" style={{ letterSpacing: '0.06em' }}>
            YOUR POSITIONS
          </h3>
          {filterToPair && (
            <span
              className="text-2xs font-mono px-2 py-0.5 rounded"
              style={{
                background: 'var(--surface)',
                border:     '1px solid var(--border)',
                color:      'var(--muted)',
              }}
            >
              {currentPair}
            </span>
          )}
          {loading && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
              aria-label="Loading positions"
            >
              <RotateCcw size={11} style={{ color: 'var(--muted)' }} />
            </motion.div>
          )}
        </div>

        {/* Aggregate stats */}
        {visible.length > 0 && (
          <div className="flex items-center gap-3">
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
            <span
              className="text-xs font-bold font-mono tabular-nums"
              style={{ color: totalPnl >= 0 ? 'var(--accent)' : 'var(--danger)' }}
            >
              {totalPnl >= 0 ? '+' : ''}
              {totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="rounded-xl px-3 py-2.5 mb-3 text-xs font-mono"
          style={{
            background: 'rgba(255,77,106,0.05)',
            border:     '1px solid rgba(255,77,106,0.15)',
            color:      'var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Position cards ────────────────────────────────────────────────── */}
      <AnimatePresence mode="popLayout">
        {visible.map(pos => (
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
              onClose={handleClose}
              closing={closingId === pos.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* No positions for this pair (but others exist) */}
      {!loading && filterToPair && positions.length > 0 && visible.length === 0 && (
        <p className="text-2xs font-mono text-muted text-center py-2">
          No open positions on {currentPair}
        </p>
      )}
    </section>
  )
}
