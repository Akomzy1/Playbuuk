'use client'

// components/alerts/alert-banner.tsx
// In-app setup alert banner — slides in from top-right when the scanner
// detects a grade-threshold crossing for a followed mentor.
//
// Architecture:
//   - Listens to a custom DOM event `alert:new` dispatched by the
//     service worker message bridge (sw-register.tsx) or the polling hook.
//   - Stacks up to 3 concurrent alerts; extras are queued.
//   - Each banner auto-dismisses after 8 seconds with a shrinking progress bar.
//   - "View Playbook" navigates to /mentor/[id] pre-loaded with the pair.
//
// Usage:
//   Mount once in AppShell. Dispatch alerts from anywhere:
//   window.dispatchEvent(new CustomEvent('alert:new', { detail: AlertPayload }))

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence }                   from 'framer-motion'
import Link                                          from 'next/link'
import { X, Bell, TrendingUp, TrendingDown, Zap, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertPayload {
  id:              string   // unique per alert — use crypto.randomUUID()
  mentor_id:       string
  mentor_name:     string
  mentor_emoji:    string
  pair:            string
  grade:           string   // 'A+' | 'B+' | 'C+' | 'D+'
  checklist_score: number   // 0–100 percent
  direction?:      'long' | 'short' | null
  timestamp:       number   // Date.now()
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 8_000
const MAX_VISIBLE     = 3

const GRADE_CONFIG: Record<string, { colour: string; glow: string; label: string }> = {
  'A+': { colour: '#fbbf24', glow: 'rgba(251,191,36,0.15)',  label: 'A+' },
  'B+': { colour: '#00e5b0', glow: 'rgba(0,229,176,0.15)',   label: 'B+' },
  'C+': { colour: '#22d3ee', glow: 'rgba(34,211,238,0.15)',  label: 'C+' },
  'D+': { colour: '#ff4d6a', glow: 'rgba(255,77,106,0.15)',  label: 'D+' },
}

function gradeFor(g: string) {
  return GRADE_CONFIG[g] ?? { colour: '#6b7fa3', glow: 'transparent', label: g }
}

// ─── Single banner card ───────────────────────────────────────────────────────

interface BannerCardProps {
  alert:     AlertPayload
  onDismiss: (id: string) => void
}

function BannerCard({ alert, onDismiss }: BannerCardProps) {
  const cfg             = gradeFor(alert.grade)
  const [prog, setProg] = useState(100)
  const startRef        = useRef<number>(Date.now())
  const rafRef          = useRef<number | null>(null)

  // Shrinking progress bar driven by rAF
  useEffect(() => {
    const tick = () => {
      const elapsed   = Date.now() - startRef.current
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100)
      setProg(remaining)
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        onDismiss(alert.id)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [alert.id, onDismiss])

  const mentorUrl = `/mentor/${alert.mentor_id}?pair=${encodeURIComponent(alert.pair)}`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.96 }}
      animate={{ opacity: 1, x: 0,  scale: 1     }}
      exit={{    opacity: 0, x: 60, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position:             'relative',
        width:                '100%',
        borderRadius:         '1rem',
        overflow:             'hidden',
        background:           'rgba(16,27,48,0.95)',
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border:               `1px solid ${cfg.colour}33`,
        boxShadow:            `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.colour}0d, 0 4px 16px ${cfg.glow}`,
      }}
    >
      {/* Top accent line */}
      <div
        aria-hidden="true"
        style={{
          position:   'absolute', top: 0, left: 0, right: 0,
          height:     '2px',
          background: `linear-gradient(90deg, ${cfg.colour} 0%, ${cfg.colour}44 100%)`,
        }}
      />

      <div className="px-4 pt-4 pb-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Grade orb + mentor info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm"
              style={{
                background:    `${cfg.colour}18`,
                border:        `1.5px solid ${cfg.colour}55`,
                color:         cfg.colour,
                boxShadow:     `0 0 12px ${cfg.glow}`,
                letterSpacing: '-0.02em',
              }}
              aria-label={`Grade ${alert.grade}`}
            >
              {cfg.label}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-mono font-bold text-text truncate tracking-tight">
                  {alert.pair}
                </span>
                {alert.direction === 'long'  && (
                  <TrendingUp  size={12} className="flex-shrink-0" style={{ color: 'var(--accent)' }} aria-label="Long" />
                )}
                {alert.direction === 'short' && (
                  <TrendingDown size={12} className="flex-shrink-0" style={{ color: 'var(--danger)' }} aria-label="Short" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs" aria-hidden="true">{alert.mentor_emoji}</span>
                <span className="text-xs text-dim truncate">{alert.mentor_name}</span>
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => onDismiss(alert.id)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--dim)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
            aria-label="Dismiss alert"
          >
            <X size={13} />
          </button>
        </div>

        {/* Alert type + score */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold"
            style={{
              background: 'rgba(0,229,176,0.07)',
              border:     '1px solid rgba(0,229,176,0.18)',
              color:      'var(--accent)',
            }}
          >
            <Zap size={10} aria-hidden="true" />
            Setup alert
          </div>
          <span className="text-xs text-dim font-mono">
            {alert.checklist_score.toFixed(0)}% criteria met
          </span>
        </div>

        {/* CTA link */}
        <Link
          href={mentorUrl}
          onClick={() => onDismiss(alert.id)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: `${cfg.colour}14`,
            border:     `1px solid ${cfg.colour}33`,
            color:      cfg.colour,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${cfg.colour}22`
            e.currentTarget.style.boxShadow  = `0 0 12px ${cfg.glow}`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `${cfg.colour}14`
            e.currentTarget.style.boxShadow  = 'none'
          }}
        >
          <span>View playbook</span>
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      </div>

      {/* Progress bar — shrinks over AUTO_DISMISS_MS */}
      <div
        aria-hidden="true"
        style={{
          position:   'absolute', bottom: 0, left: 0,
          height:     '2px',
          width:      `${prog}%`,
          background: `linear-gradient(90deg, ${cfg.colour}88, ${cfg.colour})`,
          transition: 'width 0.1s linear',
        }}
      />
    </motion.div>
  )
}

// ─── Banner stack — mount once in AppShell ────────────────────────────────────

export function AlertBannerStack() {
  const [visible, setVisible] = useState<AlertPayload[]>([])
  const queueRef              = useRef<AlertPayload[]>([])

  const dismiss = useCallback((id: string) => {
    setVisible(prev => {
      const next = prev.filter(a => a.id !== id)
      // Drain queue if slot freed up
      if (queueRef.current.length > 0 && next.length < MAX_VISIBLE) {
        const slots    = MAX_VISIBLE - next.length
        const dequeued = queueRef.current.splice(0, slots)
        return [...next, ...dequeued]
      }
      return next
    })
  }, [])

  useEffect(() => {
    function onAlert(e: Event) {
      const payload = (e as CustomEvent<AlertPayload>).detail
      setVisible(prev => {
        if (prev.length < MAX_VISIBLE) return [...prev, payload]
        queueRef.current.push(payload)
        return prev
      })
    }
    window.addEventListener('alert:new', onAlert)
    return () => window.removeEventListener('alert:new', onAlert)
  }, [])

  if (visible.length === 0) return null

  return (
    <div
      aria-label="Setup alerts"
      style={{
        position:      'fixed',
        top:           '4.5rem',   // below the platform nav bar
        right:         '1rem',
        zIndex:        45,
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.5rem',
        width:         'min(360px, calc(100vw - 2rem))',
        pointerEvents: 'none',
      }}
    >
      {/* Queue badge — shown when ≥2 visible */}
      {visible.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono self-end"
          style={{
            background:    'rgba(11,17,33,0.92)',
            border:        '1px solid var(--border)',
            color:         'var(--dim)',
            pointerEvents: 'auto',
          }}
        >
          <Bell size={11} aria-hidden="true" />
          {visible.length} alerts
        </motion.div>
      )}

      <AnimatePresence mode="sync">
        {visible.map((alert) => (
          <div key={alert.id} style={{ pointerEvents: 'auto' }}>
            <BannerCard alert={alert} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
