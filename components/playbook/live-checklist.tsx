'use client'

// components/playbook/live-checklist.tsx
// The discipline enforcement UI — the psychology gate in checklist form.
//
// Architecture:
//   Props: checklist: ChecklistItem[]
//   On mount → loadChecklist(checklist) into checklistStore
//   Every 2.5s → market-store tick updates analysis →
//     useEffect runs evaluate(analysis) → autoResults + grade update →
//     React re-renders only changed rows
//
// Animation contract:
//   Auto item DETECTED   → checkmark springs in (scale 0.5→1) + row glow pulse
//   Auto item LOST       → checkmark fades out, circle fades in
//   Manual item TOGGLED  → checkmark springs in/out with haptic-feel spring
//   Grade change UP      → handled by SetupGrade (radial flash)
//   Grade change DOWN    → no animation (silent, to avoid distraction)
//
// Psychology framing:
//   Auto items: no click handler — you cannot argue with the market.
//   Manual items: clicking is a deliberate acknowledgement, not a guess.
//   "BOS either happened or it didn't."

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Zap, Hand } from 'lucide-react'
import { useChecklistStore, isItemChecked } from '@/stores/checklist-store'
import { useMarketStore } from '@/stores/market-store'
import { SetupGrade } from './setup-grade'
import type { ChecklistItem } from '@/lib/supabase/types'

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { color: string; rawColor: string; bg: string; border: string }> = {
  trend:     { color: 'var(--accent)', rawColor: '#00e5b0', bg: 'rgba(0,229,176,0.09)',    border: 'rgba(0,229,176,0.22)' },
  structure: { color: 'var(--info)',   rawColor: '#4d8eff', bg: 'rgba(77,142,255,0.09)',   border: 'rgba(77,142,255,0.22)' },
  entry:     { color: 'var(--gold)',   rawColor: '#fbbf24', bg: 'rgba(251,191,36,0.09)',   border: 'rgba(251,191,36,0.22)' },
  exit:      { color: 'var(--danger)', rawColor: '#ff4d6a', bg: 'rgba(255,77,106,0.09)',   border: 'rgba(255,77,106,0.2)'  },
  session:   { color: 'var(--cyan)',   rawColor: '#22d3ee', bg: 'rgba(34,211,238,0.09)',   border: 'rgba(34,211,238,0.22)' },
  pattern:   { color: 'var(--purple)', rawColor: '#a78bfa', bg: 'rgba(167,139,250,0.09)',  border: 'rgba(167,139,250,0.22)'},
  risk:      { color: 'var(--danger)', rawColor: '#ff4d6a', bg: 'rgba(255,77,106,0.07)',   border: 'rgba(255,77,106,0.18)' },
  default:   { color: 'var(--dim)',    rawColor: '#6b7fa3', bg: 'rgba(107,127,163,0.07)',  border: 'rgba(107,127,163,0.18)'},
}

function getCatStyle(category: string) {
  const key = category.toLowerCase()
  return CATEGORY_CONFIG[key] ?? CATEGORY_CONFIG.default!
}

// ─── ChecklistRow ─────────────────────────────────────────────────────────────

interface RowProps {
  item:        ChecklistItem
  checked:     boolean
  isPulse:     boolean   // just became auto-checked this tick
  onToggle:    (id: string) => void
  isFirst:     boolean
}

function ChecklistRow({ item, checked, isPulse, onToggle, isFirst }: RowProps) {
  const cat        = getCatStyle(item.category)
  const isReadOnly = item.auto   // auto items cannot be manually toggled

  const handleClick = () => {
    if (!isReadOnly) onToggle(item.id)
  }

  return (
    <motion.div
      layout="position"
      className="relative"
      style={{ borderTop: isFirst ? 'none' : '1px solid var(--border)' }}
    >
      {/* Row glow on detect */}
      <AnimatePresence>
        {isPulse && (
          <motion.div
            key="pulse"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ background: cat.bg }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={item.item}
        disabled={isReadOnly}
        onClick={handleClick}
        className="relative w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-200"
        animate={{
          backgroundColor: checked ? cat.bg : 'transparent',
        }}
        transition={{ duration: 0.25 }}
        whileHover={!isReadOnly ? { backgroundColor: cat.bg } : {}}
        style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
      >
        {/* Check icon with spring animation */}
        <span className="flex-shrink-0 mt-0.5 relative w-4 h-4" aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            {checked ? (
              <motion.span
                key="checked"
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              >
                <CheckCircle2
                  size={16}
                  style={{
                    color: cat.color,
                    filter: `drop-shadow(0 0 4px ${cat.rawColor}80)`,
                  }}
                />
              </motion.span>
            ) : (
              <motion.span
                key="unchecked"
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Circle size={16} style={{ color: 'var(--muted)' }} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.p
            className="text-sm leading-snug"
            animate={{ color: checked ? 'var(--text)' : 'var(--dim)' }}
            transition={{ duration: 0.2 }}
          >
            {item.item}
          </motion.p>

          {/* Meta row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="text-2xs px-1.5 py-0.5 rounded font-mono capitalize"
              style={{
                background: cat.bg,
                border: `1px solid ${cat.border}`,
                color: cat.color,
              }}
            >
              {item.category}
            </span>

            {item.auto ? (
              <span
                className="flex items-center gap-0.5 text-2xs font-mono"
                style={{ color: checked ? 'var(--purple)' : 'var(--muted)' }}
                title={`Auto-detected: ${item.evalKey ?? 'system'}`}
              >
                <Zap size={8} aria-hidden="true" />
                auto
              </span>
            ) : (
              <span
                className="flex items-center gap-0.5 text-2xs font-mono"
                style={{ color: 'var(--muted)' }}
              >
                <Hand size={8} aria-hidden="true" />
                manual
              </span>
            )}

            {item.weight > 1 && (
              <span
                className="text-2xs font-mono px-1 py-0.5 rounded"
                style={{
                  background: 'rgba(107,127,163,0.08)',
                  border: '1px solid rgba(107,127,163,0.15)',
                  color: 'var(--dim)',
                }}
              >
                ×{item.weight}
              </span>
            )}
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
}

// ─── CategoryGroup ────────────────────────────────────────────────────────────

interface GroupProps {
  category:    string
  items:       ChecklistItem[]
  autoResults: Record<string, boolean>
  manualState: Record<string, boolean>
  pulsingIds:  Set<string>
  onToggle:    (id: string) => void
  isFirst:     boolean
}

function CategoryGroup({ category, items, autoResults, manualState, pulsingIds, onToggle, isFirst }: GroupProps) {
  const cat         = getCatStyle(category)
  const checkedCount = items.filter(i => isItemChecked(i, autoResults, manualState)).length
  const allDone      = checkedCount === items.length

  return (
    <div style={{ borderTop: isFirst ? 'none' : '1px solid var(--border)' }}>
      {/* Category header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: 'rgba(0,0,0,0.2)',
          borderBottom: `1px solid ${cat.border}`,
        }}
      >
        <span className="text-xs font-semibold font-mono capitalize" style={{ color: cat.color }}>
          {category}
        </span>
        <span className="text-xs text-muted font-mono flex items-center gap-1">
          {checkedCount}/{items.length}
          {allDone && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              <CheckCircle2 size={11} style={{ color: cat.color }} aria-hidden="true" />
            </motion.span>
          )}
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col" style={{ background: 'var(--card)' }}>
        {items.map((item, idx) => (
          <ChecklistRow
            key={item.id}
            item={item}
            checked={isItemChecked(item, autoResults, manualState)}
            isPulse={pulsingIds.has(item.id)}
            onToggle={onToggle}
            isFirst={idx === 0}
          />
        ))}
      </div>
    </div>
  )
}

// ─── LiveChecklist ────────────────────────────────────────────────────────────

interface LiveChecklistProps {
  checklist: ChecklistItem[]
}

export function LiveChecklist({ checklist }: LiveChecklistProps) {
  // ── Checklist store ────────────────────────────────────────────────────────
  const loadChecklist  = useChecklistStore(s => s.loadChecklist)
  const evaluate       = useChecklistStore(s => s.evaluate)
  const toggleManual   = useChecklistStore(s => s.toggleManual)
  const reset          = useChecklistStore(s => s.reset)
  const checklistItems = useChecklistStore(s => s.checklistItems)
  const autoResults    = useChecklistStore(s => s.autoResults)
  const manualState    = useChecklistStore(s => s.manualState)
  const gradeResult    = useChecklistStore(s => s.gradeResult)

  // ── Market store ───────────────────────────────────────────────────────────
  const analysis = useMarketStore(s => s.analysis)

  // ── Load checklist on mount / checklist change ─────────────────────────────
  const listKey = useMemo(
    () => checklist.map(i => i.id).join(','),
    [checklist],
  )
  useEffect(() => {
    loadChecklist(checklist)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey])  // loadChecklist is stable, listKey changes when items change

  // ── Evaluate on every market tick ─────────────────────────────────────────
  useEffect(() => {
    if (checklistItems.length > 0) evaluate(analysis)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis])  // evaluate is stable; checklistItems.length guards first run

  // ── Track items that just became auto-checked (for pulse animation) ────────
  const prevAutoRef  = useRef<Record<string, boolean>>({})
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const justChecked = checklistItems.filter(
      item => item.auto &&
        autoResults[item.id] === true &&
        prevAutoRef.current[item.id] !== true,
    )
    if (justChecked.length > 0) {
      setPulsingIds(new Set(justChecked.map(i => i.id)))
      const t = setTimeout(() => setPulsingIds(new Set()), 1200)
      prevAutoRef.current = { ...autoResults }
      return () => clearTimeout(t)
    }
    prevAutoRef.current = { ...autoResults }
  }, [autoResults, checklistItems])

  // ── Group by category ──────────────────────────────────────────────────────
  const groups = useMemo(() => {
    return checklistItems.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
      const key = item.category.toLowerCase()
      if (!acc[key]) acc[key] = []
      acc[key]!.push(item)
      return acc
    }, {})
  }, [checklistItems])

  const { checkedCount, totalCount, checkedWeight, totalWeight } = gradeResult

  if (checklistItems.length === 0) return null

  return (
    <section aria-labelledby="checklist-heading" className="flex flex-col gap-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2
            id="checklist-heading"
            className="text-sm font-bold text-text"
            style={{ letterSpacing: '-0.01em' }}
          >
            Discipline Checklist
          </h2>
          <p className="text-xs text-dim mt-0.5 font-mono">
            {checkedCount}/{totalCount} items · {checkedWeight}/{totalWeight} pts
          </p>
        </div>

        {checkedCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted hover:text-dim transition-colors font-mono"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Grade display ───────────────────────────────────────────────── */}
      <SetupGrade />

      {/* ── Checklist groups ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {Object.entries(groups).map(([category, items], groupIdx) => (
          <CategoryGroup
            key={category}
            category={category}
            items={items}
            autoResults={autoResults}
            manualState={manualState}
            pulsingIds={pulsingIds}
            onToggle={toggleManual}
            isFirst={groupIdx === 0}
          />
        ))}
      </div>

      {/* ── Psychology reminder ──────────────────────────────────────────── */}
      <div
        className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
        style={{
          background: 'rgba(0,229,176,0.04)',
          border: '1px solid rgba(0,229,176,0.12)',
        }}
      >
        <Zap
          size={11}
          style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>Auto items</span>
          {' '}update from live market data every 2.5s. Manual items require your explicit confirmation.
        </p>
      </div>
    </section>
  )
}
