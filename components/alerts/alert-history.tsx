'use client'

// components/alerts/alert-history.tsx
// Past setup alerts with tap-through rate, conversion rate, and per-alert details.
//
// Psychology framing: This view surfaces the data that proves alerts work.
// Seeing "74% win rate on A+ alert-initiated trades vs 43% self-initiated"
// reinforces the habit of waiting for the alert before entering.
//
// Data shape expected from GET /api/alerts/history:
//   { alerts: AlertHistoryItem[], stats: AlertStats }

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence }           from 'framer-motion'
import Link                                  from 'next/link'
import {
  Bell, BellOff, TrendingUp, TrendingDown, CheckCircle2, XCircle,
  ExternalLink, BarChart2, Target, Zap, Clock, Filter, ChevronDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertHistoryItem {
  id:                string
  mentor_id:         string
  mentor_name:       string
  mentor_emoji:      string
  playbook_id:       string
  pair:              string
  grade:             string
  checklist_score:   number
  sent_at:           string        // ISO timestamp
  tapped:            boolean
  tapped_at:         string | null
  resulted_in_trade: boolean
  trade_id:          string | null
}

export interface AlertStats {
  total_this_week:       number
  tap_through_rate:      number   // 0–1
  conversion_rate:       number   // 0–1 — alerts → trades
  alert_win_rate:        number | null  // win rate on alert-initiated trades
  self_win_rate:         number | null  // win rate on self-initiated trades
}

// ─── Grade config (mirrors other components) ──────────────────────────────────

const GRADE_CFG: Record<string, { colour: string; bg: string }> = {
  'A+': { colour: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  'B+': { colour: '#00e5b0', bg: 'rgba(0,229,176,0.1)'   },
  'C+': { colour: '#22d3ee', bg: 'rgba(34,211,238,0.1)'  },
  'D+': { colour: '#ff4d6a', bg: 'rgba(255,77,106,0.1)'  },
}
function gradeFor(g: string) {
  return GRADE_CFG[g] ?? { colour: '#6b7fa3', bg: 'rgba(107,127,163,0.1)' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH  = diffMs / 3_600_000
  if (diffH < 1)  return `${Math.round(diffMs / 60_000)}m ago`
  if (diffH < 24) return `${Math.round(diffH)}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7)  return `${diffD}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function pct(n: number | null) {
  if (n == null) return '—'
  return `${(n * 100).toFixed(0)}%`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading alert history">
      {/* Stats skeleton */}
      <div
        className="grid gap-3 mb-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton rounded-xl"
            style={{ height: '72px' }}
          />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="skeleton rounded-xl"
          style={{ height: '68px', animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:  string
  value:  string
  sub?:   string
  colour: string
  icon:   React.ReactNode
}

function StatCard({ label, value, sub, colour, icon }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${colour}18`, color: colour }}
        >
          {icon}
        </div>
        <span className="text-xs text-muted font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-mono font-bold text-xl text-text" style={{ color: colour, letterSpacing: '-0.03em' }}>
        {value}
      </div>
      {sub && <p className="text-xs text-dim mt-0.5 leading-snug">{sub}</p>}
    </div>
  )
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ item }: { item: AlertHistoryItem }) {
  const { colour, bg } = gradeFor(item.grade)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
      style={{
        background: 'var(--surface)',
        border:     '1px solid var(--border)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Grade badge */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm"
        style={{ background: bg, border: `1px solid ${colour}33`, color: colour, letterSpacing: '-0.02em' }}
        aria-label={`Grade ${item.grade}`}
      >
        {item.grade}
      </div>

      {/* Mentor + pair */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-mono font-bold text-text truncate">{item.pair}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs" aria-hidden="true">{item.mentor_emoji}</span>
          <span className="text-xs text-dim truncate">{item.mentor_name}</span>
          <span className="text-xs font-mono text-muted ml-1">·</span>
          <span className="text-xs font-mono text-muted">{item.checklist_score.toFixed(0)}%</span>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Tapped */}
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
          style={
            item.tapped
              ? { background: 'rgba(0,229,176,0.08)', color: 'var(--accent)',  border: '1px solid rgba(0,229,176,0.18)' }
              : { background: 'rgba(61,80,120,0.18)', color: 'var(--muted)',   border: '1px solid rgba(61,80,120,0.3)'  }
          }
          aria-label={item.tapped ? 'Alert was tapped' : 'Alert was not tapped'}
        >
          {item.tapped ? (
            <><CheckCircle2 size={9} aria-hidden="true" /> Opened</>
          ) : (
            <><XCircle      size={9} aria-hidden="true" /> Missed</>
          )}
        </div>

        {/* Traded */}
        {item.resulted_in_trade && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
            style={{ background: 'rgba(77,142,255,0.08)', color: 'var(--info)', border: '1px solid rgba(77,142,255,0.18)' }}
            aria-label="Resulted in a trade"
          >
            <Target size={9} aria-hidden="true" />
            Traded
          </div>
        )}
      </div>

      {/* Time + link */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-mono text-muted hidden sm:block">{fmtTime(item.sent_at)}</span>
        <Link
          href={`/mentor/${item.mentor_id}?pair=${encodeURIComponent(item.pair)}`}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          aria-label={`Open ${item.mentor_name} playbook for ${item.pair}`}
        >
          <ExternalLink size={12} />
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Insight callout ─────────────────────────────────────────────────────────

function InsightCallout({ stats }: { stats: AlertStats }) {
  const alertWin = stats.alert_win_rate
  const selfWin  = stats.self_win_rate
  if (alertWin == null || selfWin == null) return null
  const diff = (alertWin - selfWin) * 100
  if (Math.abs(diff) < 5) return null

  const isPositive = diff > 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl px-4 py-3 text-sm leading-relaxed"
      style={{
        background: isPositive ? 'rgba(0,229,176,0.05)' : 'rgba(255,77,106,0.05)',
        border:     isPositive ? '1px solid rgba(0,229,176,0.18)' : '1px solid rgba(255,77,106,0.18)',
        color:      isPositive ? 'var(--accent)' : 'var(--danger)',
      }}
    >
      <span className="font-semibold">
        {isPositive
          ? `Trades from alerts win ${diff.toFixed(0)}% more often than self-initiated trades.`
          : `Alert-initiated trades are underperforming by ${Math.abs(diff).toFixed(0)}%.`
        }
      </span>
      {' '}
      <span style={{ color: 'var(--dim)' }}>
        {isPositive
          ? 'The system is working — keep waiting for the alert before entering.'
          : 'Review your threshold settings. Raising to A+ may improve quality.'}
      </span>
    </motion.div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type GradeFilter = 'all' | 'A+' | 'B+' | 'C+' | 'D+'
type TapFilter   = 'all' | 'tapped' | 'missed' | 'traded'

interface FilterBarProps {
  grade:    GradeFilter
  tap:      TapFilter
  onGrade:  (v: GradeFilter) => void
  onTap:    (v: TapFilter) => void
}

function FilterBar({ grade, tap, onGrade, onTap }: FilterBarProps) {
  const grades: GradeFilter[] = ['all', 'A+', 'B+', 'C+', 'D+']
  const taps:   TapFilter[]   = ['all', 'tapped', 'missed', 'traded']

  const gradeColour = (g: GradeFilter) => {
    if (g === 'all') return 'var(--dim)'
    return gradeFor(g).colour
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Grade filter */}
      <div className="flex items-center gap-1">
        {grades.map(g => {
          const active = grade === g
          const col    = gradeColour(g)
          return (
            <button
              key={g}
              type="button"
              onClick={() => onGrade(g)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all"
              style={
                active
                  ? { background: `${col}18`, border: `1px solid ${col}44`, color: col }
                  : { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }
              }
            >
              {g === 'all' ? 'All grades' : g}
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-4 hidden sm:block" style={{ background: 'var(--border)' }} />

      {/* Tap filter */}
      <div className="flex items-center gap-1">
        {taps.map(t => {
          const active = tap === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTap(t)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all capitalize"
              style={
                active
                  ? { background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.25)', color: 'var(--accent)' }
                  : { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }
              }
            >
              {t === 'all' ? 'All results' : t}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertHistory() {
  const [alerts,  setAlerts]  = useState<AlertHistoryItem[]>([])
  const [stats,   setStats]   = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [grade,   setGrade]   = useState<GradeFilter>('all')
  const [tap,     setTap]     = useState<TapFilter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/alerts/history')
      if (!res.ok) throw new Error('Failed to load alert history')
      const data = await res.json() as { alerts: AlertHistoryItem[]; stats: AlertStats }
      setAlerts(data.alerts)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Filter
  const filtered = alerts.filter(a => {
    if (grade !== 'all' && a.grade !== grade) return false
    if (tap === 'tapped'  && !a.tapped)             return false
    if (tap === 'missed'  && a.tapped)               return false
    if (tap === 'traded'  && !a.resulted_in_trade)   return false
    return true
  })

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return <HistorySkeleton />

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)' }}
        role="alert"
      >
        <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        <p className="text-sm text-dim">{error}</p>
        <button
          onClick={load}
          className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(255,77,106,0.12)', color: 'var(--danger)', border: '1px solid rgba(255,77,106,0.2)' }}
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center text-center py-16 px-4"
      >
        {/* Animated bell orb */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'rgba(0,229,176,0.06)',
            border:     '1px solid rgba(0,229,176,0.15)',
            boxShadow:  '0 0 32px rgba(0,229,176,0.07)',
          }}
          aria-hidden="true"
        >
          <BellOff size={24} style={{ color: 'var(--muted)' }} />
        </div>
        <h3 className="font-bold text-text text-base mb-2">Stop watching charts.</h3>
        <p className="text-sm text-dim leading-relaxed max-w-sm">
          Enable setup alerts and we&apos;ll tell you when your mentor&apos;s playbook
          hits your grade threshold — so you can walk away and only enter when
          conditions are objectively met.
        </p>
        <div
          className="flex items-center gap-2 mt-5 px-4 py-2 rounded-xl text-xs font-mono"
          style={{
            background: 'rgba(0,229,176,0.05)',
            border:     '1px solid rgba(0,229,176,0.15)',
            color:      'var(--accent)',
          }}
        >
          <Bell size={12} aria-hidden="true" />
          Configure alerts in your settings
        </div>
      </motion.div>
    )
  }

  // ── Content ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Stats grid */}
      {stats && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
          aria-label="Alert statistics"
        >
          <StatCard
            label="This week"
            value={String(stats.total_this_week)}
            sub="setup alerts fired"
            colour="var(--accent)"
            icon={<Bell size={12} />}
          />
          <StatCard
            label="Tap rate"
            value={pct(stats.tap_through_rate)}
            sub="of alerts opened"
            colour={stats.tap_through_rate >= 0.5 ? 'var(--accent)' : 'var(--warning)'}
            icon={<Zap size={12} />}
          />
          <StatCard
            label="Converted"
            value={pct(stats.conversion_rate)}
            sub="alerts → trades"
            colour={stats.conversion_rate >= 0.3 ? 'var(--info)' : 'var(--dim)'}
            icon={<Target size={12} />}
          />
          {stats.alert_win_rate != null && (
            <StatCard
              label="Alert win rate"
              value={pct(stats.alert_win_rate)}
              sub="on alert-initiated trades"
              colour={stats.alert_win_rate >= 0.5 ? 'var(--accent)' : 'var(--danger)'}
              icon={<BarChart2 size={12} />}
            />
          )}
        </div>
      )}

      {/* Insight callout */}
      {stats && <InsightCallout stats={stats} />}

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterBar grade={grade} tap={tap} onGrade={setGrade} onTap={setTap} />
        <span className="text-xs font-mono text-muted">
          {filtered.length} of {alerts.length} alerts
        </span>
      </div>

      {/* Alert list */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10"
          >
            <p className="text-sm text-dim">No alerts match these filters.</p>
          </motion.div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Alert history list">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                role="listitem"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
              >
                <AlertRow item={item} />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
