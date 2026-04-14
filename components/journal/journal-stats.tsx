'use client'

// components/journal/journal-stats.tsx
// Summary stat strip at the top of the journal.
// Shows total trades, win rate, avg R, total P&L — with this-month vs last-month deltas.

import { useMemo }   from 'react'
import { motion }    from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { JournalEntryData } from './journal-entry'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalStatsProps {
  entries: JournalEntryData[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoMonth(iso: string): string {
  return iso.slice(0, 7)   // "2025-04"
}

function computeSlice(entries: JournalEntryData[]) {
  const closed = entries.filter(e => e.outcome !== 'pending')
  const wins   = entries.filter(e => e.outcome === 'win')
  const losses = entries.filter(e => e.outcome === 'loss')

  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : null

  const pnlEntries = entries.filter(e => e.pnl_r !== null)
  const totalPnl   = pnlEntries.reduce((a, e) => a + (e.pnl_r ?? 0), 0)
  const avgR       = pnlEntries.length > 0 ? totalPnl / pnlEntries.length : null

  return { total: entries.length, winRate, totalPnl, avgR, wins: wins.length, losses: losses.length }
}

type Delta = { value: number; positive: boolean } | null

function delta(curr: number | null, prev: number | null): Delta {
  if (curr === null || prev === null) return null
  const d = curr - prev
  if (Math.abs(d) < 0.5) return null
  return { value: d, positive: d > 0 }
}

// ─── Delta pill ───────────────────────────────────────────────────────────────

function DeltaPill({ d, invert = false }: { d: Delta; invert?: boolean }) {
  if (!d) return <span style={{ fontSize: 11, color: 'var(--muted)' }}>vs last mo.</span>

  const good   = invert ? !d.positive : d.positive
  const colour = good ? '#00e5b0' : '#ff4d6a'
  const Icon   = d.positive ? TrendingUp : TrendingDown

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          3,
      fontSize:     11,
      fontWeight:   700,
      color:        colour,
      background:   `${colour}18`,
      border:       `1px solid ${colour}33`,
      borderRadius: 20,
      padding:      '2px 8px',
      fontFamily:   '"IBM Plex Mono", monospace',
    }}>
      <Icon size={10} />
      {d.positive ? '+' : ''}{d.value.toFixed(1)}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, colour, delta: d, invertDelta = false,
}: {
  label:        string
  value:        string
  sub?:         string
  colour?:      string
  delta?:       Delta
  invertDelta?: boolean
}) {
  return (
    <div style={{
      background:   'var(--card)',
      border:       '1px solid var(--border)',
      borderRadius: 10,
      padding:      '14px 18px',
      display:      'flex',
      flexDirection: 'column',
      gap:          4,
    }}>
      <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
        {label}
      </div>

      <div style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize:   24,
        fontWeight: 800,
        color:      colour ?? 'var(--text)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        {sub && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</span>}
        {d !== undefined && <DeltaPill d={d} invert={invertDelta} />}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JournalStats({ entries }: JournalStatsProps) {
  const { curr, prev } = useMemo(() => {
    const now      = new Date()
    const thisMonth = isoMonth(now.toISOString())
    const lastDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = isoMonth(lastDate.toISOString())

    return {
      curr: computeSlice(entries.filter(e => isoMonth(e.created_at) === thisMonth)),
      prev: computeSlice(entries.filter(e => isoMonth(e.created_at) === lastMonth)),
    }
  }, [entries])

  const all = useMemo(() => computeSlice(entries), [entries])

  if (all.total === 0) return null

  const wrDelta  = delta(curr.winRate, prev.winRate)
  const pnlDelta = delta(curr.totalPnl, prev.totalPnl)
  const avgDelta = delta(curr.avgR, prev.avgR)

  const winColour = all.winRate === null ? 'var(--text)'
    : all.winRate >= 55 ? '#00e5b0'
    : all.winRate >= 42 ? '#fbbf24'
    : '#ff4d6a'

  const pnlColour = all.totalPnl > 0 ? '#00e5b0' : all.totalPnl < 0 ? '#ff4d6a' : 'var(--dim)'
  const avgColour = all.avgR === null ? 'var(--text)'
    : all.avgR > 0 ? '#00e5b0' : all.avgR < 0 ? '#ff4d6a' : 'var(--dim)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap:                 10,
      }}
    >
      <StatCard
        label="Win Rate"
        value={all.winRate !== null ? `${all.winRate.toFixed(0)}%` : '—'}
        sub={`${all.wins}W · ${all.losses}L · ${all.total} trades`}
        colour={winColour}
        delta={wrDelta}
      />

      <StatCard
        label="Total P&L"
        value={all.totalPnl !== 0
          ? `${all.totalPnl > 0 ? '+' : ''}${all.totalPnl.toFixed(2)}R`
          : '—'}
        sub="lifetime"
        colour={pnlColour}
        delta={pnlDelta}
      />

      <StatCard
        label="Avg R / Trade"
        value={all.avgR !== null ? `${all.avgR > 0 ? '+' : ''}${all.avgR.toFixed(2)}R` : '—'}
        sub="closed trades"
        colour={avgColour}
        delta={avgDelta}
      />

      <StatCard
        label="This Month"
        value={curr.total > 0 ? `${curr.total}` : '—'}
        sub={curr.winRate !== null ? `${curr.winRate.toFixed(0)}% WR` : 'no closed trades'}
        colour={curr.winRate !== null
          ? curr.winRate >= 55 ? '#00e5b0' : curr.winRate >= 42 ? '#fbbf24' : '#ff4d6a'
          : 'var(--text)'}
        delta={delta(curr.total, prev.total)}
      />
    </motion.div>
  )
}
