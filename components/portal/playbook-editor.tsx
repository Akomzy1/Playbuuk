'use client'

// components/portal/playbook-editor.tsx
// Main orchestration client component for the mentor playbook editor.
//
// Sections:
//   ① Overview          — strategy_name, summary, timeframes, session_preference
//   ② Core Concepts     — SectionEditor (core_concepts)
//   ③ Entry Rules       — SectionEditor (entry_rules)  [Pro-only for traders]
//   ④ Exit Rules        — SectionEditor (exit_rules)   [Pro-only]
//   ⑤ Indicators        — SectionEditor (indicators)   [Pro-only]
//   ⑥ Golden Rules      — SectionEditor (golden_rules)
//   ⑦ Common Mistakes   — SectionEditor (common_mistakes)
//   ⑧ Preferred Pairs   — inline tag editor (preferred_pairs)
//   ⑨ Checklist         — ChecklistEditor
//   ⑩ Risk Management   — inline numeric form (risk_management)
//   ⑪ Submit for Review — CTA button (if is_ai_draft or never submitted)
//
// Each section saves independently. No global form state.

import { useState }            from 'react'
import {
  Save, Loader2, AlertCircle, CheckCircle2,
  ShieldCheck, Clock, X, Plus,
} from 'lucide-react'

import { SectionEditor }   from '@/components/portal/section-editor'
import { ChecklistEditor, type ChecklistItem } from '@/components/portal/checklist-editor'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskManagement {
  risk_per_trade_pct?: number
  rr_ratio?:          number
  max_daily_loss_pct?: number
  max_lot_size?:      number
  preferred_lot_size?: number
}

export interface PlaybookEditorProps {
  playbookId:          string
  isAiDraft:           boolean
  onboardingStatus:    string  // mentor.onboarding_status
  strategyName:        string
  summary:             string | null
  timeframes:          string[]
  sessionPreference:   string | null
  coreConcepts:        string[]
  entryRules:          string[]
  exitRules:           string[]
  indicators:          string[]
  goldenRules:         string[]
  commonMistakes:      string[]
  preferredPairs:      string[]
  checklist:           ChecklistItem[]
  riskManagement:      RiskManagement | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEFRAME_OPTIONS = ['M1','M5','M15','M30','H1','H4','D1','W1','MN']
const SESSION_OPTIONS   = [
  { value: '',          label: 'Any session' },
  { value: 'sydney',    label: 'Sydney' },
  { value: 'tokyo',     label: 'Tokyo / Asia' },
  { value: 'london',    label: 'London' },
  { value: 'new_york',  label: 'New York' },
  { value: 'london_ny', label: 'London + New York Overlap' },
]

// ─── OverviewEditor ───────────────────────────────────────────────────────────

function OverviewEditor({
  playbookId, strategyName, summary, timeframes, sessionPreference,
  onSaved,
}: {
  playbookId:        string
  strategyName:      string
  summary:           string | null
  timeframes:        string[]
  sessionPreference: string | null
  onSaved: (patch: { strategyName?: string; summary?: string | null; timeframes?: string[]; sessionPreference?: string | null }) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [draftName,    setDraftName]    = useState(strategyName)
  const [draftSummary, setDraftSummary] = useState(summary ?? '')
  const [draftTFs,     setDraftTFs]     = useState<string[]>(timeframes)
  const [draftSession, setDraftSession] = useState(sessionPreference ?? '')

  function startEdit() {
    setDraftName(strategyName)
    setDraftSummary(summary ?? '')
    setDraftTFs(timeframes)
    setDraftSession(sessionPreference ?? '')
    setError(null)
    setIsEditing(true)
  }

  function cancelEdit() { setIsEditing(false); setError(null) }

  function toggleTF(tf: string) {
    setDraftTFs(prev =>
      prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf]
    )
  }

  async function save() {
    if (!draftName.trim()) return setError('Strategy name is required')
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/playbooks/${playbookId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          strategy_name:      draftName.trim(),
          summary:            draftSummary.trim() || null,
          timeframes:         draftTFs,
          session_preference: draftSession || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      onSaved({
        strategyName:      draftName.trim(),
        summary:           draftSummary.trim() || null,
        timeframes:        draftTFs,
        sessionPreference: draftSession || null,
      })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--card)',
        border:     '1px solid var(--border)',
        borderTop:  '2px solid rgba(0,229,176,0.3)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
          Overview
        </span>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button" onClick={startEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dim)' }}
            >
              Edit
            </button>
          ) : (
            <>
              <button type="button" onClick={cancelEdit} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >Cancel</button>
              <button type="button" onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{
                  background: saving ? 'var(--surface)' : 'var(--accent)',
                  color:      saving ? 'var(--muted)' : 'var(--bg)',
                  border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 text-xs font-mono"
            style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
            role="alert"
          >
            <AlertCircle size={12} />{error}
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col gap-4">
            {/* Strategy name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted">Strategy Name</label>
              <input
                type="text"
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                placeholder="e.g. Smart Money Concepts — London Breakout"
                className="rounded-xl text-sm focus:outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>

            {/* Summary */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted">Summary <span style={{ color: 'var(--dim)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                value={draftSummary}
                onChange={e => setDraftSummary(e.target.value)}
                rows={3}
                maxLength={3000}
                placeholder="Describe your strategy in 2–4 sentences. This is what traders see on your profile card."
                className="rounded-xl text-sm focus:outline-none resize-y"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', minHeight: 80 }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
              <span className="text-2xs font-mono text-muted self-end">{draftSummary.length}/3000</span>
            </div>

            {/* Timeframes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted">Timeframes</label>
              <div className="flex flex-wrap gap-1.5">
                {TIMEFRAME_OPTIONS.map(tf => {
                  const active = draftTFs.includes(tf)
                  return (
                    <button
                      key={tf} type="button"
                      onClick={() => toggleTF(tf)}
                      className="text-xs font-mono px-2.5 py-1 rounded-lg transition-all duration-100"
                      style={active ? {
                        background: 'rgba(0,229,176,0.12)',
                        border:     '1px solid rgba(0,229,176,0.35)',
                        color:      'var(--accent)',
                        cursor:     'pointer',
                      } : {
                        background: 'var(--surface)',
                        border:     '1px solid var(--border)',
                        color:      'var(--dim)',
                        cursor:     'pointer',
                      }}
                    >{tf}</button>
                  )
                })}
              </div>
            </div>

            {/* Session */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted">Preferred Session</label>
              <select
                value={draftSession}
                onChange={e => setDraftSession(e.target.value)}
                className="rounded-xl text-sm focus:outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', cursor: 'pointer' }}
              >
                {SESSION_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* Preview */
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-mono text-muted mb-0.5">Strategy Name</p>
              <p className="text-base font-bold text-text" style={{ letterSpacing: '-0.02em' }}>{strategyName}</p>
            </div>
            {summary && (
              <div>
                <p className="text-xs font-mono text-muted mb-0.5">Summary</p>
                <p className="text-sm text-dim leading-relaxed">{summary}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {timeframes.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-muted mb-1">Timeframes</p>
                  <div className="flex flex-wrap gap-1">
                    {timeframes.map(tf => (
                      <span key={tf}
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)', color: 'var(--accent)' }}
                      >{tf}</span>
                    ))}
                  </div>
                </div>
              )}
              {sessionPreference && (
                <div>
                  <p className="text-xs font-mono text-muted mb-1">Session</p>
                  <span className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dim)' }}
                  >
                    {SESSION_OPTIONS.find(s => s.value === sessionPreference)?.label ?? sessionPreference}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PairsEditor ──────────────────────────────────────────────────────────────

function PairsEditor({
  playbookId, value, onSaved,
}: {
  playbookId: string
  value:      string[]
  onSaved:    (pairs: string[]) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [draft,     setDraft]     = useState<string[]>([])
  const [input,     setInput]     = useState('')

  function startEdit() { setDraft([...value]); setInput(''); setError(null); setIsEditing(true) }
  function cancelEdit() { setIsEditing(false); setError(null) }

  function addPair() {
    const v = input.trim().toUpperCase()
    if (!v || draft.includes(v) || draft.length >= 20) return
    setDraft(p => [...p, v])
    setInput('')
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addPair() }
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/playbooks/${playbookId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ preferred_pairs: draft }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      onSaved(draft)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: '2px solid rgba(251,191,36,0.3)' }}
    >
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>Preferred Pairs</span>
          {value.length > 0 && (
            <span className="text-2xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            >{value.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button type="button" onClick={startEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dim)' }}
            >Edit</button>
          ) : (
            <>
              <button type="button" onClick={cancelEdit} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >Cancel</button>
              <button type="button" onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: saving ? 'var(--surface)' : 'var(--accent)', color: saving ? 'var(--muted)' : 'var(--bg)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 text-xs font-mono"
            style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
            role="alert"
          >
            <AlertCircle size={12} />{error}
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5 min-h-8">
              {draft.map(pair => (
                <span key={pair} className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: 'var(--gold)' }}
                >
                  {pair}
                  <button type="button" onClick={() => setDraft(p => p.filter(x => x !== pair))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', lineHeight: 1 }}
                    aria-label={`Remove ${pair}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {draft.length === 0 && (
                <span className="text-xs text-muted italic">No pairs added yet</span>
              )}
            </div>
            {draft.length < 20 && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value.toUpperCase())}
                  onKeyDown={handleKey}
                  placeholder="EURUSD, GBPUSD… press Enter"
                  maxLength={12}
                  className="flex-1 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
                <button type="button" onClick={addPair}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer' }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            )}
          </div>
        ) : (
          value.length === 0 ? (
            <p className="text-xs text-muted italic py-1">No preferred pairs specified.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {value.map(pair => (
                <span key={pair} className="text-xs font-mono px-2.5 py-1 rounded"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', color: 'var(--gold)' }}
                >{pair}</span>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── RiskEditor ───────────────────────────────────────────────────────────────

function RiskEditor({
  playbookId, value, onSaved,
}: {
  playbookId: string
  value:      RiskManagement | null
  onSaved:    (r: RiskManagement) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const empty: RiskManagement = {
    risk_per_trade_pct: undefined,
    rr_ratio:           undefined,
    max_daily_loss_pct: undefined,
    max_lot_size:       undefined,
    preferred_lot_size: undefined,
  }

  const [draft, setDraft] = useState<RiskManagement>(value ?? empty)

  function startEdit() { setDraft(value ?? empty); setError(null); setIsEditing(true) }
  function cancelEdit() { setIsEditing(false); setError(null) }

  function num(raw: string): number | undefined {
    const v = parseFloat(raw)
    return isNaN(v) ? undefined : v
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/playbooks/${playbookId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ risk_management: draft }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      onSaved(draft)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const fields: { key: keyof RiskManagement; label: string; placeholder: string; unit: string }[] = [
    { key: 'risk_per_trade_pct', label: 'Risk Per Trade',     placeholder: '1.0',  unit: '%' },
    { key: 'rr_ratio',           label: 'Min R:R Ratio',      placeholder: '2.0',  unit: ':1' },
    { key: 'max_daily_loss_pct', label: 'Max Daily Loss',     placeholder: '3.0',  unit: '%' },
    { key: 'max_lot_size',       label: 'Max Lot Size',       placeholder: '1.0',  unit: 'lots' },
    { key: 'preferred_lot_size', label: 'Preferred Lot Size', placeholder: '0.10', unit: 'lots' },
  ]

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: '2px solid rgba(255,77,106,0.3)' }}
    >
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>Risk Management</span>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button type="button" onClick={startEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dim)' }}
            >Edit</button>
          ) : (
            <>
              <button type="button" onClick={cancelEdit} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >Cancel</button>
              <button type="button" onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: saving ? 'var(--surface)' : 'var(--accent)', color: saving ? 'var(--muted)' : 'var(--bg)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 text-xs font-mono"
            style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
            role="alert"
          ><AlertCircle size={12} />{error}</div>
        )}

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map(f => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">{f.label}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={draft[f.key] ?? ''}
                    onChange={e => setDraft(p => ({ ...p, [f.key]: num(e.target.value) }))}
                    placeholder={f.placeholder}
                    step="0.01"
                    className="flex-1 rounded-lg text-sm font-mono focus:outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                  <span className="text-xs font-mono text-muted flex-shrink-0">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !value || Object.values(value).every(v => v === undefined || v === null) ? (
            <p className="text-xs text-muted italic py-1">No risk parameters set.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fields.map(f => {
                const v = value[f.key]
                if (v === undefined || v === null) return null
                return (
                  <div key={f.key}
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-2xs font-mono text-muted mb-0.5">{f.label}</p>
                    <p className="text-sm font-mono text-text">
                      {v}{f.unit}
                    </p>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── SubmitForReview ──────────────────────────────────────────────────────────

function SubmitForReview({
  playbookId, isAiDraft, onboardingStatus, onSubmitted,
}: {
  playbookId:       string
  isAiDraft:        boolean
  onboardingStatus: string
  onSubmitted:      () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  if (onboardingStatus === 'verified') return null
  if (onboardingStatus === 'under_review' && !done) {
    return (
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
        style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)' }}
      >
        <Clock size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <div>
          <p className="text-sm font-bold text-text" style={{ color: 'var(--gold)' }}>Under Review</p>
          <p className="text-xs text-muted mt-0.5">Your playbook has been submitted and is being reviewed by the Playbuuk team. We'll notify you when approved.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
        style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.2)' }}
      >
        <CheckCircle2 size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Submitted for Review</p>
          <p className="text-xs text-muted mt-0.5">Your playbook has been submitted. The Playbuuk team will review it and contact you if any changes are needed.</p>
        </div>
      </div>
    )
  }

  async function submit() {
    setSubmitting(true); setError(null)
    try {
      const res = await fetch(`/api/playbooks/${playbookId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ submit_for_review: true }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setDone(true)
      setConfirming(false)
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(0,229,176,0.04)', border: '2px solid rgba(0,229,176,0.25)' }}
    >
      <div className="px-5 py-5">
        <div className="flex items-start gap-3 mb-4">
          <ShieldCheck size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-base font-bold text-text" style={{ letterSpacing: '-0.02em' }}>
              Submit Playbook for Verification
            </p>
            <p className="text-xs text-dim mt-1 leading-relaxed">
              Once submitted, the Playbuuk team will review your playbook for accuracy and completeness.
              Verified mentors receive the <strong className="text-accent">✓ Verified</strong> badge and
              gain access to any accrued revenue in escrow.
            </p>
            {isAiDraft && (
              <div className="flex items-center gap-2 mt-2 text-xs font-mono text-muted">
                <AlertCircle size={11} />
                This playbook was AI-drafted. Review all sections carefully before submitting.
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 text-xs font-mono"
            style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
            role="alert"
          ><AlertCircle size={12} />{error}</div>
        )}

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-150"
            style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <ShieldCheck size={15} />
            Submit for Verification
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text">
              Are you sure? This will mark your playbook as submitted for review. You can still edit it, but status will reset.
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setConfirming(false)} disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-muted"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >Go back</button>
              <button type="button" onClick={submit} disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: submitting ? 'var(--surface)' : 'var(--accent)', color: submitting ? 'var(--muted)' : 'var(--bg)', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {submitting ? 'Submitting…' : 'Yes, submit now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PlaybookEditor ───────────────────────────────────────────────────────────

export function PlaybookEditor(props: PlaybookEditorProps) {
  const [state, setState] = useState({
    strategyName:      props.strategyName,
    summary:           props.summary,
    timeframes:        props.timeframes,
    sessionPreference: props.sessionPreference,
    coreConcepts:      props.coreConcepts,
    entryRules:        props.entryRules,
    exitRules:         props.exitRules,
    indicators:        props.indicators,
    goldenRules:       props.goldenRules,
    commonMistakes:    props.commonMistakes,
    preferredPairs:    props.preferredPairs,
    checklist:         props.checklist,
    riskManagement:    props.riskManagement,
    isAiDraft:         props.isAiDraft,
    onboardingStatus:  props.onboardingStatus,
  })

  return (
    <div className="flex flex-col gap-4">
      {/* AI Draft banner */}
      {state.isAiDraft && state.onboardingStatus !== 'under_review' && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <AlertCircle size={15} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <p className="text-xs text-dim leading-relaxed">
            <strong className="text-gold" style={{ color: 'var(--gold)' }}>AI Draft</strong> — This playbook was extracted by AI from publicly available content.
            Review each section carefully, make any corrections, then submit for verification to earn your badge and unlock your escrow balance.
          </p>
        </div>
      )}

      {/* ① Overview */}
      <OverviewEditor
        playbookId={props.playbookId}
        strategyName={state.strategyName}
        summary={state.summary}
        timeframes={state.timeframes}
        sessionPreference={state.sessionPreference}
        onSaved={patch => setState(p => ({ ...p, ...patch }))}
      />

      {/* ② Core Concepts */}
      <SectionEditor
        title="Core Concepts"
        description="The fundamental ideas behind your strategy — what the trader needs to understand before anything else."
        playbookId={props.playbookId}
        field="core_concepts"
        value={state.coreConcepts}
        placeholder="e.g. Price always moves from one area of interest to another…"
        accentColor="rgba(0,229,176,0.25)"
        onSaved={(_, v) => setState(p => ({ ...p, coreConcepts: v }))}
      />

      {/* ③ Entry Rules */}
      <SectionEditor
        title="Entry Rules"
        description="Exact conditions that must be met before taking a trade. Pro-tier content — only paying followers see this."
        playbookId={props.playbookId}
        field="entry_rules"
        value={state.entryRules}
        placeholder="e.g. Wait for a confirmed BOS on the M15 before entry…"
        accentColor="rgba(77,142,255,0.25)"
        onSaved={(_, v) => setState(p => ({ ...p, entryRules: v }))}
      />

      {/* ④ Exit Rules */}
      <SectionEditor
        title="Exit Rules"
        description="When to take profit, move stop loss, or exit early. Pro-tier content."
        playbookId={props.playbookId}
        field="exit_rules"
        value={state.exitRules}
        placeholder="e.g. Move SL to breakeven after price clears the first AOI…"
        accentColor="rgba(77,142,255,0.25)"
        onSaved={(_, v) => setState(p => ({ ...p, exitRules: v }))}
      />

      {/* ⑤ Indicators */}
      <SectionEditor
        title="Indicators"
        description="Indicators or tools used to confirm signals. Pro-tier content."
        playbookId={props.playbookId}
        field="indicators"
        value={state.indicators}
        placeholder="e.g. EMA 50 on the H1 as dynamic support…"
        accentColor="rgba(34,211,238,0.25)"
        onSaved={(_, v) => setState(p => ({ ...p, indicators: v }))}
      />

      {/* ⑥ Golden Rules */}
      <SectionEditor
        title="Golden Rules"
        description="Non-negotiable rules your followers must never break. Shown to free-tier followers."
        playbookId={props.playbookId}
        field="golden_rules"
        value={state.goldenRules}
        placeholder="e.g. Never trade the news. No trades after 3 consecutive losses…"
        accentColor="rgba(251,191,36,0.25)"
        onSaved={(_, v) => setState(p => ({ ...p, goldenRules: v }))}
      />

      {/* ⑦ Common Mistakes */}
      <SectionEditor
        title="Common Mistakes"
        description="Mistakes traders make with this strategy and how to avoid them."
        playbookId={props.playbookId}
        field="common_mistakes"
        value={state.commonMistakes}
        placeholder="e.g. Entering on a BOS without waiting for a pullback into the AOI…"
        accentColor="rgba(255,77,106,0.25)"
        onSaved={(_, v) => setState(p => ({ ...p, commonMistakes: v }))}
      />

      {/* ⑧ Preferred Pairs */}
      <PairsEditor
        playbookId={props.playbookId}
        value={state.preferredPairs}
        onSaved={pairs => setState(p => ({ ...p, preferredPairs: pairs }))}
      />

      {/* ⑨ Checklist */}
      <ChecklistEditor
        playbookId={props.playbookId}
        value={state.checklist}
        onSaved={cl => setState(p => ({ ...p, checklist: cl }))}
      />

      {/* ⑩ Risk Management */}
      <RiskEditor
        playbookId={props.playbookId}
        value={state.riskManagement}
        onSaved={r => setState(p => ({ ...p, riskManagement: r }))}
      />

      {/* ⑪ Submit for Review */}
      <SubmitForReview
        playbookId={props.playbookId}
        isAiDraft={state.isAiDraft}
        onboardingStatus={state.onboardingStatus}
        onSubmitted={() => setState(p => ({ ...p, isAiDraft: false, onboardingStatus: 'under_review' }))}
      />
    </div>
  )
}
