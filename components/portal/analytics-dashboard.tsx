'use client'

// components/portal/analytics-dashboard.tsx
// Usage analytics dashboard for the mentor portal.
//
// Renders:
//   · 4 usage metric cards: Checklist Opens, Time Spent, Trades Logged,
//     Trades Executed — each with point value annotation
//   · Stacked area chart (recharts): usage by event type over 6 months
//   · Top engaged followers table: anonymised as "Trader #XXXX",
//     sorted by total points, with last-active timestamp

import { motion }     from 'framer-motion'
import {
  CheckSquare, Clock3, BookMarked, Zap,
  Trophy, Flame,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UsageByMonthPoint {
  month:          string
  label:          string
  checklistOpens: number
  timeSpent:      number
  tradesLogged:   number
  tradesExecuted: number
}

export interface TopFollower {
  anonymousId:    string  // "Trader #2847"
  totalPoints:    number
  lastActiveLabel: string // "2h ago", "Yesterday"
  isPro:          boolean
}

export interface AnalyticsDashboardProps {
  checklistOpens:   number
  timeSpentMinutes: number
  tradesLogged:     number
  tradesExecuted:   number
  totalPoints:      number
  byMonth:          UsageByMonthPoint[]
  topFollowers:     TopFollower[]
}

// ─── Usage metric card ────────────────────────────────────────────────────────

interface MetricCardProps {
  label:       string
  value:       string
  pointValue:  string
  icon:        React.ElementType
  accentColor: string
  accentBg:    string
  accentBorder: string
  delay?:      number
}

function MetricCard({
  label, value, pointValue, icon: Icon,
  accentColor, accentBg, accentBorder, delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{
        background: 'var(--card)',
        border:     '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
          aria-hidden="true"
        >
          <Icon size={14} style={{ color: accentColor }} />
        </div>
        <span
          className="text-2xs font-mono px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--surface)',
            border:     '1px solid var(--border)',
            color:      'var(--muted)',
          }}
        >
          {pointValue} pts
        </span>
      </div>
      <div>
        <p
          className="text-xl font-bold font-mono tabular-nums"
          style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}
        >
          {value}
        </p>
        <p
          className="text-2xs font-mono mt-0.5"
          style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}
        >
          {label}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const EVENT_COLORS = {
  checklistOpens: 'var(--accent)',
  timeSpent:      'var(--info)',
  tradesLogged:   'var(--gold)',
  tradesExecuted: 'var(--danger)',
}

const EVENT_LABELS = {
  checklistOpens: 'Checklist Opens',
  timeSpent:      'Time Spent',
  tradesLogged:   'Trades Logged',
  tradesExecuted: 'Trades Executed',
}

function UsageTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; dataKey: keyof typeof EVENT_LABELS }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5 shadow-xl"
      style={{
        background: 'var(--surface)',
        border:     '1px solid var(--border)',
        minWidth:   140,
      }}
    >
      <p className="text-2xs font-mono text-muted pb-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {label}
      </p>
      {[...payload].reverse().map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: EVENT_COLORS[p.dataKey] ?? 'var(--accent)' }}
              aria-hidden="true"
            />
            <span className="text-2xs font-mono text-dim">
              {EVENT_LABELS[p.dataKey] ?? p.dataKey}
            </span>
          </div>
          <span className="text-xs font-mono font-semibold text-text tabular-nums">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── AnalyticsDashboard ───────────────────────────────────────────────────────

export function AnalyticsDashboard({
  checklistOpens, timeSpentMinutes, tradesLogged, tradesExecuted,
  totalPoints, byMonth, topFollowers,
}: AnalyticsDashboardProps) {
  const timeSpentHours = Math.round(timeSpentMinutes / 60)

  return (
    <section aria-label="Usage analytics">

      {/* ── Section header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-text" style={{ letterSpacing: '-0.02em' }}>
            Usage Analytics
          </h2>
          <p className="text-xs text-muted mt-0.5">How traders engage with your playbook</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <Flame size={12} style={{ color: 'var(--gold)' }} aria-hidden="true" />
          <span className="text-xs font-mono font-bold tabular-nums" style={{ color: 'var(--gold)' }}>
            {totalPoints.toLocaleString()}
          </span>
          <span className="text-2xs font-mono text-muted">total pts</span>
        </div>
      </div>

      {/* ── 4 metric cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="CHECKLIST OPENS"
          value={checklistOpens.toLocaleString()}
          pointValue="1"
          icon={CheckSquare}
          accentColor="var(--accent)"
          accentBg="rgba(0,229,176,0.08)"
          accentBorder="rgba(0,229,176,0.2)"
          delay={0}
        />
        <MetricCard
          label="TIME SPENT"
          value={`${timeSpentHours.toLocaleString()}h`}
          pointValue="1/5min"
          icon={Clock3}
          accentColor="var(--info)"
          accentBg="rgba(77,142,255,0.08)"
          accentBorder="rgba(77,142,255,0.2)"
          delay={0.05}
        />
        <MetricCard
          label="TRADES LOGGED"
          value={tradesLogged.toLocaleString()}
          pointValue="2"
          icon={BookMarked}
          accentColor="var(--gold)"
          accentBg="rgba(251,191,36,0.08)"
          accentBorder="rgba(251,191,36,0.2)"
          delay={0.1}
        />
        <MetricCard
          label="TRADES EXECUTED"
          value={tradesExecuted.toLocaleString()}
          pointValue="3"
          icon={Zap}
          accentColor="var(--danger)"
          accentBg="rgba(255,77,106,0.08)"
          accentBorder="rgba(255,77,106,0.15)"
          delay={0.15}
        />
      </div>

      {/* ── Usage by month chart ──────────────────────────────────────────── */}
      {byMonth.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-2xl p-5 mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
                Usage Over Time
              </h3>
              <p className="text-xs text-muted mt-0.5">Events per month — last 6 months</p>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-end">
              {(Object.keys(EVENT_COLORS) as (keyof typeof EVENT_COLORS)[]).map(key => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-0.5 rounded-full"
                    style={{ background: EVENT_COLORS[key] }}
                    aria-hidden="true"
                  />
                  <span className="text-2xs font-mono text-muted">{EVENT_LABELS[key]}</span>
                </div>
              ))}
            </div>
          </div>

          <div role="img" aria-label="Monthly usage breakdown chart">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={byMonth} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  {(Object.entries(EVENT_COLORS) as [string, string][]).map(([key, color]) => (
                    <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={color} stopOpacity={0}    />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,40,69,0.5)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<UsageTooltip />} />
                <Area type="monotone" dataKey="checklistOpens" stackId="1"
                  stroke={EVENT_COLORS.checklistOpens} strokeWidth={1.5}
                  fill="url(#gradient-checklistOpens)" dot={false} />
                <Area type="monotone" dataKey="timeSpent" stackId="1"
                  stroke={EVENT_COLORS.timeSpent} strokeWidth={1.5}
                  fill="url(#gradient-timeSpent)" dot={false} />
                <Area type="monotone" dataKey="tradesLogged" stackId="1"
                  stroke={EVENT_COLORS.tradesLogged} strokeWidth={1.5}
                  fill="url(#gradient-tradesLogged)" dot={false} />
                <Area type="monotone" dataKey="tradesExecuted" stackId="1"
                  stroke={EVENT_COLORS.tradesExecuted} strokeWidth={1.5}
                  fill="url(#gradient-tradesExecuted)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── Top followers table ───────────────────────────────────────────── */}
      {topFollowers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              <h3 className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
                Top Engaged Followers
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Ranked by usage points — identities anonymised
              </p>
            </div>
            <Trophy size={16} style={{ color: 'var(--gold)' }} aria-hidden="true" />
          </div>

          <div role="list">
            {topFollowers.map((follower, i) => (
              <motion.div
                key={follower.anonymousId}
                role="listitem"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.3 + i * 0.04 }}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: i < topFollowers.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Rank + ID */}
                <div className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-2xs font-mono font-bold flex-shrink-0"
                    style={i < 3 ? {
                      background: i === 0 ? 'rgba(251,191,36,0.15)' : i === 1 ? 'rgba(107,127,163,0.2)' : 'rgba(180,120,60,0.15)',
                      color:      i === 0 ? 'var(--gold)'            : i === 1 ? 'var(--dim)'             : '#b07840',
                      border:     i === 0 ? '1px solid rgba(251,191,36,0.3)' : 'none',
                    } : {
                      background: 'var(--surface)',
                      color:      'var(--muted)',
                    }}
                    aria-label={`Rank ${i + 1}`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-xs font-mono font-semibold text-text">
                      {follower.anonymousId}
                    </span>
                    {follower.isPro && (
                      <span
                        className="ml-2 text-2xs font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: 'rgba(251,191,36,0.1)',
                          border:     '1px solid rgba(251,191,36,0.25)',
                          color:      'var(--gold)',
                        }}
                      >
                        PRO
                      </span>
                    )}
                  </div>
                </div>

                {/* Points + last active */}
                <div className="flex items-center gap-4">
                  <span className="text-2xs font-mono text-muted hidden sm:block">
                    {follower.lastActiveLabel}
                  </span>
                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <Flame size={10} style={{ color: 'var(--gold)' }} aria-hidden="true" />
                    <span
                      className="text-xs font-mono font-bold tabular-nums"
                      style={{ color: 'var(--text)' }}
                      aria-label={`${follower.totalPoints} usage points`}
                    >
                      {follower.totalPoints.toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {topFollowers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center py-12 rounded-2xl text-center"
          style={{ border: '1px dashed var(--border)' }}
        >
          <Trophy size={24} className="mb-3" style={{ color: 'var(--muted)' }} aria-hidden="true" />
          <p className="text-sm font-semibold text-dim">No engagement data yet</p>
          <p className="text-xs text-muted mt-1.5 max-w-xs leading-relaxed">
            Usage stats will appear once Pro traders start opening your playbook and running your checklist.
          </p>
        </motion.div>
      )}
    </section>
  )
}
