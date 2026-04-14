'use client'

// components/scanner/scanner-grid.tsx
// Client-side scanner grid — the live multi-mentor, multi-pair setup finder.
//
// Architecture:
//   1. On mount: register every unique pair across all scan entries with
//      the market store, then start the engine (idempotent if already running).
//   2. Every 2.5s: market store ticks → pairStates reference changes →
//      useMemo recalculates grades for all entries → React re-renders changed cards.
//   3. Sort: grade descending (A+ > B+ > C+ > D+), then by percentage within grade.
//   4. Filter: grade threshold, mentor, pair.
//
// ScanEntry is passed from the server page — it bundles everything needed
// to compute a grade for one mentor × pair combination.
//
// Psychology note:
//   This page answers one question: "Where is the best setup right now?"
//   Sort by grade descending makes the A+ setups jump to the top.
//   Traders should glance, pick the best grade, and execute.

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  SlidersHorizontal,
  X,
  Activity,
} from 'lucide-react'
import { useMarketStore } from '@/stores/market-store'
import { calculateGrade, type Grade } from '@/lib/playbook/grader'
import type { ChecklistItem } from '@/lib/supabase/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanEntry {
  mentorId:       string
  mentorName:     string
  mentorHandle:   string
  mentorEmoji:    string | null
  mentorVerified: boolean
  playbookId:     string
  strategyName:   string
  pair:           string
  checklist:      ChecklistItem[]
}

type MinGrade = 'all' | 'C+' | 'B+' | 'A+'

interface ScannerGridProps {
  entries: ScanEntry[]
}

// ─── Grade config ─────────────────────────────────────────────────────────────

const GRADE_STYLE: Record<
  Grade,
  { color: string; bg: string; border: string; leftBorder: string; glow: string; label: string }
> = {
  'A+': {
    color:       'var(--gold)',
    bg:          'rgba(251,191,36,0.08)',
    border:      'rgba(251,191,36,0.22)',
    leftBorder:  '#fbbf24',
    glow:        '0 0 32px rgba(251,191,36,0.12)',
    label:       'Optimal setup — all key criteria met',
  },
  'B+': {
    color:       'var(--accent)',
    bg:          'rgba(0,229,176,0.07)',
    border:      'rgba(0,229,176,0.2)',
    leftBorder:  '#00e5b0',
    glow:        '0 0 28px rgba(0,229,176,0.10)',
    label:       'Conditions met — minor items missing',
  },
  'C+': {
    color:       'var(--info)',
    bg:          'rgba(77,142,255,0.07)',
    border:      'rgba(77,142,255,0.2)',
    leftBorder:  '#4d8eff',
    glow:        'none',
    label:       'Borderline setup — your call',
  },
  'D+': {
    color:       'var(--danger)',
    bg:          'rgba(255,77,106,0.05)',
    border:      'rgba(255,77,106,0.15)',
    leftBorder:  'rgba(255,77,106,0.4)',
    glow:        'none',
    label:       'Below threshold — wait for better conditions',
  },
}

const GRADE_ORDER: Record<Grade, number> = { 'A+': 3, 'B+': 2, 'C+': 1, 'D+': 0 }

const MIN_GRADE_LABELS: Record<MinGrade, string> = {
  all:  'All grades',
  'C+': 'C+ and above',
  'B+': 'B+ and above',
  'A+': 'A+ only',
}

// ─── Price formatter ──────────────────────────────────────────────────────────

function formatPrice(pair: string, price: number): string {
  if (price === 0) return '—'
  return price.toFixed(pair.toUpperCase().includes('JPY') ? 3 : 5)
}

// ─── ScanCard ─────────────────────────────────────────────────────────────────

interface ScanCardProps {
  entry:     ScanEntry
  grade:     Grade
  pct:       number
  price:     number
  trend:     'bullish' | 'bearish' | 'ranging'
  bos:       boolean
  inAoi:     boolean
  session:   string | null
  killzone:  boolean
  idx:       number   // for stagger animation
}

function ScanCard({
  entry, grade, pct, price, trend,
  bos, inAoi, session, killzone, idx,
}: ScanCardProps) {
  const gs = GRADE_STYLE[grade]

  const TrendIcon =
    trend === 'bullish' ? TrendingUp :
    trend === 'bearish' ? TrendingDown :
    Minus

  const trendColor =
    trend === 'bullish' ? 'var(--accent)' :
    trend === 'bearish' ? 'var(--danger)' :
    'var(--dim)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(idx * 0.03, 0.3), duration: 0.22 }}
      layout
    >
      <Link
        href={`/mentor/${entry.mentorId}`}
        className="block group"
        aria-label={`${entry.mentorName} — ${entry.pair} — ${grade} setup`}
      >
        <article
          className="relative overflow-hidden rounded-2xl transition-all duration-200"
          style={{
            background:  'var(--card)',
            border:      `1px solid ${gs.border}`,
            borderLeft:  `3px solid ${gs.leftBorder}`,
          }}
          onMouseEnter={e => {
            if (grade !== 'D+') {
              e.currentTarget.style.boxShadow = gs.glow
              e.currentTarget.style.transform = 'translateY(-1px)'
            } else {
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.transform = ''
          }}
        >
          {/* Top row: mentor + grade */}
          <div
            className="flex items-center justify-between px-4 pt-3.5 pb-2.5"
            style={{ borderBottom: `1px solid ${gs.border}` }}
          >
            {/* Mentor info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{
                  background: 'var(--surface)',
                  border:     '1px solid var(--border)',
                }}
                aria-hidden="true"
              >
                {entry.mentorEmoji ?? '👤'}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-semibold text-text truncate"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {entry.mentorName}
                  </span>
                  {entry.mentorVerified && (
                    <span
                      className="flex-shrink-0 text-2xs font-mono px-1.5 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(0,229,176,0.08)',
                        border:     '1px solid rgba(0,229,176,0.22)',
                        color:      'var(--accent)',
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-2xs font-mono text-muted truncate">
                  {entry.strategyName}
                </p>
              </div>
            </div>

            {/* Grade badge */}
            <div className="flex flex-col items-end flex-shrink-0 ml-3">
              <span
                className="text-2xl font-bold font-mono leading-none tabular-nums"
                style={{ color: gs.color }}
                aria-label={`Grade ${grade}`}
              >
                {grade}
              </span>
              <span
                className="text-2xs font-mono tabular-nums mt-0.5"
                style={{ color: 'var(--muted)' }}
              >
                {pct}%
              </span>
            </div>
          </div>

          {/* Bottom row: pair + signals + price + arrow */}
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Pair name */}
              <span
                className="text-base font-bold font-mono flex-shrink-0"
                style={{ color: 'var(--text)' }}
              >
                {entry.pair}
              </span>

              {/* Quick signal flags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Trend */}
                <span
                  className="flex items-center gap-0.5 text-2xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border:     '1px solid var(--border)',
                    color:      trendColor,
                  }}
                >
                  <TrendIcon size={9} aria-hidden="true" />
                  {trend === 'ranging' ? 'RANGE' : trend.toUpperCase().slice(0, 4)}
                </span>

                {/* BOS */}
                {bos && (
                  <span
                    className="text-2xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(0,229,176,0.08)',
                      border:     '1px solid rgba(0,229,176,0.2)',
                      color:      'var(--accent)',
                    }}
                  >
                    BOS
                  </span>
                )}

                {/* In AOI */}
                {inAoi && (
                  <span
                    className="text-2xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(251,191,36,0.08)',
                      border:     '1px solid rgba(251,191,36,0.2)',
                      color:      'var(--gold)',
                    }}
                  >
                    Zone
                  </span>
                )}

                {/* Killzone */}
                {killzone && (
                  <span
                    className="text-2xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(251,191,36,0.06)',
                      border:     '1px solid rgba(251,191,36,0.18)',
                      color:      'var(--gold)',
                    }}
                  >
                    ⚡ {session ?? 'KZ'}
                  </span>
                )}
              </div>
            </div>

            {/* Price + arrow */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-xs font-mono tabular-nums"
                style={{ color: 'var(--dim)' }}
              >
                {formatPrice(entry.pair, price)}
              </span>
              <ArrowRight
                size={14}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
                style={{ color: 'var(--muted)' }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Grade label for A+/B+ — reinforces psychology */}
          {(grade === 'A+' || grade === 'B+') && (
            <div
              className="px-4 pb-2.5 -mt-1"
              style={{ background: gs.bg }}
            >
              <p className="text-2xs font-mono" style={{ color: gs.color }}>
                {gs.label}
              </p>
            </div>
          )}
        </article>
      </Link>
    </motion.div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  minGrade:     MinGrade
  setMinGrade:  (g: MinGrade) => void
  mentorFilter: string
  setMentor:    (m: string) => void
  pairFilter:   string
  setPair:      (p: string) => void
  mentorNames:  string[]
  allPairs:     string[]
  total:        number
  filtered:     number
  onClear:      () => void
}

function FilterBar({
  minGrade, setMinGrade,
  mentorFilter, setMentor,
  pairFilter, setPair,
  mentorNames, allPairs,
  total, filtered, onClear,
}: FilterBarProps) {
  const hasFilter = minGrade !== 'all' || mentorFilter !== '' || pairFilter !== ''

  return (
    <div
      className="flex flex-col gap-3 p-3 rounded-2xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} style={{ color: 'var(--dim)' }} aria-hidden="true" />
          <span className="text-xs font-semibold text-dim font-mono">Filters</span>
          <span className="text-xs font-mono text-muted">
            {filtered}/{total} setups
          </span>
        </div>

        {hasFilter && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-2xs font-mono text-muted hover:text-dim transition-colors"
          >
            <X size={11} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {/* Grade threshold pills */}
        <div className="flex gap-1.5" role="group" aria-label="Minimum grade filter">
          {(['all', 'C+', 'B+', 'A+'] as MinGrade[]).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setMinGrade(g)}
              className="text-2xs font-mono px-2.5 py-1 rounded-lg transition-all duration-150"
              style={
                minGrade === g
                  ? {
                      background: g === 'all' ? 'rgba(107,127,163,0.2)' :
                                  g === 'A+'  ? 'rgba(251,191,36,0.15)' :
                                  g === 'B+'  ? 'rgba(0,229,176,0.12)'  :
                                                'rgba(77,142,255,0.12)',
                      border:     `1px solid ${
                        g === 'all' ? 'rgba(107,127,163,0.35)' :
                        g === 'A+'  ? 'rgba(251,191,36,0.4)'   :
                        g === 'B+'  ? 'rgba(0,229,176,0.35)'   :
                                      'rgba(77,142,255,0.35)'
                      }`,
                      color:      g === 'all' ? 'var(--text)' :
                                  g === 'A+'  ? 'var(--gold)' :
                                  g === 'B+'  ? 'var(--accent)' :
                                                'var(--info)',
                    }
                  : {
                      background: 'transparent',
                      border:     '1px solid var(--border)',
                      color:      'var(--dim)',
                    }
              }
              aria-pressed={minGrade === g}
            >
              {MIN_GRADE_LABELS[g]}
            </button>
          ))}
        </div>

        {/* Mentor filter — only shown if multiple mentors */}
        {mentorNames.length > 1 && (
          <select
            value={mentorFilter}
            onChange={e => setMentor(e.target.value)}
            className="text-2xs font-mono px-2.5 py-1 rounded-lg outline-none transition-colors"
            style={{
              background: mentorFilter ? 'rgba(34,211,238,0.08)' : 'transparent',
              border:     `1px solid ${mentorFilter ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
              color:      mentorFilter ? 'var(--cyan)' : 'var(--dim)',
              appearance: 'none',
              cursor:     'pointer',
            }}
            aria-label="Filter by mentor"
          >
            <option value="">All mentors</option>
            {mentorNames.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}

        {/* Pair filter */}
        {allPairs.length > 3 && (
          <select
            value={pairFilter}
            onChange={e => setPair(e.target.value)}
            className="text-2xs font-mono px-2.5 py-1 rounded-lg outline-none transition-colors"
            style={{
              background: pairFilter ? 'rgba(167,139,250,0.08)' : 'transparent',
              border:     `1px solid ${pairFilter ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
              color:      pairFilter ? 'var(--purple)' : 'var(--dim)',
              appearance: 'none',
              cursor:     'pointer',
            }}
            aria-label="Filter by pair"
          >
            <option value="">All pairs</option>
            {allPairs.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

// ─── ScannerGrid ──────────────────────────────────────────────────────────────

export function ScannerGrid({ entries }: ScannerGridProps) {
  const pairStates  = useMarketStore(s => s.pairs)
  const addPair     = useMarketStore(s => s.addPair)
  const startEngine = useMarketStore(s => s.startEngine)

  // ── Filter state ───────────────────────────────────────────────────────────
  const [minGrade,     setMinGrade]     = useState<MinGrade>('all')
  const [mentorFilter, setMentorFilter] = useState('')
  const [pairFilter,   setPairFilter]   = useState('')

  const clearFilters = useCallback(() => {
    setMinGrade('all')
    setMentorFilter('')
    setPairFilter('')
  }, [])

  // ── Derived unique lists ───────────────────────────────────────────────────
  const allPairs = useMemo(
    () => Array.from(new Set(entries.map(e => e.pair))).sort(),
    [entries],
  )

  const mentorNames = useMemo(
    () => Array.from(new Set(entries.map(e => e.mentorName))).sort(),
    [entries],
  )

  // ── Register all pairs + start engine on mount ─────────────────────────────
  useEffect(() => {
    for (const pair of allPairs) {
      addPair(pair)
    }
    startEngine()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPairs.join(',')])

  // ── Compute grades for all entries (recalculates each tick) ───────────────
  const graded = useMemo(() => {
    return entries.map(entry => {
      const state = pairStates[entry.pair]
      if (!state || state.price === 0 || entry.checklist.length === 0) {
        return {
          entry,
          grade:    'D+' as Grade,
          pct:      0,
          price:    state?.price ?? 0,
          trend:    state?.analysis.trend_direction ?? 'ranging' as const,
          bos:      state?.analysis.bos_detected ?? false,
          inAoi:    state?.analysis.price_in_aoi ?? false,
          session:  state?.analysis.session_name ?? null,
          killzone: state?.analysis.session_killzone ?? false,
        }
      }
      const result = calculateGrade(entry.checklist, state.analysis, {})
      return {
        entry,
        grade:    result.grade,
        pct:      result.percentage,
        price:    state.price,
        trend:    state.analysis.trend_direction,
        bos:      state.analysis.bos_detected,
        inAoi:    state.analysis.price_in_aoi,
        session:  state.analysis.session_name,
        killzone: state.analysis.session_killzone,
      }
    })
  // pairStates ref changes every tick
  }, [pairStates, entries])

  // ── Sort: highest grade first, then highest percentage ────────────────────
  const sorted = useMemo(
    () => [...graded].sort((a, b) => {
      const gradeDiff = GRADE_ORDER[b.grade] - GRADE_ORDER[a.grade]
      if (gradeDiff !== 0) return gradeDiff
      return b.pct - a.pct
    }),
    [graded],
  )

  // ── Apply filters ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return sorted.filter(item => {
      if (mentorFilter && item.entry.mentorName !== mentorFilter) return false
      if (pairFilter   && item.entry.pair        !== pairFilter)   return false
      if (minGrade !== 'all') {
        const minOrder = GRADE_ORDER[minGrade as Grade]
        if (GRADE_ORDER[item.grade] < minOrder) return false
      }
      return true
    })
  }, [sorted, mentorFilter, pairFilter, minGrade])

  // ── Grade summary counts ──────────────────────────────────────────────────
  const gradeCounts = useMemo(() => {
    const counts: Record<Grade, number> = { 'A+': 0, 'B+': 0, 'C+': 0, 'D+': 0 }
    for (const item of graded) counts[item.grade]++
    return counts
  }, [graded])

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl text-center"
        style={{ border: '1px dashed var(--border)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          aria-hidden="true"
        >
          <Activity size={24} style={{ color: 'var(--muted)' }} />
        </div>
        <h3
          className="text-base font-bold text-text mb-2"
          style={{ letterSpacing: '-0.01em' }}
        >
          No mentors followed
        </h3>
        <p className="text-sm text-dim max-w-xs leading-relaxed">
          Follow mentors on the marketplace to see their live setups here.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          Browse mentors
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Grade summary bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {(['A+', 'B+', 'C+', 'D+'] as Grade[]).map(g => {
          const gs    = GRADE_STYLE[g]
          const count = gradeCounts[g]
          return (
            <button
              key={g}
              type="button"
              onClick={() => setMinGrade(g === 'D+' ? 'all' : g)}
              className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all duration-150"
              style={{
                background: count > 0 ? gs.bg       : 'var(--card)',
                border:     `1px solid ${count > 0 ? gs.border : 'var(--border)'}`,
              }}
              aria-label={`${count} ${g} setups`}
            >
              <span
                className="text-lg font-bold font-mono leading-none tabular-nums"
                style={{ color: count > 0 ? gs.color : 'var(--muted)' }}
              >
                {count}
              </span>
              <span
                className="text-2xs font-mono"
                style={{ color: count > 0 ? gs.color : 'var(--muted)' }}
              >
                {g}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <FilterBar
        minGrade={minGrade}
        setMinGrade={setMinGrade}
        mentorFilter={mentorFilter}
        setMentor={setMentorFilter}
        pairFilter={pairFilter}
        setPair={setPairFilter}
        mentorNames={mentorNames}
        allPairs={allPairs}
        total={graded.length}
        filtered={filtered.length}
        onClear={clearFilters}
      />

      {/* ── Scan cards grid ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-2xl text-center"
          style={{ border: '1px dashed var(--border)' }}
        >
          <p className="text-sm font-semibold text-dim mb-1.5">
            No setups match your filters
          </p>
          <p className="text-xs text-muted mb-4 max-w-xs">
            The market hasn&apos;t met those conditions yet. Relax — the scanner will surface them when conditions improve.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          layout
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((item, idx) => (
              <ScanCard
                key={`${item.entry.mentorId}-${item.entry.pair}`}
                entry={item.entry}
                grade={item.grade}
                pct={item.pct}
                price={item.price}
                trend={item.trend}
                bos={item.bos}
                inAoi={item.inAoi}
                session={item.session}
                killzone={item.killzone}
                idx={idx}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Psychology reminder */}
      <div
        className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
        style={{
          background: 'rgba(0,229,176,0.04)',
          border:     '1px solid rgba(0,229,176,0.12)',
        }}
      >
        <Activity
          size={11}
          style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>
            Grades update every 2.5s.
          </span>
          {' '}Walk away. Come back when you see an A+. Don&apos;t force D+ setups because you&apos;re watching.
        </p>
      </div>

      {/* Disclaimer */}
      <footer
        className="text-center py-4 px-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
          Not financial advice. Trading carries substantial risk of loss.{' '}
          <a
            href="/disclaimer"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--dim)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Full disclosure
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
