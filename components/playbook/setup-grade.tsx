'use client'

// components/playbook/setup-grade.tsx
// THE psychology gate — the most authoritative number on the screen.
//
// Design mandate: when a trader looks at this, they should feel
// they can trust it. No ambiguity. No decoration that undermines the signal.
//
// Visual language:
//   A+ (≥85%) gold  — strong, warm, earned
//   B+ (≥70%) green — confident, proceed
//   C+ (≥50%) blue  — cautious, borderline
//   D+ (<50%) red   — stop, wait
//
// Animations:
//   • SVG ring fills smoothly as items get checked
//   • Grade letter snaps via spring when grade band changes
//   • Brief radial pulse on grade UPGRADE (C→B, B→A, etc.)
//   • "What's missing" section expands/collapses with motion.div height
//
// Reads entirely from useChecklistStore — no props required.
// Parent must have called loadChecklist() first.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Zap, Hand, AlertCircle } from 'lucide-react'
import { useChecklistStore, getMissingItemsSorted } from '@/stores/checklist-store'
import { canExecuteTrade, type Grade } from '@/lib/playbook/grader'

// ─── Grade config ─────────────────────────────────────────────────────────────

type GradeConfig = {
  color:    string
  rawColor: string  // hex for SVG stroke (vars don't work on SVG in some contexts)
  glow:     string  // rgba for box-shadow
  label:    string
  subtext:  string
  bg:       string  // tinted background
  border:   string
}

const GRADE_CONFIG: Record<Grade, GradeConfig> = {
  'A+': {
    color:    'var(--gold)',
    rawColor: '#fbbf24',
    glow:     'rgba(251,191,36,0.4)',
    label:    'Strong setup — high confidence',
    subtext:  'All key criteria met. Execute with full conviction.',
    bg:       'rgba(251,191,36,0.06)',
    border:   'rgba(251,191,36,0.2)',
  },
  'B+': {
    color:    'var(--accent)',
    rawColor: '#00e5b0',
    glow:     'rgba(0,229,176,0.35)',
    label:    'Good setup — proceed with normal risk',
    subtext:  'Most criteria confirmed. Standard position size.',
    bg:       'rgba(0,229,176,0.05)',
    border:   'rgba(0,229,176,0.2)',
  },
  'C+': {
    color:    'var(--info)',
    rawColor: '#4d8eff',
    glow:     'rgba(77,142,255,0.3)',
    label:    'Marginal setup — proceed with caution',
    subtext:  'Below optimal. Reduce size or wait for confirmation.',
    bg:       'rgba(77,142,255,0.05)',
    border:   'rgba(77,142,255,0.2)',
  },
  'D+': {
    color:    'var(--danger)',
    rawColor: '#ff4d6a',
    glow:     'rgba(255,77,106,0.35)',
    label:    'Weak setup — wait for better conditions',
    subtext:  'Key criteria not met. Patience is discipline.',
    bg:       'rgba(255,77,106,0.05)',
    border:   'rgba(255,77,106,0.18)',
  },
}

const GRADE_ORDER: Grade[] = ['D+', 'C+', 'B+', 'A+']
function gradeRank(g: Grade) { return GRADE_ORDER.indexOf(g) }

// ─── Animated ring ────────────────────────────────────────────────────────────

const R           = 52   // ring radius
const STROKE_W    = 7
const CIRCUMF     = 2 * Math.PI * R
const VIEWBOX_SZ  = (R + STROKE_W) * 2 + 4

function GradeRing({ score, grade, isUpgrading }: { score: number; grade: Grade; isUpgrading: boolean }) {
  const cfg         = GRADE_CONFIG[grade]
  const [animScore, setAnimScore] = useState(score)

  // Smooth the ring fill with a slight delay so it doesn't snap instantly
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimScore(score))
    return () => cancelAnimationFrame(id)
  }, [score])

  const offset  = CIRCUMF * (1 - animScore)
  const center  = VIEWBOX_SZ / 2

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: VIEWBOX_SZ, height: VIEWBOX_SZ }}>
      {/* Upgrade radial flash */}
      <AnimatePresence>
        {isUpgrading && (
          <motion.div
            key="upgrade-flash"
            className="absolute inset-0 rounded-full"
            initial={{ opacity: 0.6, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)` }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Ambient glow blob */}
      <div
        className="absolute inset-2 rounded-full blur-xl transition-all duration-700"
        style={{ background: cfg.glow, opacity: 0.35 }}
        aria-hidden="true"
      />

      {/* SVG ring */}
      <svg
        width={VIEWBOX_SZ}
        height={VIEWBOX_SZ}
        viewBox={`0 0 ${VIEWBOX_SZ} ${VIEWBOX_SZ}`}
        fill="none"
        className="relative"
        role="img"
        aria-label={`${Math.round(score * 100)}% setup score`}
      >
        {/* Track */}
        <circle
          cx={center} cy={center} r={R}
          strokeWidth={STROKE_W}
          stroke="var(--border)"
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <circle
          cx={center} cy={center} r={R}
          strokeWidth={STROKE_W}
          stroke={cfg.rawColor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMF}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: `${center}px ${center}px`,
            transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1), stroke 500ms ease',
            filter: `drop-shadow(0 0 6px ${cfg.glow})`,
          }}
        />
      </svg>

      {/* Grade label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <motion.span
          key={grade}
          className="font-bold font-mono leading-none"
          style={{
            color: cfg.rawColor,
            fontSize: '2rem',
            letterSpacing: '-0.03em',
            textShadow: `0 0 24px ${cfg.glow}`,
          }}
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        >
          {grade}
        </motion.span>
        <span className="text-xs font-mono text-muted">
          {Math.round(score * 100)}%
        </span>
      </div>
    </div>
  )
}

// ─── SetupGrade ───────────────────────────────────────────────────────────────

export function SetupGrade() {
  const gradeResult    = useChecklistStore(s => s.gradeResult)
  const checklistItems = useChecklistStore(s => s.checklistItems)

  const { grade, score, checkedCount, totalCount, missingItems } = gradeResult
  const cfg     = GRADE_CONFIG[grade]
  const canExec = canExecuteTrade(grade)

  // Track grade upgrades
  const prevGradeRef  = useRef<Grade>('D+')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showMissing, setShowMissing]  = useState(false)

  useEffect(() => {
    if (
      grade !== prevGradeRef.current &&
      gradeRank(grade) > gradeRank(prevGradeRef.current)
    ) {
      setIsUpgrading(true)
      const t = setTimeout(() => setIsUpgrading(false), 1000)
      prevGradeRef.current = grade
      return () => clearTimeout(t)
    }
    prevGradeRef.current = grade
  }, [grade])

  // Auto-close missing section when everything is met
  useEffect(() => {
    if (missingItems.length === 0) setShowMissing(false)
  }, [missingItems.length])

  const sortedMissing = getMissingItemsSorted(missingItems)

  if (checklistItems.length === 0) return null

  return (
    <section
      aria-labelledby="grade-heading"
      className="rounded-2xl overflow-hidden transition-all duration-500"
      style={{
        background: 'var(--card)',
        border: `1px solid ${cfg.border}`,
        boxShadow: isUpgrading ? `0 0 40px ${cfg.glow}` : `0 0 0px transparent`,
        transition: 'border-color 500ms, box-shadow 600ms',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{
          background: cfg.bg,
          borderBottom: `1px solid ${cfg.border}`,
          transition: 'background 500ms',
        }}
      >
        <div className="flex items-center gap-2">
          <h2
            id="grade-heading"
            className="text-sm font-bold text-text"
            style={{ letterSpacing: '-0.01em' }}
          >
            Setup Grade
          </h2>
          {/* Execution gate badge */}
          <span
            className="text-2xs font-mono px-1.5 py-0.5 rounded-md"
            style={{
              background: canExec ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
              border: `1px solid ${canExec ? 'rgba(0,229,176,0.25)' : 'rgba(255,77,106,0.25)'}`,
              color: canExec ? 'var(--accent)' : 'var(--danger)',
            }}
          >
            {canExec ? '✓ Execute' : '✕ Locked'}
          </span>
        </div>
        <span className="text-xs text-dim font-mono">{checkedCount}/{totalCount}</span>
      </div>

      {/* ── Main grade display ────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 p-4">
        <GradeRing score={score} grade={grade} isUpgrading={isUpgrading} />

        <div className="flex flex-col gap-2 min-w-0 flex-1">
          {/* Label */}
          <AnimatePresence mode="wait">
            <motion.p
              key={grade}
              className="font-bold leading-tight"
              style={{ color: cfg.color, fontSize: '0.9375rem', letterSpacing: '-0.015em' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {cfg.label}
            </motion.p>
          </AnimatePresence>

          {/* Subtext */}
          <p className="text-xs text-dim leading-relaxed">{cfg.subtext}</p>

          {/* Progress bar */}
          <div
            className="w-full rounded-full overflow-hidden mt-0.5"
            style={{ height: 4, background: 'var(--border)' }}
            role="progressbar"
            aria-valuenow={Math.round(score * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: cfg.rawColor }}
              initial={false}
              animate={{ width: `${score * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Execution gate message */}
          {!canExec && (
            <div
              className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg mt-0.5"
              style={{
                background: 'rgba(255,77,106,0.07)',
                border: '1px solid rgba(255,77,106,0.18)',
              }}
            >
              <AlertCircle
                size={11}
                style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }}
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--danger)' }}>
                {grade === 'D+'
                  ? 'Below minimum threshold. Trade execution locked.'
                  : 'Borderline. Reduce position size.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── What's missing ───────────────────────────────────────────────── */}
      {sortedMissing.length > 0 && (
        <div style={{ borderTop: `1px solid ${cfg.border}` }}>
          {/* Toggle */}
          <button
            type="button"
            onClick={() => setShowMissing(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 transition-colors duration-150"
            style={{ background: showMissing ? cfg.bg : 'transparent' }}
            aria-expanded={showMissing}
          >
            <span className="text-xs font-semibold font-mono" style={{ color: cfg.color }}>
              {sortedMissing.length} item{sortedMissing.length !== 1 ? 's' : ''} missing
            </span>
            <motion.span
              animate={{ rotate: showMissing ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', color: 'var(--dim)' }}
            >
              <ChevronDown size={14} aria-hidden="true" />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {showMissing && (
              <motion.div
                key="missing-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div className="flex flex-col" style={{ background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
                  {sortedMissing.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.15 }}
                      className="flex items-start gap-2.5 px-4 py-2.5"
                      style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}
                    >
                      {/* Icon by reason */}
                      <span
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: item.reason === 'auto_unmet' ? 'var(--muted)' : 'var(--danger)' }}
                        aria-hidden="true"
                      >
                        {item.reason === 'auto_unmet'
                          ? <Zap size={10} />
                          : <Hand size={10} />
                        }
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-dim leading-snug">{item.item}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="text-2xs font-mono px-1.5 py-0.5 rounded capitalize"
                            style={{
                              background: 'rgba(107,127,163,0.08)',
                              border: '1px solid rgba(107,127,163,0.2)',
                              color: 'var(--dim)',
                            }}
                          >
                            {item.category}
                          </span>
                          {item.weight > 1 && (
                            <span className="text-2xs font-mono text-muted">×{item.weight}</span>
                          )}
                          <span
                            className="text-2xs font-mono"
                            style={{ color: item.reason === 'auto_unmet' ? 'var(--purple)' : 'var(--muted)' }}
                          >
                            {item.reason === 'auto_unmet' ? 'auto' : 'manual'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* All met celebration */}
      {sortedMissing.length === 0 && checkedCount > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{
            background: 'rgba(251,191,36,0.05)',
            borderTop: '1px solid rgba(251,191,36,0.15)',
          }}
        >
          <span className="text-xs font-mono" style={{ color: 'var(--gold)' }}>
            ✦ All criteria met — execute with conviction
          </span>
        </div>
      )}
    </section>
  )
}

// Legacy named export kept for compatibility — reads score from prop
// (used on playbook viewer page before checklist is loaded)
export function SetupGradeStatic({ score }: { score: number }) {
  // Derive a minimal GradeResult from score alone
  const grade =
    score >= 0.85 ? 'A+' as Grade :
    score >= 0.70 ? 'B+' as Grade :
    score >= 0.50 ? 'C+' as Grade :
    'D+' as Grade
  const cfg = GRADE_CONFIG[grade]
  const R2 = 44
  const C2 = 2 * Math.PI * R2
  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(score), 80)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div
      className="rounded-2xl flex items-center gap-5 p-4"
      style={{ background: 'var(--card)', border: `1px solid ${cfg.border}` }}
    >
      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 100, height: 100 }}>
        <div className="absolute inset-2 rounded-full blur-xl opacity-30" style={{ background: cfg.glow }} aria-hidden="true" />
        <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
          <circle cx={50} cy={50} r={R2} strokeWidth={6} stroke="var(--border)" fill="none" />
          <circle
            cx={50} cy={50} r={R2}
            strokeWidth={6} stroke={cfg.rawColor} fill="none"
            strokeLinecap="round" strokeDasharray={C2}
            strokeDashoffset={C2 * (1 - animPct)}
            style={{
              transform: 'rotate(-90deg)', transformOrigin: '50px 50px',
              transition: 'stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1)',
              filter: `drop-shadow(0 0 5px ${cfg.glow})`,
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold font-mono" style={{ color: cfg.rawColor, letterSpacing: '-0.02em', textShadow: `0 0 16px ${cfg.glow}` }}>{grade}</span>
          <span className="text-xs font-mono text-muted">{Math.round(score * 100)}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
        <p className="text-xs text-dim mt-1 max-w-[200px]">{cfg.subtext}</p>
      </div>
    </div>
  )
}

// Re-export scoreToGrade for consumers that still import from here
export { scoreToGrade } from '@/lib/playbook/grader'
export type { Grade }
