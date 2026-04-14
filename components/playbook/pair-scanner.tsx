'use client'

// components/playbook/pair-scanner.tsx
// Pair selector strip for the playbook viewer.
//
// Shows every preferred pair for the current playbook as a clickable chip.
// Clicking switches the market engine's active pair, which propagates to
// the candlestick chart, live checklist, and setup grade automatically
// (they all read from useMarketStore).
//
// Grade shown per chip = calculateGrade(checklist, analysis, {})
// — all manual items treated as unchecked so it shows the "auto baseline":
//   how many market conditions are currently met for that pair.
//
// Layout:
//   mobile  → single-row horizontal scroll (no scrollbar visible)
//   desktop → auto-wrapping row of chips

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useMarketStore } from '@/stores/market-store'
import { calculateGrade, type Grade } from '@/lib/playbook/grader'
import type { ChecklistItem } from '@/lib/supabase/types'

// ─── Grade badge config ───────────────────────────────────────────────────────

const GRADE_STYLE: Record<
  Grade,
  { color: string; bg: string; border: string; activeBorder: string; glow: string }
> = {
  'A+': {
    color:        'var(--gold)',
    bg:           'rgba(251,191,36,0.10)',
    border:       'rgba(251,191,36,0.25)',
    activeBorder: 'rgba(251,191,36,0.55)',
    glow:         '0 0 20px rgba(251,191,36,0.18)',
  },
  'B+': {
    color:        'var(--accent)',
    bg:           'rgba(0,229,176,0.09)',
    border:       'rgba(0,229,176,0.25)',
    activeBorder: 'rgba(0,229,176,0.55)',
    glow:         '0 0 20px rgba(0,229,176,0.15)',
  },
  'C+': {
    color:        'var(--info)',
    bg:           'rgba(77,142,255,0.09)',
    border:       'rgba(77,142,255,0.25)',
    activeBorder: 'rgba(77,142,255,0.55)',
    glow:         '0 0 20px rgba(77,142,255,0.15)',
  },
  'D+': {
    color:        'var(--danger)',
    bg:           'rgba(255,77,106,0.07)',
    border:       'rgba(255,77,106,0.2)',
    activeBorder: 'rgba(255,77,106,0.45)',
    glow:         'none',
  },
}

// ─── Price formatter ──────────────────────────────────────────────────────────

function formatPrice(pair: string, price: number): string {
  if (price === 0) return '—'
  const isJpy = pair.toUpperCase().includes('JPY')
  return price.toFixed(isJpy ? 3 : 5)
}

// ─── PairChip ─────────────────────────────────────────────────────────────────

interface PairChipProps {
  pair:      string
  price:     number
  grade:     Grade
  pct:       number
  isActive:  boolean
  onClick:   () => void
}

function PairChip({ pair, price, grade, pct, isActive, onClick }: PairChipProps) {
  const gs = GRADE_STYLE[grade]

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`${pair} — grade ${grade} (${pct}%)`}
      className="flex-shrink-0 flex flex-col gap-1 px-3 py-2.5 rounded-xl text-left transition-colors duration-200"
      style={{
        background:  isActive ? gs.bg             : 'var(--card)',
        border:      `1px solid ${isActive ? gs.activeBorder : 'var(--border)'}`,
        boxShadow:   isActive ? gs.glow           : 'none',
        minWidth:    '108px',
        cursor:      'pointer',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
    >
      {/* Pair name */}
      <span
        className="text-xs font-bold font-mono tracking-wide leading-none"
        style={{ color: isActive ? 'var(--text)' : 'var(--dim)' }}
      >
        {pair}
      </span>

      {/* Live price */}
      <span
        className="text-2xs font-mono leading-none tabular-nums"
        style={{ color: price === 0 ? 'var(--muted)' : 'var(--dim)' }}
      >
        {formatPrice(pair, price)}
      </span>

      {/* Grade badge + percentage */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <span
          className="text-2xs font-bold font-mono px-1.5 py-0.5 rounded leading-none"
          style={{
            background: gs.bg,
            border:     `1px solid ${gs.border}`,
            color:      gs.color,
          }}
        >
          {grade}
        </span>
        <span className="text-2xs font-mono tabular-nums" style={{ color: 'var(--muted)' }}>
          {pct}%
        </span>
      </div>
    </motion.button>
  )
}

// ─── PairScanner ──────────────────────────────────────────────────────────────

interface PairScannerProps {
  /** Preferred pairs from the playbook — shown as selectable chips */
  pairs:     string[]
  /** The playbook's checklist — used to compute per-pair baseline grade */
  checklist: ChecklistItem[]
}

export function PairScanner({ pairs, checklist }: PairScannerProps) {
  const pairStates  = useMarketStore(s => s.pairs)
  const currentPair = useMarketStore(s => s.currentPair)
  const addPair     = useMarketStore(s => s.addPair)
  const setPair     = useMarketStore(s => s.setPair)

  // Register all preferred pairs with the market engine on mount.
  // The engine will start tracking + ticking them alongside the current pair.
  const pairsKey = pairs.join(',')
  useEffect(() => {
    for (const pair of pairs) {
      addPair(pair)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey])

  // Compute per-pair baseline grade from live analysis.
  // manualState = {} means all manual items treated as unchecked —
  // this shows "market conditions only", not the full trader-confirmed grade.
  const gradePerPair = useMemo<Record<string, { grade: Grade; pct: number }>>(() => {
    const out: Record<string, { grade: Grade; pct: number }> = {}
    for (const pair of pairs) {
      const state = pairStates[pair]
      if (!state || state.price === 0 || checklist.length === 0) {
        out[pair] = { grade: 'D+', pct: 0 }
        continue
      }
      const result = calculateGrade(checklist, state.analysis, {})
      out[pair] = { grade: result.grade, pct: result.percentage }
    }
    return out
  // pairStates reference changes every tick — recalculate on each tick
  }, [pairStates, pairs, checklist])

  if (pairs.length === 0) return null

  // Count pairs above D+ to show in header
  const liveCount = Object.values(gradePerPair).filter(g => g.grade !== 'D+').length

  return (
    <section aria-labelledby="pair-scanner-heading">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {/* Live pulse */}
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: 'var(--accent)' }}
              aria-hidden="true"
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: 'var(--accent)' }}
              aria-hidden="true"
            />
          </span>
          <h3
            id="pair-scanner-heading"
            className="text-xs font-semibold text-dim font-mono tracking-wide uppercase"
          >
            Pairs
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-2xs">
          {liveCount > 0 && (
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(0,229,176,0.08)',
                border:     '1px solid rgba(0,229,176,0.2)',
                color:      'var(--accent)',
              }}
            >
              {liveCount}/{pairs.length} active
            </span>
          )}
          <span style={{ color: 'var(--muted)' }}>{pairs.length} pairs</span>
        </div>
      </div>

      {/* Chips — horizontal scroll on mobile, wrap on ≥md */}
      <div
        className="flex gap-2 overflow-x-auto flex-nowrap md:flex-wrap md:overflow-x-visible pb-0.5"
        role="list"
        aria-label="Select trading pair"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pairs.map(pair => {
          const { grade, pct } = gradePerPair[pair] ?? { grade: 'D+' as Grade, pct: 0 }
          const state          = pairStates[pair]
          return (
            <div key={pair} role="listitem">
              <PairChip
                pair={pair}
                price={state?.price ?? 0}
                grade={grade}
                pct={pct}
                isActive={pair === currentPair}
                onClick={() => setPair(pair)}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
