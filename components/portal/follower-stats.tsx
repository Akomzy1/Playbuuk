'use client'

// components/portal/follower-stats.tsx
// Follower analytics component for the mentor portal dashboard.
//
// Renders:
//   · 4 stat cards: Total Followers, Pro Followers, Direct Followers,
//     Pro Conversion Rate
//   · Follower growth line chart (recharts) — last 6 months of new follows
//     with a cumulative overlay
//
// All numeric data in IBM Plex Mono per CLAUDE.md design system.

import { useMemo }                          from 'react'
import { motion }                           from 'framer-motion'
import { Users, TrendingUp, Star, Percent } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Area, AreaChart,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FollowerGrowthPoint {
  month:      string   // "2025-01"
  label:      string   // "Jan"
  newFollows: number
  cumulative: number
}

export interface FollowerStatsProps {
  totalFollowers:  number
  proFollowers:    number
  directFollowers: number
  growthByMonth:   FollowerGrowthPoint[]
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:       string
  value:       string
  sublabel?:   string
  icon:        React.ElementType
  accentColor: string
  accentBg:    string
  accentBorder: string
  delay?:      number
}

function StatCard({
  label, value, sublabel, icon: Icon,
  accentColor, accentBg, accentBorder, delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{
        background: 'var(--card)',
        border:     `1px solid var(--border)`,
        borderTop:  `2px solid ${accentBorder}`,
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-2xs font-mono font-bold"
          style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
        >
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
          aria-hidden="true"
        >
          <Icon size={14} style={{ color: accentColor }} />
        </div>
      </div>

      <div>
        <p
          className="text-2xl font-bold font-mono tabular-nums"
          style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}
        >
          {value}
        </p>
        {sublabel && (
          <p className="text-2xs font-mono text-muted mt-0.5">{sublabel}</p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function GrowthTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col gap-1 shadow-xl"
      style={{
        background: 'var(--surface)',
        border:     '1px solid var(--border)',
      }}
    >
      <p className="text-2xs font-mono text-muted">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: p.dataKey === 'cumulative'
                ? 'rgba(0,229,176,0.4)'
                : 'var(--accent)',
            }}
            aria-hidden="true"
          />
          <span className="text-xs font-mono font-semibold text-text tabular-nums">
            {p.value.toLocaleString()}
          </span>
          <span className="text-2xs font-mono text-muted">
            {p.dataKey === 'cumulative' ? 'total' : 'new'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── FollowerStats ────────────────────────────────────────────────────────────

export function FollowerStats({
  totalFollowers, proFollowers, directFollowers, growthByMonth,
}: FollowerStatsProps) {
  const conversionRate = useMemo(() => {
    if (totalFollowers === 0) return 0
    return ((proFollowers / totalFollowers) * 100)
  }, [totalFollowers, proFollowers])

  // Net new follows in last period
  const lastMonthNew = growthByMonth.at(-1)?.newFollows ?? 0
  const prevMonthNew = growthByMonth.at(-2)?.newFollows ?? 0
  const growthDiff   = lastMonthNew - prevMonthNew

  return (
    <section aria-label="Follower statistics">
      {/* ── 4 stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="TOTAL FOLLOWERS"
          value={totalFollowers.toLocaleString()}
          sublabel={
            growthDiff !== 0
              ? `${growthDiff >= 0 ? '+' : ''}${growthDiff} vs last month`
              : undefined
          }
          icon={Users}
          accentColor="var(--accent)"
          accentBg="rgba(0,229,176,0.08)"
          accentBorder="rgba(0,229,176,0.2)"
          delay={0}
        />
        <StatCard
          label="PRO FOLLOWERS"
          value={proFollowers.toLocaleString()}
          sublabel="Active Pro subscriptions"
          icon={Star}
          accentColor="var(--gold)"
          accentBg="rgba(251,191,36,0.08)"
          accentBorder="rgba(251,191,36,0.2)"
          delay={0.06}
        />
        <StatCard
          label="DIRECT FOLLOWERS"
          value={directFollowers.toLocaleString()}
          sublabel="$9.99/mo direct subs"
          icon={Users}
          accentColor="var(--info)"
          accentBg="rgba(77,142,255,0.08)"
          accentBorder="rgba(77,142,255,0.2)"
          delay={0.12}
        />
        <StatCard
          label="PRO CONVERSION"
          value={`${conversionRate.toFixed(1)}%`}
          sublabel="of followers are Pro"
          icon={Percent}
          accentColor={conversionRate >= 10 ? 'var(--accent)' : conversionRate >= 5 ? 'var(--gold)' : 'var(--danger)'}
          accentBg={conversionRate >= 10 ? 'rgba(0,229,176,0.08)' : conversionRate >= 5 ? 'rgba(251,191,36,0.08)' : 'rgba(255,77,106,0.06)'}
          accentBorder={conversionRate >= 10 ? 'rgba(0,229,176,0.2)' : conversionRate >= 5 ? 'rgba(251,191,36,0.2)' : 'rgba(255,77,106,0.15)'}
          delay={0.18}
        />
      </div>

      {/* ── Growth chart ──────────────────────────────────────────────────── */}
      {growthByMonth.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
          className="rounded-2xl p-5"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3
                className="text-sm font-bold text-text"
                style={{ letterSpacing: '-0.01em' }}
              >
                Follower Growth
              </h3>
              <p className="text-xs text-muted mt-0.5">
                New follows per month — last 6 months
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden="true"
                />
                <span className="text-2xs font-mono text-muted">New</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-0.5 rounded-full"
                  style={{ background: 'rgba(0,229,176,0.35)' }}
                  aria-hidden="true"
                />
                <span className="text-2xs font-mono text-muted">Cumulative</span>
              </div>
            </div>
          </div>

          <div aria-label="Follower growth chart" role="img">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={growthByMonth} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00e5b0" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#00e5b0" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00e5b0" stopOpacity={0.06} />
                    <stop offset="95%" stopColor="#00e5b0" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(26,40,69,0.5)"
                  vertical={false}
                />
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
                <Tooltip content={<GrowthTooltip />} />
                {/* Cumulative area — faint background */}
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="rgba(0,229,176,0.35)"
                  strokeWidth={1.5}
                  fill="url(#cumulativeGradient)"
                  dot={false}
                  strokeDasharray="4 3"
                />
                {/* New follows — prominent line */}
                <Area
                  type="monotone"
                  dataKey="newFollows"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#growthGradient)"
                  dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Growth summary row */}
          <div
            className="flex items-center justify-between mt-4 pt-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <TrendingUp size={12} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <span className="text-muted">This month:</span>
              <span
                className="font-bold tabular-nums"
                style={{ color: lastMonthNew > 0 ? 'var(--accent)' : 'var(--muted)' }}
              >
                +{lastMonthNew.toLocaleString()} new followers
              </span>
            </div>
            <span className="text-2xs font-mono text-muted">
              {totalFollowers.toLocaleString()} total
            </span>
          </div>
        </motion.div>
      )}
    </section>
  )
}
