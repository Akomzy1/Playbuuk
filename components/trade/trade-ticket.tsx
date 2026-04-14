'use client'

// components/trade/trade-ticket.tsx
// Pre-execution confirmation dialog — the moment of psychological accountability.
//
// This is the last gate before money moves. Design purpose:
//   · Force the trader to consciously review every parameter
//   · Surface the grade prominently — can't miss it
//   · Require an emotion tag — this data powers the psychology insights
//   · If grade override: show override warning prominently
//   · After execution: show MT5 ticket number + journal logged confirmation
//
// States:
//   'confirm'   → review + emotion tag selection
//   'executing' → loading (API call in flight)
//   'done'      → success with ticket number
//   'error'     → human-readable failure

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence }  from 'framer-motion'
import {
  X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Loader2, BookOpen, ShieldAlert, Target,
} from 'lucide-react'
import type { Grade }  from '@/lib/playbook/grader'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TradeDetails {
  accountId:    string
  playbookId:   string
  mentorName:   string
  symbol:       string
  direction:    'buy' | 'sell'
  volume:       number
  stopLoss:     number | undefined
  takeProfit:   number | undefined
  stopLossPips: number
  riskAmount:   number
  currency:     string
  grade:        Grade
  gradeOverride: boolean
}

interface TradeTicketProps {
  details:  TradeDetails
  onClose:  () => void
  onDone:   (orderId: string, journalId: string | null) => void
}

type TicketState = 'confirm' | 'executing' | 'done' | 'error'

// ─── Emotion options ──────────────────────────────────────────────────────────

const EMOTIONS = [
  { value: 'Calm',       emoji: '😌', label: 'Calm',       color: 'rgba(0,229,176,0.1)',    border: 'rgba(0,229,176,0.25)',    text: 'var(--accent)' },
  { value: 'Confident',  emoji: '💪', label: 'Confident',  color: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',   text: 'var(--gold)' },
  { value: 'Uncertain',  emoji: '🤔', label: 'Uncertain',  color: 'rgba(77,142,255,0.08)',  border: 'rgba(77,142,255,0.2)',    text: 'var(--info)' },
  { value: 'FOMO',       emoji: '😰', label: 'FOMO',       color: 'rgba(255,77,106,0.07)',  border: 'rgba(255,77,106,0.2)',    text: 'var(--danger)' },
  { value: 'Revenge',    emoji: '😤', label: 'Revenge',    color: 'rgba(255,77,106,0.07)',  border: 'rgba(255,77,106,0.2)',    text: 'var(--danger)' },
  { value: 'Bored',      emoji: '😑', label: 'Bored',      color: 'rgba(163,163,163,0.06)', border: 'rgba(163,163,163,0.15)',  text: 'var(--dim)' },
] as const

type EmotionValue = typeof EMOTIONS[number]['value']

// ─── Grade display config ─────────────────────────────────────────────────────

const GRADE_CONFIG: Record<Grade, { color: string; bg: string; border: string }> = {
  'A+': { color: 'var(--gold)',   bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)'  },
  'B+': { color: 'var(--accent)', bg: 'rgba(0,229,176,0.08)',  border: 'rgba(0,229,176,0.25)'  },
  'C+': { color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.2)'  },
  'D+': { color: 'var(--danger)', bg: 'rgba(255,77,106,0.07)', border: 'rgba(255,77,106,0.2)'  },
}

// ─── TradeTicket ──────────────────────────────────────────────────────────────

export function TradeTicket({ details, onClose, onDone }: TradeTicketProps) {
  const [ticketState, setTicketState] = useState<TicketState>('confirm')
  const [emotion,     setEmotion]     = useState<EmotionValue | null>(null)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [orderId,     setOrderId]     = useState('')
  const [journalId,   setJournalId]   = useState<string | null>(null)

  // Close on Escape (unless executing)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ticketState !== 'executing') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [ticketState, onClose])

  const handleExecute = useCallback(async () => {
    setTicketState('executing')

    try {
      const res = await fetch('/api/trade/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId:       details.accountId,
          symbol:          details.symbol,
          type:            details.direction,
          volume:          details.volume,
          stopLoss:        details.stopLoss,
          takeProfit:      details.takeProfit,
          playbookId:      details.playbookId,
          grade:           details.grade,
          gradeOverride:   details.gradeOverride,
          preTradeEmotion: emotion,
        }),
      })

      const data = await res.json() as {
        orderId?:    string
        journalId?:  string | null
        error?:      string
        detail?:     string
      }

      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? 'Execution failed')
      }

      setOrderId(data.orderId   ?? '')
      setJournalId(data.journalId ?? null)
      setTicketState('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMsg(message)
      setTicketState('error')
    }
  }, [details, emotion])

  const isBuy    = details.direction === 'buy'
  const gc       = GRADE_CONFIG[details.grade]
  const isJpy    = details.symbol.toUpperCase().includes('JPY')
  const decimals = isJpy ? 3 : 5

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm trade execution"
      onClick={e => {
        if (e.target === e.currentTarget && ticketState !== 'executing') onClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{   opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border:     '1px solid var(--border)',
          borderTop:  `2px solid ${isBuy ? 'rgba(77,142,255,0.5)' : 'rgba(255,77,106,0.5)'}`,
          boxShadow:  '0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)',
          maxHeight:  '90vh',
        }}
      >

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold"
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
              {isBuy ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {details.direction.toUpperCase()}
            </span>
            <span
              className="text-sm font-bold text-text font-mono"
              style={{ letterSpacing: '0.02em' }}
            >
              {details.symbol}
            </span>
          </div>

          {ticketState !== 'executing' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancel"
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors duration-150"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--card)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>

            {/* ── Confirm ─────────────────────────────────────────────── */}
            {ticketState === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{   opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col gap-4 p-5"
              >
                {/* Grade + override warning */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xs font-mono text-muted">SETUP GRADE</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-2xl font-bold font-mono"
                        style={{ color: gc.color, letterSpacing: '-0.02em' }}
                      >
                        {details.grade}
                      </span>
                      {details.gradeOverride && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-mono font-bold"
                          style={{
                            background: 'rgba(251,146,60,0.1)',
                            border:     '1px solid rgba(251,146,60,0.3)',
                            color:      'var(--warning)',
                          }}
                        >
                          <AlertTriangle size={9} />
                          OVERRIDE
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xs font-mono text-muted">MENTOR</p>
                    <p className="text-xs font-semibold text-dim mt-1">{details.mentorName}</p>
                  </div>
                </div>

                {/* Override reminder */}
                {details.gradeOverride && (
                  <div
                    className="flex items-start gap-2.5 rounded-xl p-3"
                    style={{
                      background: 'rgba(251,146,60,0.05)',
                      border:     '1px solid rgba(251,146,60,0.15)',
                    }}
                  >
                    <AlertTriangle
                      size={12}
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--warning)' }}
                      aria-hidden="true"
                    />
                    <p className="text-2xs text-dim leading-relaxed">
                      This trade is below your minimum threshold.{' '}
                      <span style={{ color: 'var(--warning)' }}>
                        Override will be logged in your journal
                      </span>{' '}
                      and counted in your psychology insights.
                    </p>
                  </div>
                )}

                {/* Trade parameters */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {[
                    { label: 'Volume',  value: `${details.volume.toFixed(2)} lots` },
                    { label: 'Stop Loss',
                      value: details.stopLoss
                        ? details.stopLoss.toFixed(decimals)
                        : '—',
                      sub: details.stopLossPips > 0
                        ? `${details.stopLossPips.toFixed(0)} pips · ${details.currency} ${details.riskAmount.toFixed(2)} risk`
                        : undefined,
                      icon: <ShieldAlert size={10} style={{ color: 'var(--danger)' }} />,
                    },
                    { label: 'Take Profit',
                      value: details.takeProfit
                        ? details.takeProfit.toFixed(decimals)
                        : '—',
                      icon: <Target size={10} style={{ color: 'var(--accent)' }} />,
                    },
                  ].map((row, i) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between px-3.5 py-2.5"
                      style={{
                        borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {row.icon}
                        <span className="text-2xs font-mono text-muted">{row.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-semibold text-text tabular-nums">
                          {row.value}
                        </span>
                        {row.sub && (
                          <p className="text-2xs font-mono text-muted mt-0.5">{row.sub}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Emotion selector */}
                <div>
                  <p
                    className="text-2xs font-mono text-dim mb-2"
                    style={{ letterSpacing: '0.04em' }}
                  >
                    HOW ARE YOU FEELING?{' '}
                    <span className="text-muted">(optional — builds your psychology profile)</span>
                  </p>
                  <div
                    className="grid grid-cols-3 gap-1.5"
                    role="radiogroup"
                    aria-label="Pre-trade emotion"
                  >
                    {EMOTIONS.map(e => {
                      const selected = emotion === e.value
                      return (
                        <button
                          key={e.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setEmotion(selected ? null : e.value as EmotionValue)}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-left transition-all duration-100"
                          style={{
                            background:  selected ? e.color       : 'var(--card)',
                            border:      `1px solid ${selected ? e.border : 'var(--border)'}`,
                            color:       selected ? e.text        : 'var(--dim)',
                            cursor:      'pointer',
                          }}
                        >
                          <span className="text-sm" aria-hidden="true">{e.emoji}</span>
                          <span className="text-2xs font-semibold">{e.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                    style={{
                      background: 'var(--card)',
                      border:     '1px solid var(--border)',
                      color:      'var(--dim)',
                      cursor:     'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--dim)';  e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleExecute()}
                    className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                    style={{
                      background: isBuy
                        ? 'linear-gradient(135deg, var(--accent), var(--info))'
                        : 'linear-gradient(135deg, var(--danger), #c73255)',
                      color:      '#fff',
                      border:     'none',
                      cursor:     'pointer',
                    }}
                  >
                    {isBuy ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    Confirm &amp; Execute on MT5
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Executing ───────────────────────────────────────────── */}
            {ticketState === 'executing' && (
              <motion.div
                key="executing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{   opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col items-center justify-center gap-4 py-12 px-5"
                aria-live="polite"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isBuy ? 'rgba(77,142,255,0.1)' : 'rgba(255,77,106,0.1)',
                    border:     `1px solid ${isBuy ? 'rgba(77,142,255,0.3)' : 'rgba(255,77,106,0.3)'}`,
                  }}
                  aria-hidden="true"
                >
                  <Loader2
                    size={20}
                    className="animate-spin"
                    style={{ color: isBuy ? 'var(--info)' : 'var(--danger)' }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text">Sending to MT5…</p>
                  <p className="text-2xs font-mono text-muted mt-1">
                    Connecting to broker via MetaApi
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Done ────────────────────────────────────────────────── */}
            {ticketState === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-4 p-6"
                aria-live="polite"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.05 }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(0,229,176,0.1)',
                    border:     '1px solid rgba(0,229,176,0.3)',
                    boxShadow:  '0 0 28px rgba(0,229,176,0.15)',
                  }}
                  aria-hidden="true"
                >
                  <CheckCircle2 size={26} style={{ color: 'var(--accent)' }} />
                </motion.div>

                <div className="text-center">
                  <p className="text-base font-bold text-text" style={{ letterSpacing: '-0.02em' }}>
                    Trade Executed
                  </p>
                  {orderId && (
                    <p className="text-2xs font-mono text-muted mt-1.5">
                      MT5 ticket{' '}
                      <span
                        className="px-1.5 py-0.5 rounded font-bold"
                        style={{
                          background: 'var(--card)',
                          border:     '1px solid var(--border)',
                          color:      'var(--text)',
                        }}
                      >
                        #{orderId}
                      </span>
                    </p>
                  )}
                  {journalId && (
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <BookOpen size={11} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                      <span className="text-2xs font-mono" style={{ color: 'var(--accent)' }}>
                        Logged in your journal
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onDone(orderId, journalId)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                  style={{
                    background: 'var(--accent)',
                    color:      'var(--bg)',
                    border:     'none',
                    cursor:     'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--btn-primary-hover-bg)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)' }}
                >
                  Done
                </button>
              </motion.div>
            )}

            {/* ── Error ───────────────────────────────────────────────── */}
            {ticketState === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col items-center gap-4 p-6"
                aria-live="assertive"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255,77,106,0.08)',
                    border:     '1px solid rgba(255,77,106,0.2)',
                  }}
                  aria-hidden="true"
                >
                  <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text">Execution Failed</p>
                  <p className="text-xs text-dim mt-2 leading-relaxed max-w-xs" role="alert">
                    {errorMsg}
                  </p>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                    style={{
                      background: 'var(--card)',
                      border:     '1px solid var(--border)',
                      color:      'var(--dim)',
                      cursor:     'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketState('confirm')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                    style={{
                      background: 'var(--card)',
                      border:     '1px solid var(--border-hover)',
                      color:      'var(--text)',
                      cursor:     'pointer',
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  )
}
