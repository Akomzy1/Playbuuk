'use client'

// components/journal/journal-form.tsx
// Manual trade entry form — for trades not executed via Playbuuk.
// Includes mentor/playbook selector, emotion picker, grade selector.

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, X, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MentorPlaybook {
  playbook_id:   string
  strategy_name: string
  mentor_id:     string
  display_name:  string
  avatar_emoji:  string
}

interface JournalFormProps {
  followedPlaybooks: MentorPlaybook[]
  onSuccess: (entry: { id: string }) => void
  onCancel:  () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTIONS = ['Calm', 'Conviction', 'FOMO', 'Revenge', 'Boredom'] as const
const GRADES   = ['A+', 'B+', 'C+', 'D+'] as const

const GRADE_COLOUR: Record<string, string> = {
  'A+': '#fbbf24',
  'B+': '#4d8eff',
  'C+': '#22d3ee',
  'D+': '#ff4d6a',
}

const EMOTION_COLOUR: Record<string, string> = {
  Calm:       '#00e5b0',
  Conviction: '#00e5b0',
  FOMO:       '#ff4d6a',
  Revenge:    '#ff4d6a',
  Boredom:    '#6b7fa3',
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#ff4d6a', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      style={{
        width:        '100%',
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 8,
        padding:      '9px 12px',
        color:        'var(--text)',
        fontSize:     14,
        fontFamily:   '"IBM Plex Mono", monospace',
        outline:      'none',
        boxSizing:    'border-box',
        ...style,
      }}
      {...props}
    />
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function JournalForm({ followedPlaybooks, onSuccess, onCancel }: JournalFormProps) {
  const [direction,   setDirection]   = useState<'long' | 'short'>('long')
  const [pair,        setPair]        = useState('')
  const [playbookId,  setPlaybookId]  = useState('')
  const [grade,       setGrade]       = useState('')
  const [emotion,     setEmotion]     = useState('')
  const [entryPrice,  setEntryPrice]  = useState('')
  const [stopLoss,    setStopLoss]    = useState('')
  const [takeProfit,  setTakeProfit]  = useState('')
  const [lotSize,     setLotSize]     = useState('')
  const [riskR,       setRiskR]       = useState('')
  const [notes,       setNotes]       = useState('')
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [submitting,  setSubmitting]  = useState(false)

  // Auto-fill SL/TP from playbook risk rules (not implemented here — future enhancement)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!pair.trim()) errs.pair = 'Pair is required'
    if (pair.length > 20) errs.pair = 'Max 20 characters'
    if (entryPrice && isNaN(Number(entryPrice))) errs.entry_price = 'Must be a number'
    if (stopLoss   && isNaN(Number(stopLoss)))   errs.stop_loss   = 'Must be a number'
    if (takeProfit && isNaN(Number(takeProfit))) errs.take_profit = 'Must be a number'
    if (lotSize    && isNaN(Number(lotSize)))    errs.lot_size    = 'Must be a number'
    if (riskR      && isNaN(Number(riskR)))      errs.risk_r      = 'Must be a number'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/journal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair:               pair.toUpperCase().trim(),
          direction,
          playbook_id:        playbookId    || undefined,
          setup_grade:        grade         || undefined,
          pre_trade_emotion:  emotion       || undefined,
          entry_price:        entryPrice    ? Number(entryPrice)  : undefined,
          stop_loss:          stopLoss      ? Number(stopLoss)    : undefined,
          take_profit:        takeProfit    ? Number(takeProfit)  : undefined,
          lot_size:           lotSize       ? Number(lotSize)     : undefined,
          risk_r:             riskR         ? Number(riskR)       : undefined,
          notes:              notes.trim()  || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrors({ form: data.error ?? 'Failed to save trade' })
        return
      }

      const { entry } = await res.json()
      onSuccess(entry)

    } catch {
      setErrors({ form: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{
        background:   'var(--card)',
        border:       '1px solid var(--border)',
        borderRadius: 12,
        padding:      '20px 22px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
          Log Manual Trade
        </h2>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Direction toggle + Pair */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'end' }}>
            {/* Direction */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Direction
              </label>
              <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {(['long', 'short'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    style={{
                      padding:    '8px 16px',
                      border:     'none',
                      cursor:     'pointer',
                      fontSize:   13,
                      fontWeight: 600,
                      display:    'flex',
                      alignItems: 'center',
                      gap:        5,
                      background: direction === d
                        ? d === 'long' ? 'rgba(0,229,176,0.15)' : 'rgba(255,77,106,0.15)'
                        : 'var(--surface)',
                      color: direction === d
                        ? d === 'long' ? '#00e5b0' : '#ff4d6a'
                        : 'var(--muted)',
                      transition: 'all 150ms',
                    }}
                  >
                    {d === 'long'
                      ? <TrendingUp size={13} />
                      : <TrendingDown size={13} />}
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Pair */}
            <Field label="Pair *" error={errors.pair}>
              <Input
                value={pair}
                onChange={e => setPair(e.target.value)}
                placeholder="EURUSD"
                style={{ textTransform: 'uppercase' }}
              />
            </Field>
          </div>

          {/* Playbook selector */}
          {followedPlaybooks.length > 0 && (
            <Field label="Mentor / Playbook (optional)">
              <div style={{ position: 'relative' }}>
                <select
                  value={playbookId}
                  onChange={e => setPlaybookId(e.target.value)}
                  style={{
                    width:        '100%',
                    background:   'var(--surface)',
                    border:       '1px solid var(--border)',
                    borderRadius: 8,
                    padding:      '9px 36px 9px 12px',
                    color:        playbookId ? 'var(--text)' : 'var(--muted)',
                    fontSize:     14,
                    outline:      'none',
                    appearance:   'none',
                    cursor:       'pointer',
                  }}
                >
                  <option value="">— No mentor —</option>
                  {followedPlaybooks.map(pb => (
                    <option key={pb.playbook_id} value={pb.playbook_id}>
                      {pb.avatar_emoji} {pb.display_name} · {pb.strategy_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              </div>
            </Field>
          )}

          {/* Grade */}
          <Field label="Setup Grade at Entry (optional)">
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setGrade('')}
                style={{
                  padding:      '7px 12px',
                  borderRadius: 6,
                  border:       `1px solid ${grade === '' ? 'var(--border)' : 'transparent'}`,
                  background:   grade === '' ? 'var(--surface)' : 'transparent',
                  color:        'var(--muted)',
                  fontSize:     12,
                  cursor:       'pointer',
                  fontWeight:   grade === '' ? 600 : 400,
                }}
              >
                None
              </button>
              {GRADES.map(g => {
                const col = GRADE_COLOUR[g]
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(grade === g ? '' : g)}
                    style={{
                      padding:      '7px 14px',
                      borderRadius: 6,
                      border:       `1px solid ${grade === g ? col : 'transparent'}`,
                      background:   grade === g ? `${col}18` : 'var(--surface)',
                      color:        grade === g ? col : 'var(--muted)',
                      fontSize:     13,
                      fontFamily:   '"IBM Plex Mono", monospace',
                      fontWeight:   700,
                      cursor:       'pointer',
                      transition:   'all 150ms',
                    }}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Pre-trade emotion */}
          <Field label="Pre-Trade Emotion (optional)">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOTIONS.map(em => {
                const col = EMOTION_COLOUR[em]
                return (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmotion(emotion === em ? '' : em)}
                    style={{
                      padding:      '6px 14px',
                      borderRadius: 20,
                      border:       `1px solid ${emotion === em ? col : 'var(--border)'}`,
                      background:   emotion === em ? `${col}18` : 'var(--surface)',
                      color:        emotion === em ? col : 'var(--muted)',
                      fontSize:     12,
                      fontWeight:   600,
                      cursor:       'pointer',
                      transition:   'all 150ms',
                    }}
                  >
                    {em}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Price fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
            <Field label="Entry Price" error={errors.entry_price}>
              <Input value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="1.09560" type="number" step="any" />
            </Field>
            <Field label="Stop Loss" error={errors.stop_loss}>
              <Input value={stopLoss}   onChange={e => setStopLoss(e.target.value)}   placeholder="1.09200" type="number" step="any" />
            </Field>
            <Field label="Take Profit" error={errors.take_profit}>
              <Input value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="1.10000" type="number" step="any" />
            </Field>
            <Field label="Lot Size" error={errors.lot_size}>
              <Input value={lotSize}    onChange={e => setLotSize(e.target.value)}    placeholder="0.10"    type="number" step="any" />
            </Field>
            <Field label="Risk (R)" error={errors.risk_r}>
              <Input value={riskR}      onChange={e => setRiskR(e.target.value)}      placeholder="1.0"     type="number" step="any" />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why did you take this trade? What did you see?"
              rows={3}
              style={{
                width:        '100%',
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 8,
                padding:      '9px 12px',
                color:        'var(--text)',
                fontSize:     14,
                outline:      'none',
                resize:       'vertical',
                fontFamily:   'inherit',
                boxSizing:    'border-box',
                lineHeight:   1.5,
              }}
            />
          </Field>

          {/* Form error */}
          {errors.form && (
            <p style={{ fontSize: 13, color: '#ff4d6a', margin: 0 }}>{errors.form}</p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding:      '9px 20px',
                borderRadius: 8,
                border:       '1px solid var(--border)',
                background:   'transparent',
                color:        'var(--dim)',
                fontSize:     14,
                cursor:       'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding:      '9px 24px',
                borderRadius: 8,
                border:       'none',
                background:   submitting ? 'var(--muted)' : 'var(--accent)',
                color:        '#050810',
                fontSize:     14,
                fontWeight:   700,
                cursor:       submitting ? 'not-allowed' : 'pointer',
                transition:   'opacity 150ms',
              }}
            >
              {submitting ? 'Saving…' : 'Log Trade'}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
