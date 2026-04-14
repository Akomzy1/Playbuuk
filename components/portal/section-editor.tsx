'use client'

// components/portal/section-editor.tsx
// Generic section editor for string-array playbook fields.
//
// Handles: core_concepts, entry_rules, exit_rules, indicators,
//          golden_rules, common_mistakes, preferred_pairs
//
// Layout per section:
//   ┌──────────────────────────────────────────────────────────────┐
//   │  ▼ Section Title     [n items]     [Edit] ─────────────────  │
//   ├──────────────────────────────────────────────────────────────┤
//   │  PREVIEW: bullet list of items                               │
//   │  EDIT: draggable list + add/remove + save/cancel             │
//   └──────────────────────────────────────────────────────────────┘
//
// Drag reorder uses framer-motion Reorder (already in the dep tree).

import { useState, useId }      from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { ChevronDown, GripVertical, Plus, X, Save, Loader2, AlertCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StringItem {
  id:   string
  text: string
}

export interface SectionEditorProps {
  title:       string
  description?: string
  playbookId:  string
  field:       string
  value:       string[]
  placeholder?: string
  accentColor?: string
  maxItems?:   number
  onSaved:     (field: string, newValue: string[]) => void
}

// ─── SectionEditor ────────────────────────────────────────────────────────────

export function SectionEditor({
  title, description, playbookId, field, value, placeholder,
  accentColor = 'rgba(0,229,176,0.25)', maxItems = 25, onSaved,
}: SectionEditorProps) {
  const uid = useId()
  const [isOpen,    setIsOpen]    = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [items,     setItems]     = useState<StringItem[]>([])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function toItems(arr: string[]): StringItem[] {
    return arr.map((text, i) => ({ id: `${uid}-${i}-${Date.now() + i}`, text }))
  }

  function startEdit() {
    setItems(toItems(value))
    setError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  function addItem() {
    if (items.length >= maxItems) return
    setItems(prev => [...prev, { id: `${uid}-new-${Date.now()}`, text: '' }])
  }

  function updateItem(id: string, text: string) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, text } : it))
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function save() {
    const texts = items.map(it => it.text.trim()).filter(t => t.length > 0)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/playbooks/${playbookId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: texts }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      onSaved(field, texts)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const isEmpty = value.length === 0

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--card)',
        border:     '1px solid var(--border)',
        borderTop:  `2px solid ${accentColor}`,
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
            {title}
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

        {/* Controls */}
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
              {description && (
                <p className="text-xs text-muted mb-3 leading-relaxed">{description}</p>
              )}

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

              {/* ── EDIT MODE ──────────────────────────────────────────────── */}
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <Reorder.Group
                    axis="y"
                    values={items}
                    onReorder={setItems}
                    as="div"
                    className="flex flex-col gap-2"
                  >
                    <AnimatePresence mode="popLayout">
                      {items.map((item, index) => (
                        <Reorder.Item
                          key={item.id}
                          value={item}
                          as="div"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{   opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-2 group"
                          style={{ cursor: 'grab' }}
                        >
                          <GripVertical
                            size={14}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
                            style={{ color: 'var(--muted)', cursor: 'grab' }}
                            aria-hidden="true"
                          />
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-2xs font-mono"
                            style={{ background: 'var(--surface)', color: 'var(--muted)' }}
                            aria-hidden="true"
                          >
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={item.text}
                            onChange={e => updateItem(item.id, e.target.value)}
                            placeholder={placeholder ?? `${title.replace(/s$/, '')} rule…`}
                            className="flex-1 rounded-lg text-sm focus:outline-none transition-colors"
                            style={{
                              background: 'var(--bg)',
                              border:     '1px solid var(--border)',
                              color:      'var(--text)',
                              padding:    '7px 10px',
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
                        </Reorder.Item>
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>

                  {items.length < maxItems && (
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold mt-1 transition-all duration-150"
                      style={{
                        background: 'var(--surface)', border: '1px dashed var(--border)',
                        color: 'var(--dim)', cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(0,229,176,0.4)'
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--dim)'
                      }}
                    >
                      <Plus size={12} aria-hidden="true" />
                      Add {title.replace(/s$/, '').toLowerCase()}
                    </button>
                  )}
                </div>
              ) : (
                /* ── PREVIEW MODE ──────────────────────────────────────────── */
                isEmpty ? (
                  <p className="text-xs text-muted italic py-1">
                    No items yet. Click Edit to add {title.toLowerCase()}.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2" role="list">
                    {value.map((text, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-dim leading-relaxed">
                        <span
                          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-2xs font-mono mt-0.5"
                          style={{ background: 'var(--surface)', color: 'var(--muted)' }}
                          aria-hidden="true"
                        >
                          {i + 1}
                        </span>
                        {text}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
