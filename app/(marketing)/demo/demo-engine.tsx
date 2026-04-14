'use client'

// app/(marketing)/demo/demo-engine.tsx
// The live demo — real market simulation, real discipline engine, no auth.
// Sent to mentors in DMs: "This is exactly what your strategy does for traders."
//
// Engine lifecycle:
//   mount → addPair(all 3) + startEngine()
//   unmount → stopEngine()
//   LiveChecklist handles loadChecklist + evaluate internally.
//
// Layout:
//   Mobile  — chart (190px) → grade + checklist → explainer → CTA
//   Desktop — chart left + grade right (2-col), checklist + CTA below

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Radio, ArrowRight, Zap, TrendingUp, Shield, Bell } from 'lucide-react'
import Link from 'next/link'
import { useMarketStore } from '@/stores/market-store'
import { LiveChecklist } from '@/components/playbook/live-checklist'
import { CandlestickChart } from '@/components/playbook/candlestick-chart'
import type { ChecklistItem } from '@/lib/supabase/types'

// ─── Sample playbook ──────────────────────────────────────────────────────────
// Realistic SMC / trend-continuation checklist.
// Mix of auto (evalKey) and manual items — shows both types in action.

const DEMO_CHECKLIST: ChecklistItem[] = [
  {
    id: 'demo_trend',
    item: 'Clear trend direction: higher-highs / higher-lows confirmed',
    category: 'trend',
    weight: 2,
    auto: true,
    evalKey: 'trend_exists',
  },
  {
    id: 'demo_aoi',
    item: 'Price inside supply/demand zone (Area of Interest)',
    category: 'structure',
    weight: 2,
    auto: true,
    evalKey: 'price_in_aoi',
  },
  {
    id: 'demo_bos',
    item: 'Break of Structure (BOS) confirmed on entry timeframe',
    category: 'structure',
    weight: 3,
    auto: true,
    evalKey: 'bos_detected',
  },
  {
    id: 'demo_engulf',
    item: 'Engulfing candle — momentum confirmation present',
    category: 'entry',
    weight: 2,
    auto: true,
    evalKey: 'engulfing',
  },
  {
    id: 'demo_ema',
    item: 'EMA 50 acting as dynamic support or resistance',
    category: 'trend',
    weight: 1,
    auto: true,
    evalKey: 'ema50_near',
  },
  {
    id: 'demo_session',
    item: 'Active trading session: London open or NY kill zone',
    category: 'session',
    weight: 2,
    auto: true,
    evalKey: 'session_killzone',
  },
  {
    id: 'demo_fvg',
    item: 'Fair Value Gap (FVG) within the entry zone',
    category: 'pattern',
    weight: 1,
    auto: true,
    evalKey: 'fvg_detected',
  },
  {
    id: 'demo_risk',
    item: 'Risk reviewed: stop loss placed before entry',
    category: 'risk',
    weight: 2,
    auto: false,
    evalKey: null,
  },
  {
    id: 'demo_plan',
    item: 'Trade plan written — entry, target, and invalidation defined',
    category: 'risk',
    weight: 1,
    auto: false,
    evalKey: null,
  },
]

const DEMO_PAIRS = ['EURUSD', 'GBPUSD', 'XAUUSD'] as const
type DemoPair = typeof DEMO_PAIRS[number]

const PAIR_LABEL: Record<DemoPair, string> = {
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  XAUUSD: 'XAU/USD',
}

// ─── Live price ticker ────────────────────────────────────────────────────────

function PriceTicker() {
  const price    = useMarketStore(s => s.price)
  const analysis = useMarketStore(s => s.analysis)
  const [prev, setPrev] = useState(price)
  const [dir, setDir]   = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (price === prev) return
    setDir(price > prev ? 'up' : 'down')
    setPrev(price)
    const t = setTimeout(() => setDir(null), 600)
    return () => clearTimeout(t)
  }, [price, prev])

  const formatted = price >= 1000
    ? price.toFixed(2)
    : price >= 10
      ? price.toFixed(3)
      : price.toFixed(5)

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <motion.span
        key={formatted}
        className="font-bold font-mono text-xl sm:text-2xl tracking-tight"
        style={{
          color: dir === 'up' ? 'var(--accent)' : dir === 'down' ? 'var(--danger)' : 'var(--text)',
          transition: 'color 0.4s ease',
          textShadow: dir === 'up'
            ? '0 0 16px rgba(0,229,176,0.5)'
            : dir === 'down'
              ? '0 0 16px rgba(255,77,106,0.4)'
              : 'none',
        }}
      >
        {formatted}
      </motion.span>

      <span
        className="text-2xs font-mono px-2 py-0.5 rounded-full"
        style={{
          background: analysis.session_killzone
            ? 'rgba(0,229,176,0.12)'
            : analysis.session_active
              ? 'rgba(34,211,238,0.10)'
              : 'rgba(107,127,163,0.08)',
          border: analysis.session_killzone
            ? '1px solid rgba(0,229,176,0.3)'
            : analysis.session_active
              ? '1px solid rgba(34,211,238,0.25)'
              : '1px solid rgba(107,127,163,0.15)',
          color: analysis.session_killzone
            ? 'var(--accent)'
            : analysis.session_active
              ? 'var(--cyan)'
              : 'var(--muted)',
        }}
      >
        {analysis.session_killzone
          ? 'Kill zone'
          : analysis.session_active
            ? (analysis.session_name ?? 'Market open')
            : 'Off-session'}
      </span>
    </div>
  )
}

// ─── How-it-works mini explainer ─────────────────────────────────────────────

function HowItWorks() {
  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{
        background: 'rgba(0,229,176,0.04)',
        border: '1px solid rgba(0,229,176,0.12)',
      }}
    >
      <p
        className="text-2xs font-bold font-mono mb-3"
        style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}
      >
        HOW IT WORKS
      </p>
      <div className="flex flex-col gap-3">
        {[
          {
            Icon: Zap,
            label: 'Auto-detected',
            desc: '7 criteria evaluate live market data every 2.5s — no manual input.',
          },
          {
            Icon: Shield,
            label: 'Objective grade',
            desc: 'A+ to D+ tells your followers: take this trade, or wait.',
          },
          {
            Icon: Bell,
            label: 'Alert on A+',
            desc: 'Push notification fires the moment your setup conditions are met.',
          },
        ].map(({ Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-2.5">
            <Icon size={11} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <p className="text-xs text-dim leading-relaxed">
              <span className="font-semibold" style={{ color: 'var(--text)' }}>{label}: </span>
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DemoEngine ───────────────────────────────────────────────────────────────

export function DemoEngine() {
  const [activePair, setActivePair] = useState<DemoPair>('EURUSD')
  const addPair     = useMarketStore(s => s.addPair)
  const setPair     = useMarketStore(s => s.setPair)
  const startEngine = useMarketStore(s => s.startEngine)
  const stopEngine  = useMarketStore(s => s.stopEngine)
  const running     = useMarketStore(s => s.running)

  // ── Engine lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    for (const pair of DEMO_PAIRS) addPair(pair)
    startEngine()
    return () => stopEngine()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Pair switching ────────────────────────────────────────────────────────────
  const handlePairSwitch = (pair: DemoPair) => {
    setActivePair(pair)
    setPair(pair)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Live demo banner ───────────────────────────────────────────── */}
      <div
        className="sticky top-14 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5"
        style={{
          background: 'rgba(0,229,176,0.06)',
          borderBottom: '1px solid rgba(0,229,176,0.15)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Radio size={12} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </motion.span>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>
            LIVE ENGINE RUNNING
          </span>
          <span className="text-xs font-mono text-muted hidden sm:inline">
            · Checklist auto-updates every 2.5s · Real market logic
          </span>
        </div>
        <span
          className="text-2xs font-mono px-2 py-0.5 rounded"
          style={{
            background: running ? 'rgba(0,229,176,0.1)' : 'rgba(107,127,163,0.1)',
            color: running ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          {running ? 'Active' : 'Paused'}
        </span>
      </div>

      {/* ── Page body ──────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">

        {/* Hero */}
        <div className="flex items-start gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              background: 'rgba(0,229,176,0.1)',
              border: '1px solid rgba(0,229,176,0.25)',
              boxShadow: '0 0 16px rgba(0,229,176,0.12)',
            }}
          >
            <span className="font-mono font-bold text-accent text-sm">P</span>
          </div>
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold text-text leading-tight"
              style={{ letterSpacing: '-0.03em' }}
            >
              Your strategy.{' '}
              <span style={{ color: 'var(--accent)' }}>Enforced in real time.</span>
            </h1>
            <p className="text-sm text-dim mt-1.5 leading-relaxed max-w-xl">
              Live simulation of a sample SMC playbook. The checklist auto-detects market
              conditions every 2.5 seconds. Grade updates as criteria are met or lost.
              Try toggling the manual items below.
            </p>
          </div>
        </div>

        {/* Pair selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-mono text-muted">Pair:</span>
          {DEMO_PAIRS.map(pair => (
            <button
              key={pair}
              type="button"
              onClick={() => handlePairSwitch(pair)}
              className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{
                background: activePair === pair
                  ? 'rgba(0,229,176,0.12)'
                  : 'rgba(107,127,163,0.07)',
                border: activePair === pair
                  ? '1px solid rgba(0,229,176,0.3)'
                  : '1px solid rgba(107,127,163,0.15)',
                color: activePair === pair ? 'var(--accent)' : 'var(--dim)',
                boxShadow: activePair === pair ? '0 0 12px rgba(0,229,176,0.12)' : 'none',
              }}
              aria-pressed={activePair === pair}
            >
              {PAIR_LABEL[pair]}
            </button>
          ))}
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left col: chart + price + how-it-works */}
          <div className="flex flex-col gap-3">

            {/* Price header card */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div>
                <p className="text-2xs text-muted font-mono mb-1">{PAIR_LABEL[activePair]} · 15m sim</p>
                <PriceTicker />
              </div>
              <div
                className="flex items-center gap-1.5 text-2xs font-mono px-2.5 py-1 rounded-lg"
                style={{
                  background: 'rgba(0,229,176,0.07)',
                  border: '1px solid rgba(0,229,176,0.15)',
                  color: 'var(--accent)',
                }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ●
                </motion.span>
                DEMO
              </div>
            </div>

            {/* Chart */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              <CandlestickChart height={220} />
            </div>

            {/* How it works — desktop only */}
            <div className="hidden lg:block">
              <HowItWorks />
            </div>
          </div>

          {/* Right col: full checklist (includes grade ring) */}
          <div>
            <LiveChecklist checklist={DEMO_CHECKLIST} />
          </div>
        </div>

        {/* How it works — mobile (below checklist) */}
        <div className="mt-4 lg:hidden">
          <HowItWorks />
        </div>

        {/* ── CTA section ──────────────────────────────────────────────── */}
        <div
          className="mt-8 rounded-2xl px-5 py-7 sm:px-8 sm:py-10 text-center relative overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(0,229,176,0.06) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'rgba(0,229,176,0.1)',
              border: '1px solid rgba(0,229,176,0.25)',
              boxShadow: '0 0 28px rgba(0,229,176,0.18)',
            }}
          >
            <TrendingUp size={24} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>

          <h2
            className="relative text-xl sm:text-2xl font-bold text-text mb-2"
            style={{ letterSpacing: '-0.03em' }}
          >
            This is your strategy.
            <br />
            <span style={{ color: 'var(--accent)' }}>Your followers need it.</span>
          </h2>

          <p className="relative text-sm text-dim leading-relaxed max-w-sm mx-auto mb-7">
            Partner with Playbuuk and your trading rules become an objective, real-time
            discipline engine your followers can follow trade by trade. No more FOMO
            entries. No more revenge trades. Just the plan.
          </p>

          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold text-sm px-7 py-3.5 rounded-xl transition-all hover:brightness-110 active:scale-95"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                boxShadow: '0 0 28px rgba(0,229,176,0.3)',
              }}
            >
              Claim your playbuuk
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/home"
              className="text-sm font-medium transition-colors hover:text-text"
              style={{ color: 'var(--dim)' }}
            >
              See how it works →
            </Link>
          </div>
        </div>

        <p
          className="text-center text-2xs font-mono mt-6"
          style={{ color: 'var(--muted)', opacity: 0.4 }}
        >
          Simulated market data for demonstration purposes only.
          Not financial advice. Trading carries substantial risk of loss.
        </p>
      </div>
    </div>
  )
}
