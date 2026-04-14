'use client'

// components/portal/checklist-editor.tsx
// Specialised checklist editor for the mentor portal.
//
// Each checklist item has:
//   text        — the rule text shown to traders
//   category    — structural grouping (structure/momentum/zone/session/indicator/psychology/custom)
//   weight      — importance 1–5 (shown as filled pips to the trader)
//   auto        — whether the system auto-detects this (vs trader must manually confirm)
//   evalKey     — if auto=true, the signal key the evaluator checks
//
// Layout:
//   ┌──────────────────────────────────────────────────────────────────────────┐
//   │  ▼ Checklist  [n items]  [Edit] ─────────────────────────────────────── │
//   ├──────────────────────────────────────────────────────────────────────────┤
//   │  PREVIEW: grouped items showing how traders see the checklist            │
//   │  EDIT: draggable rows — text + category + weight + auto + evalKey        │
//   └──────────────────────────────────────────────────────────────────────────┘

import { useState, useId }                 from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  ChevronDown, GripVertical, Plus, X, Save, Loader2,
  AlertCircle, Zap, Hand, ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvalKey =
  | 'trend_exists'   | 'aoi_count_2'     | 'price_in_aoi'
  | 'bos_detected'   | 'bos_synced'      | 'engulfing'
  | 'ema50_near'     | 'psych_level'     | 'session_active'
  | 'session_killzone' | 'tl_3touch'     | 'tl_valid_slope'
  | 'tl_span_week'   | 'fvg_detected'

export interface ChecklistItem {
  id:       string
  item:     string
  category: string
  weight:   number   // 1–5
  auto:     boolean
  evalKey:  EvalKey | null
}

export interface ChecklistEditorProps {
  playbookId: string
  value:      ChecklistItem[]
  onSaved:    (newValue: ChecklistItem[]) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'structure',   label: 'Market Structure', color: '#4d8eff' },
  { value: 'momentum',    label: 'Momentum',         color: '#00e5b0' },
  { value: 'zone',        label: 'Zone / AOI',       color: '#a78bfa' },
  { value: 'session',     label: 'Session',          color: '#fbbf24' },
  { value: 'indicator',   label: 'Indicator',        color: '#22d3ee' },
  { value: 'psychology',  label: 'Psychology',       color: '#fb923c' },
  { value: 'custom',      label: 'Custom',           color: '#6b7fa3' },
] as const

const EVAL_KEY_LABELS: Record<EvalKey, string> = {
  trend_exists:      'Trend Exists',
  aoi_count_2:       'Area of Interest ≥2',
  price_in_aoi:      'Price in AOI',
  bos_detected:      'Break of Structure',
  bos_synced:        'BOS (Multi-TF Sync)',
  engulfing:         'Engulfing Pattern',
  ema50_near:        'EMA 50 Proximity',
  psych_level:       'Psychological Level',
  session_active:    'Session Active',
  session_killzone:  'Killzone Active',
  tl_3touch:         'Trendline (3-Touch)',
  tl_valid_slope:    'Trendline Valid Slope',
  tl_span_week:      'Trendline Spans Week',
  fvg_detected:      'Fair Value Gap',
}

const EVAL_KEYS = Object.keys(EVAL_KEY_LABELS) as EvalKey[]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryMeta(value: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1]!
}

// ─── WeightPips ───────────────────────────────────────────────────────────────

function WeightPips({ weight, interactive = false, onChange }: {
  weight:       number
  interactive?: boolean
  onChange?:    (w: number) => void
}) {
  return (
    <div className="flex items-center gap-0.5" title={interactive ? `Weight: ${weight}/5` : undefined}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={interactive ? () => onChange?.(n) : undefined}
          className="rounded-sm transition-all duration-100"
          style={{
            width:      interactive ? 10 : 8,
            height:     interactive ? 10 : 8,
            background: n <= weight ? 'var(--accent)' : 'var(--border)',
            cursor:     interactive ? 'pointer' : 'default',
            flexShrink: 0,
            border:     'none',
            padding:    0,
          }}
          aria-label={interactive ? `Set weight ${n}` : undefined}
        />
      ))}
    </div>
  )
}

// ─── ChecklistEditor ──────────────────────────────────────────────────────────

export function ChecklistEditor({ playbookId, value, onSaved }: ChecklistEditorProps) {
  const uid                                  = useId()
  const [isOpen,    setIsOpen]    = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [items,     setItems]     = useState<ChecklistItem[]>([])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function startEdit() {
    setItems(value.map(it => ({ ...it })))
    setError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  function addItem() {
    if (items.length >= 40) return
    setItems(prev => [
      ...prev,
      {
        id:       `${uid}-new-${Date.now()}`,
        item:     '',
        category: 'structure',
        weight:   3,
        auto:     false,
        evalKey:  null,
      },
    ])
  }

  function updateItem(id: string, patch: Partial<ChecklistItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function save() {
    const valid = items.filter(it => it.item.trim().length > 0).map(it => ({
      ...it, item: it.item.trim(),
    }))
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/playbooks/${playbookId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ checklist: valid }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      onSaved(valid)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const isEmpty = value.length === 0

  // Group items for preview
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: value.filter(it => it.category === cat.value),
  })).filter(g => g.items.length > 0)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--card)',
        border:     '1px solid var(--border)',
        borderTop:  '2px solid rgba(77,142,255,0.4)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: isOpen ? '1px solid var(--border)' : 'none' }}
      >
        <button
          type="button"
          onClick={() => !isEditing && setIsOpen(o => !o)}
          className="flex items-center gap-2.5 flex-1 text-left"
          aria-expanded={isOpen}
        >
          <motion.span
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0"
          >
            <ChevronDown size={15} style={{ color: 'var(--muted)' }} aria-hidden="true" />
          </motion.span>
          <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
            Checklist
          </span>
          {!isEmpty && (
            <span
              className="text-2xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              {value.length}
            </span>
          )}
          {isEmpty && !isEditing && (
            <span className="text-2xs font-mono text-muted italic">Empty — click Edit to add</span>
          )}
        </button>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {!isEditing ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); startEdit(); setIsOpen(true) }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--dim)', cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.color = 'var(--text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--dim)'
              }}
            >
              Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                style={{
                  background: saving ? 'var(--surface)' : 'var(--accent)',
                  color:      saving ? 'var(--muted)'   : 'var(--bg)',
                  border:     'none', cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving
                  ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  : <Save    size={12} aria-hidden="true" />
                }
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{   height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4">
              {/* Error */}
              {error && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 text-xs font-mono"
                  style={{
                    background: 'rgba(255,77,106,0.06)',
                    border:     '1px solid rgba(255,77,106,0.2)',
                    color:      'var(--danger)',
                  }}
                  role="alert"
                >
                  <AlertCircle size={12} aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* ── EDIT MODE ────────────────────────────────────────────── */}
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-2xs font-mono text-muted px-1">
                    <span className="flex items-center gap-1.5">
                      <Zap size={10} style={{ color: 'var(--accent)' }} />
                      Auto-detected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Hand size={10} style={{ color: 'var(--dim)' }} />
                      Manual confirm
                    </span>
                    <span className="ml-auto">Weight = importance to the setup grade</span>
                  </div>

                  <Reorder.Group
                    axis="y"
                    values={items}
                    onReorder={setItems}
                    as="div"
                    className="flex flex-col gap-2"
                  >
                    <AnimatePresence mode="popLayout">
                      {items.map((item, index) => {
                        const catMeta = getCategoryMeta(item.category)
                        return (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            as="div"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{   opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.15 }}
                            className="group"
                            style={{ cursor: 'grab' }}
                          >
                            <div
                              className="rounded-xl overflow-hidden"
                              style={{
                                background: 'var(--surface)',
                                border:     `1px solid var(--border)`,
                              }}
                            >
                              {/* Row 1: drag + index + text + remove */}
                              <div className="flex items-center gap-2 px-3 py-2.5">
                                <GripVertical
                                  size={14}
                                  className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
                                  style={{ color: 'var(--muted)', cursor: 'grab' }}
                                  aria-hidden="true"
                                />
                                <span
                                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-2xs font-mono"
                                  style={{ background: 'var(--card)', color: 'var(--muted)' }}
                                  aria-hidden="true"
                                >
                                  {index + 1}
                                </span>
                                <input
                                  type="text"
                                  value={item.item}
                                  onChange={e => updateItem(item.id, { item: e.target.value })}
                                  placeholder="e.g. Price must be within an established AOI…"
                                  className="flex-1 rounded-lg text-sm focus:outline-none transition-colors"
                                  style={{
                                    background: 'var(--bg)',
                                    border:     '1px solid var(--border)',
                                    color:      'var(--text)',
                                    padding:    '6px 10px',
                                  }}
                                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                                  aria-label={`Remove item ${index + 1}`}
                                >
                                  <X size={14} aria-hidden="true" />
                                </button>
                              </div>

                              {/* Row 2: controls */}
                              <div
                                className="flex flex-wrap items-center gap-3 px-9 pb-2.5"
                                style={{ borderTop: '1px solid rgba(26,40,69,0.5)' }}
                              >
                                {/* Category */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-2xs font-mono text-muted">Category</span>
                                  <select
                                    value={item.category}
                                    onChange={e => updateItem(item.id, { category: e.target.value })}
                                    className="text-2xs font-mono rounded-lg px-2 py-1 focus:outline-none"
                                    style={{
                                      background: 'var(--card)',
                                      border:     `1px solid ${catMeta.color}40`,
                                      color:      catMeta.color,
                                      cursor:     'pointer',
                                    }}
                                  >
                                    {CATEGORIES.map(c => (
                                      <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Weight */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-2xs font-mono text-muted">Weight</span>
                                  <WeightPips
                                    weight={item.weight}
                                    interactive
                                    onChange={w => updateItem(item.id, { weight: w })}
                                  />
                                </div>

                                {/* Auto toggle */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-2xs font-mono text-muted">Auto-detect</span>
                                  <button
                                    type="button"
                                    onClick={() => updateItem(item.id, {
                                      auto:    !item.auto,
                                      evalKey: !item.auto ? (item.evalKey ?? EVAL_KEYS[0]) : null,
                                    })}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-mono font-bold transition-all duration-150"
                                    style={item.auto ? {
                                      background: 'rgba(0,229,176,0.1)',
                                      border:     '1px solid rgba(0,229,176,0.3)',
                                      color:      'var(--accent)',
                                      cursor:     'pointer',
                                    } : {
                                      background: 'var(--card)',
                                      border:     '1px solid var(--border)',
                                      color:      'var(--muted)',
                                      cursor:     'pointer',
                                    }}
                                  >
                                    {item.auto
                                      ? <><Zap size={9} aria-hidden="true" /> On</>
                                      : <><Hand size={9} aria-hidden="true" /> Off</>
                                    }
                                  </button>
                                </div>

                                {/* EvalKey — only visible when auto=true */}
                                {item.auto && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-2xs font-mono text-muted">Signal</span>
                                    <select
                                      value={item.evalKey ?? ''}
                                      onChange={e => updateItem(item.id, { evalKey: e.target.value as EvalKey })}
                                      className="text-2xs font-mono rounded-lg px-2 py-1 focus:outline-none"
                                      style={{
                                        background: 'var(--card)',
                                        border:     '1px solid rgba(0,229,176,0.25)',
                                        color:      'var(--accent)',
                                        cursor:     'pointer',
                                      }}
                                    >
                                      {EVAL_KEYS.map(k => (
                                        <option key={k} value={k}>{EVAL_KEY_LABELS[k]}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Reorder.Item>
                        )
                      })}
                    </AnimatePresence>
                  </Reorder.Group>

                  {items.length < 40 && (
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold mt-1 transition-all duration-150"
                      style={{
                        background: 'var(--surface)', border: '1px dashed var(--border)',
                        color: 'var(--dim)', cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(77,142,255,0.4)'
                        e.currentTarget.style.color = '#4d8eff'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--dim)'
                      }}
                    >
                      <Plus size={12} aria-hidden="true" />
                      Add checklist item
                    </button>
                  )}
                </div>
              ) : (
                /* ── PREVIEW MODE ──────────────────────────────────────────── */
                isEmpty ? (
                  <p className="text-xs text-muted italic py-1">
                    No checklist items yet. Click Edit to build your discipline checklist.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {grouped.map(group => (
                      <div key={group.value}>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-2xs font-mono font-bold px-2 py-0.5 rounded"
                            style={{
                              background: `${group.color}15`,
                              border:     `1px solid ${group.color}35`,
                              color:      group.color,
                            }}
                          >
                            {group.label}
                          </span>
                          <span className="text-2xs font-mono text-muted">
                            {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <ul className="flex flex-col gap-1.5">
                          {group.items.map(item => (
                            <li
                              key={item.id}
                              className="flex items-start gap-2.5 rounded-xl px-3 py-2"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                            >
                              {/* Auto / manual indicator */}
                              <span
                                className="flex-shrink-0 mt-0.5"
                                title={item.auto ? 'Auto-detected' : 'Manual confirm'}
                              >
                                {item.auto
                                  ? <Zap size={12} style={{ color: 'var(--accent)' }} aria-label="Auto-detected" />
                                  : <Hand size={12} style={{ color: 'var(--dim)' }} aria-label="Manual" />
                                }
                              </span>
                              {/* Text */}
                              <span className="flex-1 text-sm text-dim leading-relaxed">{item.item}</span>
                              {/* Signal tag */}
                              {item.auto && item.evalKey && (
                                <span
                                  className="flex-shrink-0 text-2xs font-mono px-1.5 py-0.5 rounded self-center"
                                  style={{
                                    background: 'rgba(0,229,176,0.06)',
                                    border:     '1px solid rgba(0,229,176,0.18)',
                                    color:      'var(--accent)',
                                  }}
                                >
                                  {EVAL_KEY_LABELS[item.evalKey]}
                                </span>
                              )}
                              {/* Weight pips */}
                              <span className="flex-shrink-0 self-center ml-1">
                                <WeightPips weight={item.weight} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
