'use client'

// components/trade/position-card.tsx
// Live open position card — P&L updates every tick from the market store.
//
// Shows:
//   · Pair + direction badge (BUY/SELL)
//   · Open price vs current price
//   · Volume (lots)
//   · SL / TP if set
//   · Unrealised P&L — green positive, red negative
//   · Distance to SL/TP in pips
//   · Close button (calls onClose prop, which routes to /api/trade/close)

import { useMemo }       from 'react'
import { motion }        from 'framer-motion'
import { TrendingUp, TrendingDown, X, Target, ShieldAlert } from 'lucide-react'
import { useMarketStore } from '@/stores/market-store'
import type { Position }  from '@/lib/metaapi/positions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PositionCardProps {
  position:   Position
  onClose?:   (positionId: string) => void
  closing?:   boolean  // shows spinner on close button while API call in flight
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pipsDistance(from: number, to: number, symbol: string): number {
  const isJpy = symbol.toUpperCase().includes('JPY')
  const pipSize = isJpy ? 0.01 : 0.0001
  return Math.abs(from - to) / pipSize
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── PositionCard ─────────────────────────────────────────────────────────────

export function PositionCard({ position, onClose, closing = false }: PositionCardProps) {
  const pairStates = useMarketStore(s => s.pairs)

  // Use live price from market store if available, else fall back to position's stored price
  const livePrice = useMemo(() => {
    const state = pairStates[position.symbol]
    return (state && state.price > 0) ? state.price : position.currentPrice
  }, [pairStates, position.symbol, position.currentPrice])

  const isBuy     = position.type === 'buy'
  const pnlColor  = position.profit >= 0 ? 'var(--accent)' : 'var(--danger)'
  const pnlBg     = position.profit >= 0 ? 'rgba(0,229,176,0.06)' : 'rgba(255,77,106,0.06)'
  const pnlBorder = position.profit >= 0 ? 'rgba(0,229,176,0.15)' : 'rgba(255,77,106,0.15)'

  const slPips = position.stopLoss  ? pipsDistance(livePrice, position.stopLoss,  position.symbol) : null
  const tpPips = position.takeProfit ? pipsDistance(livePrice, position.takeProfit, position.symbol) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{   opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--card)',
        border:     `1px solid ${isBuy ? 'rgba(77,142,255,0.2)' : 'rgba(255,77,106,0.2)'}`,
        borderTop:  `2px solid ${isBuy ? 'rgba(77,142,255,0.4)' : 'rgba(255,77,106,0.4)'}`,
      }}
    >
      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          {/* Direction badge */}
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-mono font-bold"
            style={isBuy ? {
              background: 'rgba(77,142,255,0.12)',
              border:     '1px solid rgba(77,142,255,0.3)',
              color:      'var(--info)',
            } : {
              background: 'rgba(255,77,106,0.1)',
              border:     '1px solid rgba(255,77,106,0.25)',
              color:      'var(--danger)',
            }}
          >
            {isBuy
              ? <TrendingUp  size={9} aria-hidden="true" />
              : <TrendingDown size={9} aria-hidden="true" />
            }
            {position.type.toUpperCase()}
          </span>

          {/* Pair */}
          <span
            className="text-xs font-bold font-mono text-text"
            style={{ letterSpacing: '0.02em' }}
          >
            {position.symbol}
          </span>

          {/* Volume */}
          <span className="text-2xs font-mono text-muted">
            {position.volume.toFixed(2)} lots
          </span>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            type="button"
            onClick={() => onClose(position.id)}
            disabled={closing}
            aria-label={`Close ${position.symbol} position`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-mono font-semibold transition-all duration-150"
            style={{
              background: closing ? 'var(--surface)' : 'rgba(255,77,106,0.08)',
              border:     '1px solid rgba(255,77,106,0.2)',
              color:      closing ? 'var(--muted)' : 'var(--danger)',
              cursor:     closing ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => {
              if (!closing) {
                e.currentTarget.style.background = 'rgba(255,77,106,0.15)'
                e.currentTarget.style.borderColor = 'rgba(255,77,106,0.4)'
              }
            }}
            onMouseLeave={e => {
              if (!closing) {
                e.currentTarget.style.background = 'rgba(255,77,106,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,77,106,0.2)'
              }
            }}
          >
            <X size={10} aria-hidden="true" />
            Close
          </button>
        )}
      </div>

      {/* ── Price row ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="text-2xs font-mono text-muted">OPEN</p>
            <p className="text-xs font-mono font-semibold text-dim tabular-nums">
              {position.openPrice.toFixed(position.symbol.toUpperCase().includes('JPY') ? 3 : 5)}
            </p>
          </div>
          <div
            className="w-px h-5"
            style={{ background: 'var(--border)' }}
            aria-hidden="true"
          />
          <div>
            <p className="text-2xs font-mono text-muted">NOW</p>
            <p
              className="text-xs font-mono font-semibold tabular-nums"
              style={{ color: 'var(--text)' }}
            >
              {livePrice.toFixed(position.symbol.toUpperCase().includes('JPY') ? 3 : 5)}
            </p>
          </div>
        </div>

        {/* P&L */}
        <div
          className="px-2.5 py-1 rounded-lg"
          style={{ background: pnlBg, border: `1px solid ${pnlBorder}` }}
        >
          <p
            className="text-sm font-bold font-mono tabular-nums"
            style={{ color: pnlColor, letterSpacing: '-0.01em' }}
            aria-label={`Unrealised P&L: ${formatPnl(position.profit)}`}
          >
            {formatPnl(position.profit)}
          </p>
        </div>
      </div>

      {/* ── SL / TP row ──────────────────────────────────────────────────── */}
      {(position.stopLoss || position.takeProfit) && (
        <div
          className="flex items-center gap-4 px-3 py-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {position.stopLoss && (
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={10} style={{ color: 'var(--danger)' }} aria-hidden="true" />
              <span className="text-2xs font-mono text-muted">SL</span>
              <span className="text-2xs font-mono text-dim tabular-nums">
                {position.stopLoss.toFixed(position.symbol.toUpperCase().includes('JPY') ? 3 : 5)}
              </span>
              {slPips !== null && (
                <span className="text-2xs font-mono text-muted">
                  ({slPips.toFixed(0)}p)
                </span>
              )}
            </div>
          )}

          {position.takeProfit && (
            <div className="flex items-center gap-1.5">
              <Target size={10} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <span className="text-2xs font-mono text-muted">TP</span>
              <span className="text-2xs font-mono text-dim tabular-nums">
                {position.takeProfit.toFixed(position.symbol.toUpperCase().includes('JPY') ? 3 : 5)}
              </span>
              {tpPips !== null && (
                <span className="text-2xs font-mono text-muted">
                  ({tpPips.toFixed(0)}p)
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
