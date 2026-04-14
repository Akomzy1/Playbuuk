'use client'

// components/journal/journal-entry.tsx
// Single trade journal entry card — all psychology fields visible.
// Expandable post-trade note. Source badge, override warning, alert badge.

import { useState }         from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, AlertTriangle, Bell, ExternalLink,
  ChevronDown, ChevronUp, BookOpen, Pencil,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JournalEntryData {
  id:                string
  pair:              string
  direction:         'long' | 'short'
  risk_r:            number | null
  setup_grade:       string | null
  entry_price:       number | null
  stop_loss:         number | null
  take_profit:       number | null
  lot_size:          number | null
  outcome:           'pending' | 'win' | 'loss' | 'breakeven'
  pnl_r:             number | null
  mt5_ticket:        string | null
  execution_source:  'manual' | 'playbuuk'
  grade_override:    boolean
  pre_trade_emotion: string | null
  post_trade_note:   string | null
  notes:             string | null
  alert_initiated:   boolean
  created_at:        string
  playbook: {
    id:            string
    strategy_name: string
    mentor: {
      id:           string
      display_name: string
      handle:       string
      avatar_emoji: string
    }
  } | null
}

interface JournalEntryProps {
  entry: JournalEntryData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_COLOUR: Record<string, string> = {
  'A+': '#fbbf24',
  'B+': '#4d8eff',
  'C+': '#22d3ee',
  'D+': '#ff4d6a',
}

const OUTCOME_STYLE: Record<string, { colour: string; label: string }> = {
  win:       { colour: '#00e5b0', label: 'Win'       },
  loss:      { colour: '#ff4d6a', label: 'Loss'      },
  breakeven: { colour: '#6b7fa3', label: 'Breakeven' },
  pending:   { colour: '#fbbf24', label: 'Pending'   },
}

const EMOTION_COLOUR: Record<string, string> = {
  FOMO:       '#ff4d6a',
  Revenge:    '#ff4d6a',
  Boredom:    '#6b7fa3',
  Conviction: '#00e5b0',
  Calm:       '#00e5b0',
}

function fmt(n: number | null, dp = 5): string {
  if (n === null) return '—'
  return n.toFixed(dp)
}

function fmtR(n: number | null): string {
  if (n === null) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}R`
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60_000)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)    return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JournalEntry({ entry }: JournalEntryProps) {
  const [expanded, setExpanded] = useState(false)

  const gradeColour   = entry.setup_grade ? GRADE_COLOUR[entry.setup_grade] ?? '#6b7fa3' : '#6b7fa3'
  const outcomeStyle  = OUTCOME_STYLE[entry.outcome] ?? OUTCOME_STYLE['pending']!
  const emotionColour = entry.pre_trade_emotion ? EMOTION_COLOUR[entry.pre_trade_emotion] ?? '#6b7fa3' : null
  const isLong        = entry.direction === 'long'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background:   'var(--card)',
        border:       '1px solid var(--border)',
        borderRadius: 12,
        overflow:     'hidden',
        transition:   'box-shadow 200ms',
      }}
      whileHover={{ boxShadow: '0 0 20px rgba(0,229,176,0.06)' }}
    >
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div style={{
        padding:        '14px 18px',
        display:        'flex',
        alignItems:     'center',
        gap:            12,
        borderBottom:   expanded ? '1px solid var(--border)' : 'none',
      }}>

        {/* Direction arrow */}
        <div style={{
          width:          36,
          height:         36,
          borderRadius:   8,
          background:     isLong ? 'rgba(0,229,176,0.12)' : 'rgba(255,77,106,0.12)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
        }}>
          {isLong
            ? <TrendingUp  size={18} color="#00e5b0" />
            : <TrendingDown size={18} color="#ff4d6a" />}
        </div>

        {/* Pair + mentor */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize:   15,
              fontWeight: 700,
              color:      'var(--text)',
              letterSpacing: '0.02em',
            }}>
              {entry.pair}
            </span>

            <span style={{
              fontSize:    11,
              fontWeight:  600,
              padding:     '2px 7px',
              borderRadius: 4,
              background:  isLong ? 'rgba(0,229,176,0.15)' : 'rgba(255,77,106,0.15)',
              color:       isLong ? '#00e5b0' : '#ff4d6a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {entry.direction}
            </span>

            {/* Grade badge */}
            {entry.setup_grade && (
              <span style={{
                fontFamily:   '"IBM Plex Mono", monospace',
                fontSize:     11,
                fontWeight:   700,
                padding:      '2px 7px',
                borderRadius: 4,
                background:   `${gradeColour}22`,
                color:        gradeColour,
                border:       `1px solid ${gradeColour}44`,
              }}>
                {entry.setup_grade}
              </span>
            )}

            {/* Override warning */}
            {entry.grade_override && (
              <span style={{
                display:      'flex',
                alignItems:   'center',
                gap:          3,
                fontSize:     11,
                fontWeight:   600,
                padding:      '2px 7px',
                borderRadius: 4,
                background:   'rgba(251,191,36,0.12)',
                color:        '#fbbf24',
                border:       '1px solid rgba(251,191,36,0.3)',
              }}>
                <AlertTriangle size={10} />
                Override
              </span>
            )}

            {/* Alert badge */}
            {entry.alert_initiated && (
              <span style={{
                display:      'flex',
                alignItems:   'center',
                gap:          3,
                fontSize:     11,
                fontWeight:   600,
                padding:      '2px 7px',
                borderRadius: 4,
                background:   'rgba(77,142,255,0.12)',
                color:        '#4d8eff',
                border:       '1px solid rgba(77,142,255,0.3)',
              }}>
                <Bell size={10} />
                Alert
              </span>
            )}

            {/* Source badge */}
            <span style={{
              fontSize:     11,
              padding:      '2px 7px',
              borderRadius: 4,
              background:   entry.execution_source === 'playbuuk'
                ? 'rgba(0,229,176,0.08)'
                : 'rgba(107,127,163,0.12)',
              color:   entry.execution_source === 'playbuuk' ? '#00e5b0' : '#6b7fa3',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              {entry.execution_source === 'playbuuk' ? 'Via Playbuuk' : 'Manual'}
            </span>
          </div>

          {/* Mentor line */}
          {entry.playbook && (
            <div style={{
              marginTop:  3,
              fontSize:   12,
              color:      'var(--dim)',
              display:    'flex',
              alignItems: 'center',
              gap:        5,
            }}>
              <span>{entry.playbook.mentor.avatar_emoji}</span>
              <span>{entry.playbook.mentor.display_name}</span>
              <span style={{ color: 'var(--muted)' }}>·</span>
              <BookOpen size={10} style={{ opacity: 0.6 }} />
              <span style={{ opacity: 0.7 }}>{entry.playbook.strategy_name}</span>
            </div>
          )}
        </div>

        {/* Right side: outcome + pnl + time */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize:   16,
            fontWeight: 700,
            color:      outcomeStyle.colour,
          }}>
            {entry.pnl_r !== null ? fmtR(entry.pnl_r) : outcomeStyle.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {relativeTime(entry.created_at)}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          aria-label={expanded ? 'Collapse entry' : 'Expand entry'}
          style={{
            background:   'none',
            border:       'none',
            cursor:       'pointer',
            color:        'var(--muted)',
            padding:      4,
            display:      'flex',
            alignItems:   'center',
            marginLeft:   4,
          }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* ── Expanded details ───────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Trade details grid */}
              <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap:                 10,
              }}>
                {[
                  { label: 'Entry',    value: fmt(entry.entry_price)  },
                  { label: 'Stop',     value: fmt(entry.stop_loss)    },
                  { label: 'Target',   value: fmt(entry.take_profit)  },
                  { label: 'Lot Size', value: entry.lot_size !== null ? `${entry.lot_size.toFixed(2)}` : '—' },
                  { label: 'Risk',     value: entry.risk_r !== null   ? `${entry.risk_r.toFixed(2)}R` : '—' },
                  { label: 'Outcome',  value: outcomeStyle.label },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background:   'var(--surface)',
                    borderRadius: 8,
                    padding:      '9px 12px',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Emotion tag */}
              {entry.pre_trade_emotion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>Pre-trade emotion:</span>
                  <span style={{
                    fontSize:     12,
                    fontWeight:   600,
                    padding:      '3px 10px',
                    borderRadius: 20,
                    background:   `${emotionColour}18`,
                    color:        emotionColour ?? 'var(--dim)',
                    border:       `1px solid ${emotionColour}33`,
                  }}>
                    {entry.pre_trade_emotion}
                  </span>
                </div>
              )}

              {/* MT5 ticket */}
              {entry.mt5_ticket && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>MT5 ticket:</span>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize:   12,
                    color:      '#4d8eff',
                    display:    'flex',
                    alignItems: 'center',
                    gap:        4,
                  }}>
                    #{entry.mt5_ticket}
                    <ExternalLink size={11} />
                  </span>
                </div>
              )}

              {/* Override warning block */}
              {entry.grade_override && (
                <div style={{
                  display:      'flex',
                  gap:          10,
                  padding:      '10px 14px',
                  borderRadius: 8,
                  background:   'rgba(251,191,36,0.07)',
                  border:       '1px solid rgba(251,191,36,0.2)',
                }}>
                  <AlertTriangle size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#fbbf24', margin: 0, lineHeight: 1.5 }}>
                    Grade threshold overridden. You executed this trade despite the setup being below your minimum grade. This data is logged for your psychology analysis.
                  </p>
                </div>
              )}

              {/* Pre-trade notes */}
              {entry.notes && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Trade Notes
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--dim)', margin: 0, lineHeight: 1.6 }}>
                    {entry.notes}
                  </p>
                </div>
              )}

              {/* Post-trade note */}
              {entry.post_trade_note ? (
                <div style={{
                  padding:      '12px 14px',
                  borderRadius: 8,
                  background:   'var(--surface)',
                  border:       '1px solid var(--border)',
                }}>
                  <div style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        6,
                    marginBottom: 8,
                  }}>
                    <Pencil size={12} color="var(--accent)" />
                    <span style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      Post-Trade Reflection
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--dim)', margin: 0, lineHeight: 1.6 }}>
                    {entry.post_trade_note}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>
                  No post-trade reflection yet. Add one to improve your psychology insights.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
