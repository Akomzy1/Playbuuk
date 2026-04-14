'use client'

// components/journal/psychology-insights.tsx
// Full analytics dashboard — 5 insight cards that change trader behaviour.
// Visually clear, emotionally impactful, colour-coded to reinforce good patterns.

import { useMemo }  from 'react'
import { motion }   from 'framer-motion'
import {
  AlertTriangle, Bell, Brain, TrendingUp, TrendingDown,
  Zap, Award, Users,
} from 'lucide-react'
import type { JournalEntryData } from './journal-entry'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PsychologyInsightsProps {
  entries: JournalEntryData[]
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function winRateOf(arr: JournalEntryData[]): number | null {
  const closed = arr.filter(e => e.outcome !== 'pending')
  if (closed.length < 3) return null
  return (arr.filter(e => e.outcome === 'win').length / closed.length) * 100
}

function p(n: number, dp = 0): string { return `${n.toFixed(dp)}%` }

function isoMonth(iso: string) { return iso.slice(0, 7) }

const GRADE_COLOUR: Record<string, string> = {
  'A+': '#fbbf24',
  'B+': '#4d8eff',
  'C+': '#22d3ee',
  'D+': '#ff4d6a',
}

const EMOTION_COLOUR: Record<string, string> = {
  Calm:       '#00e5b0',
  Conviction: '#00e5b0',
  Boredom:    '#6b7fa3',
  FOMO:       '#ff4d6a',
  Revenge:    '#ff4d6a',
}

// ─── Animated horizontal bar ─────────────────────────────────────────────────

function Bar({
  value,          // 0–100
  max = 100,
  colour,
  label,
  sub,
  delay = 0,
  highlight = false,
}: {
  value:      number
  max?:       number
  colour:     string
  label:      string
  sub?:       string
  delay?:     number
  highlight?: boolean
}) {
  const pct = Math.min(100, (value / max) * 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Label */}
      <div style={{
        width:      88,
        flexShrink: 0,
        fontSize:   12,
        fontWeight: highlight ? 700 : 500,
        color:      highlight ? colour : 'var(--dim)',
        display:    'flex',
        alignItems: 'center',
        gap:        4,
      }}>
        {highlight && <AlertTriangle size={10} />}
        {label}
      </div>

      {/* Track */}
      <div style={{
        flex:         1,
        height:       8,
        background:   'var(--surface)',
        borderRadius: 4,
        overflow:     'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height:       '100%',
            background:   colour,
            borderRadius: 4,
            boxShadow:    highlight ? `0 0 8px ${colour}66` : undefined,
          }}
        />
      </div>

      {/* Value + sub */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 72 }}>
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize:   13,
          fontWeight: 700,
          color:      highlight ? colour : 'var(--text)',
        }}>
          {p(value)}
        </span>
        {sub && (
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 5 }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Comparison bars (two side-by-side labelled bars) ─────────────────────────

function ComparisonBars({
  a, b,
}: {
  a: { label: string; value: number; sub?: string; colour: string }
  b: { label: string; value: number; sub?: string; colour: string }
}) {
  const max = Math.max(a.value, b.value, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Bar value={a.value} max={max} colour={a.colour} label={a.label} sub={a.sub} delay={0}   />
      <Bar value={b.value} max={max} colour={b.colour} label={b.label} sub={b.sub} delay={0.1} />
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function InsightCard({
  icon, title, accentColour = 'var(--accent)', children,
}: {
  icon:         React.ReactNode
  title:        string
  accentColour?: string
  children:     React.ReactNode
}) {
  return (
    <div style={{
      background:   'var(--card)',
      border:       '1px solid var(--border)',
      borderRadius: 12,
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:         9,
        padding:     '14px 18px 12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ color: accentColour }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          {title}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Callout ──────────────────────────────────────────────────────────────────

function Callout({
  text, colour,
}: { text: string; colour: string }) {
  return (
    <div style={{
      marginTop:    14,
      padding:      '10px 14px',
      borderRadius: 8,
      background:   `${colour}0f`,
      border:       `1px solid ${colour}30`,
      fontSize:     12,
      color:        colour,
      fontWeight:   600,
      lineHeight:   1.5,
    }}>
      {text}
    </div>
  )
}

// ─── Empty data notice ────────────────────────────────────────────────────────

function NotEnoughData({ needed }: { needed: string }) {
  return (
    <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
      Log {needed} to unlock this insight.
    </p>
  )
}

// ─── Card 1: Grade Compliance ─────────────────────────────────────────────────

function GradeComplianceCard({ entries }: { entries: JournalEntryData[] }) {
  const grades = ['A+', 'B+', 'C+', 'D+'] as const

  // Compliance = trades that were NOT overridden, as % of all graded trades
  const graded      = entries.filter(e => e.setup_grade !== null)
  const compliant   = graded.filter(e => !e.grade_override)
  const compliance  = graded.length > 0 ? (compliant.length / graded.length) * 100 : null

  // Month-over-month
  const now       = new Date()
  const thisMonth = isoMonth(now.toISOString())
  const lastMonth = isoMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())

  const thisGraded    = entries.filter(e => e.setup_grade && isoMonth(e.created_at) === thisMonth)
  const lastGraded    = entries.filter(e => e.setup_grade && isoMonth(e.created_at) === lastMonth)
  const thisComp      = thisGraded.length > 0 ? (thisGraded.filter(e => !e.grade_override).length / thisGraded.length) * 100 : null
  const lastComp      = lastGraded.length >= 3 ? (lastGraded.filter(e => !e.grade_override).length / lastGraded.length) * 100 : null
  const trend         = thisComp !== null && lastComp !== null ? thisComp - lastComp : null

  // Per-grade: count + win rate
  const gradeRows = grades
    .map(g => {
      const subset = entries.filter(e => e.setup_grade === g)
      const wr     = winRateOf(subset)
      return { grade: g, count: subset.length, wr }
    })
    .filter(r => r.count >= 2)

  const complianceColour = compliance === null ? 'var(--text)'
    : compliance >= 80 ? '#00e5b0'
    : compliance >= 60 ? '#fbbf24'
    : '#ff4d6a'

  return (
    <InsightCard
      icon={<Award size={16} />}
      title="Grade Compliance"
      accentColour={complianceColour}
    >
      {graded.length < 5 ? (
        <NotEnoughData needed="5 graded trades" />
      ) : (
        <>
          {/* Hero number */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span style={{
              fontFamily:    '"IBM Plex Mono", monospace',
              fontSize:      42,
              fontWeight:    800,
              color:         complianceColour,
              lineHeight:    1,
              letterSpacing: '-0.03em',
            }}>
              {compliance !== null ? p(compliance) : '—'}
            </span>

            {trend !== null && (
              <span style={{
                display:      'flex',
                alignItems:   'center',
                gap:          3,
                fontSize:     12,
                fontWeight:   700,
                color:        trend >= 0 ? '#00e5b0' : '#ff4d6a',
                background:   trend >= 0 ? 'rgba(0,229,176,0.12)' : 'rgba(255,77,106,0.12)',
                borderRadius: 20,
                padding:      '3px 9px',
                fontFamily:   '"IBM Plex Mono", monospace',
              }}>
                {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {trend > 0 ? '+' : ''}{trend.toFixed(0)}pp vs last mo.
              </span>
            )}
          </div>

          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--dim)' }}>
            of trades followed the grade threshold without an override
          </p>

          {/* Per-grade bars */}
          {gradeRows.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Win rate by grade tier
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {gradeRows.map((r, i) => (
                  r.wr !== null ? (
                    <Bar
                      key={r.grade}
                      label={r.grade}
                      value={r.wr}
                      colour={GRADE_COLOUR[r.grade] ?? 'var(--dim)'}
                      sub={`${r.count} trades`}
                      delay={i * 0.07}
                    />
                  ) : (
                    <div key={r.grade} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 88, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{r.grade}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.count} trade{r.count !== 1 ? 's' : ''} — need 3+ to show win rate</div>
                    </div>
                  )
                ))}
              </div>
            </>
          )}
        </>
      )}
    </InsightCard>
  )
}

// ─── Card 2: Override Analysis ────────────────────────────────────────────────

function OverrideAnalysisCard({ entries }: { entries: JournalEntryData[] }) {
  const overrides  = entries.filter(e => e.grade_override)
  const compliant  = entries.filter(e => !e.grade_override)

  const overrideWr  = winRateOf(overrides)
  const compliantWr = winRateOf(compliant)

  const now       = new Date()
  const thisMonth = isoMonth(now.toISOString())
  const thisOverrides = overrides.filter(e => isoMonth(e.created_at) === thisMonth)

  const diff = overrideWr !== null && compliantWr !== null ? compliantWr - overrideWr : null

  const hasEnough = overrides.length >= 3 && compliant.length >= 3

  return (
    <InsightCard
      icon={<AlertTriangle size={16} />}
      title="Override Analysis"
      accentColour="#fbbf24"
    >
      {!hasEnough ? (
        <NotEnoughData needed="3+ overridden trades and 3+ compliant trades" />
      ) : (
        <>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>
            You overrode the grade threshold{' '}
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, color: '#fbbf24' }}>
              {thisOverrides.length}
            </span>{' '}
            time{thisOverrides.length !== 1 ? 's' : ''} this month
            {overrides.length !== thisOverrides.length
              ? ` (${overrides.length} total)`
              : ''
            }.
          </p>

          <ComparisonBars
            a={{
              label:  'Compliant',
              value:  compliantWr ?? 0,
              sub:    `${compliant.length} trades`,
              colour: '#00e5b0',
            }}
            b={{
              label:  'Overridden',
              value:  overrideWr ?? 0,
              sub:    `${overrides.length} trades`,
              colour: '#ff4d6a',
            }}
          />

          {diff !== null && (
            <Callout
              colour={diff >= 20 ? '#ff4d6a' : diff >= 10 ? '#fbbf24' : '#00e5b0'}
              text={
                diff >= 20
                  ? `Compliant trades: ${p(compliantWr!)} win rate. Overrides: ${p(overrideWr!)} win rate. Overriding costs you ${p(diff)} per trade.`
                  : diff >= 5
                  ? `Overrides underperform by ${p(diff)}. The grade threshold exists for a reason.`
                  : `Your overrides are well-calibrated — only ${p(Math.abs(diff))} below compliant trades.`
              }
            />
          )}
        </>
      )}
    </InsightCard>
  )
}

// ─── Card 3: Alert Performance ────────────────────────────────────────────────

function AlertPerformanceCard({ entries }: { entries: JournalEntryData[] }) {
  const alertTrades = entries.filter(e => e.alert_initiated)
  const selfTrades  = entries.filter(e => !e.alert_initiated)

  if (alertTrades.length < 3) return null

  const alertWr = winRateOf(alertTrades)
  const selfWr  = winRateOf(selfTrades)
  const diff    = alertWr !== null && selfWr !== null ? alertWr - selfWr : null

  const accentColour = diff === null ? '#4d8eff'
    : diff >= 10 ? '#00e5b0' : diff >= 0 ? '#4d8eff' : '#fbbf24'

  return (
    <InsightCard
      icon={<Bell size={16} />}
      title="Alert Performance"
      accentColour={accentColour}
    >
      {alertWr === null || selfWr === null ? (
        <NotEnoughData needed="more closed trades in each category" />
      ) : (
        <>
          <ComparisonBars
            a={{
              label:  'Alert trades',
              value:  alertWr,
              sub:    `${alertTrades.length} trades`,
              colour: accentColour,
            }}
            b={{
              label:  'Self-initiated',
              value:  selfWr,
              sub:    `${selfTrades.filter(e => e.outcome !== 'pending').length} closed`,
              colour: 'var(--dim)',
            }}
          />

          {diff !== null && (
            <Callout
              colour={accentColour}
              text={
                diff >= 15
                  ? `Alert-initiated: ${p(alertWr)} win rate. Self-initiated: ${p(selfWr)}. Stop chart staring — alerts improve your win rate by ${p(diff)}.`
                  : diff >= 5
                  ? `Alert trades edge out self-initiated by ${p(diff)}. Let the system find your setups.`
                  : diff >= -5
                  ? `Alert and self-initiated trades perform similarly. Keep monitoring.`
                  : `Your self-initiated setups outperform alerts by ${p(Math.abs(diff))}. You have a strong eye — keep logging your criteria.`
              }
            />
          )}
        </>
      )}
    </InsightCard>
  )
}

// ─── Card 4: Emotion Patterns ─────────────────────────────────────────────────

function EmotionPatternsCard({ entries }: { entries: JournalEntryData[] }) {
  const tagged = entries.filter(e => e.pre_trade_emotion !== null)
  if (tagged.length < 5) return null

  const groups: Record<string, JournalEntryData[]> = {}
  for (const e of tagged) {
    const em = e.pre_trade_emotion!
    groups[em] = [...(groups[em] ?? []), e]
  }

  const rows = Object.entries(groups)
    .map(([em, arr]) => ({ em, wr: winRateOf(arr), count: arr.length }))
    .filter(r => r.wr !== null && r.count >= 2) as Array<{ em: string; wr: number; count: number }>

  if (rows.length < 2) return null

  rows.sort((a, b) => b.wr - a.wr)

  const worst = rows[rows.length - 1]
  if (!worst) return null
  const isWorstDangerous = worst.em === 'FOMO' || worst.em === 'Revenge' || worst.em === 'Boredom'
  const maxWr = Math.max(...rows.map(r => r.wr))

  return (
    <InsightCard
      icon={<Zap size={16} />}
      title="Emotion Patterns"
      accentColour="#fbbf24"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
        {rows.map((r, i) => {
          const col      = EMOTION_COLOUR[r.em] ?? '#6b7fa3'
          const isWorst  = r.em === worst.em && isWorstDangerous
          return (
            <Bar
              key={r.em}
              label={r.em}
              value={r.wr}
              max={maxWr}
              colour={col}
              sub={`${r.count} trades`}
              delay={i * 0.07}
              highlight={isWorst}
            />
          )
        })}
      </div>

      {isWorstDangerous && (
        <Callout
          colour="#ff4d6a"
          text={`Your worst trades come when you tag "${worst.em}" — ${p(worst.wr)} win rate. When you feel ${worst.em.toLowerCase()}, close the platform and walk away.`}
        />
      )}
    </InsightCard>
  )
}

// ─── Card 5: Mentor Comparison ────────────────────────────────────────────────

function MentorComparisonCard({ entries }: { entries: JournalEntryData[] }) {
  const withPlaybook = entries.filter(e => e.playbook !== null)
  if (withPlaybook.length < 5) return null

  // Group by mentor
  const mentorMap: Record<string, { name: string; emoji: string; strategy: string; arr: JournalEntryData[] }> = {}
  for (const e of withPlaybook) {
    const m  = e.playbook!.mentor
    const id = m.id
    if (!mentorMap[id]) {
      mentorMap[id] = {
        name:     m.display_name,
        emoji:    m.avatar_emoji,
        strategy: e.playbook!.strategy_name,
        arr:      [],
      }
    }
    mentorMap[id].arr.push(e)
  }

  const rows = Object.entries(mentorMap)
    .map(([id, { name, emoji, strategy, arr }]) => ({
      id, name, emoji, strategy,
      wr:    winRateOf(arr),
      count: arr.length,
    }))
    .filter(r => r.wr !== null && r.count >= 3) as Array<{
      id: string; name: string; emoji: string; strategy: string; wr: number; count: number
    }>

  if (rows.length < 2) return null

  rows.sort((a, b) => b.wr - a.wr)
  const maxWr = Math.max(...rows.map(r => r.wr))
  const best  = rows[0]
  if (!best) return null

  return (
    <InsightCard
      icon={<Users size={16} />}
      title="Mentor Comparison"
      accentColour="#4d8eff"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((r, i) => {
          const isBest = r.id === best.id
          const colour = isBest ? '#00e5b0' : i === rows.length - 1 ? 'var(--muted)' : '#4d8eff'
          return (
            <div key={r.id}>
              <div style={{
                display:    'flex',
                alignItems: 'center',
                gap:        6,
                marginBottom: 6,
                fontSize:   12,
                color:      isBest ? 'var(--text)' : 'var(--dim)',
                fontWeight: isBest ? 700 : 400,
              }}>
                <span>{r.emoji}</span>
                <span>{r.name}</span>
                <span style={{ color: 'var(--muted)' }}>·</span>
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>{r.strategy}</span>
                {isBest && (
                  <span style={{
                    fontSize:     10,
                    fontWeight:   700,
                    padding:      '2px 7px',
                    borderRadius: 10,
                    background:   'rgba(0,229,176,0.15)',
                    color:        '#00e5b0',
                    marginLeft:   2,
                  }}>
                    Best
                  </span>
                )}
              </div>
              <Bar
                label=""
                value={r.wr}
                max={maxWr}
                colour={colour}
                sub={`${r.count} trades`}
                delay={i * 0.08}
              />
            </div>
          )
        })}
      </div>

      <Callout
        colour="#00e5b0"
        text={`Best results come from ${best.emoji} ${best.name}'s playbook — ${p(best.wr)} win rate across ${best.count} trades.`}
      />
    </InsightCard>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export function PsychologyInsights({ entries }: PsychologyInsightsProps) {
  const closed = useMemo(() => entries.filter(e => e.outcome !== 'pending'), [entries])

  if (closed.length < 5) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Brain size={36} style={{ color: 'var(--muted)', opacity: 0.3, display: 'block', margin: '0 auto 14px' }} />
          <p style={{ margin: 0, fontSize: 14, color: 'var(--dim)', fontWeight: 600 }}>
            Psychology insights unlock after 5 closed trades.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            You have {closed.length} so far. Keep logging — your patterns will surface automatically.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[
        <GradeComplianceCard  key="compliance" entries={entries} />,
        <OverrideAnalysisCard key="override"   entries={entries} />,
        <AlertPerformanceCard key="alert"      entries={entries} />,
        <EmotionPatternsCard  key="emotion"    entries={entries} />,
        <MentorComparisonCard key="mentor"     entries={entries} />,
      ]
        .filter(Boolean)
        .map((card, i) => (
          <motion.div
            key={(card as React.ReactElement).key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {card}
          </motion.div>
        ))
      }

      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        Based on {closed.length} closed trades. Patterns update as you log more.
      </p>
    </div>
  )
}
