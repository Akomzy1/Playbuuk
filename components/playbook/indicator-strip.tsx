'use client'

// components/playbook/indicator-strip.tsx
// Two-section component:
//
//   1. Live market analysis strip (top) — reads from market-store every 2.5s:
//        Trend direction, RSI, BOS status, AOI proximity, current session.
//        Designed to look like a professional trading terminal status bar.
//
//   2. Static playbook reference cards (below) — playbook indicators & core
//        concepts supplied by the mentor. Pro-gated for indicator detail;
//        core concepts visible on free tier.
//
// CSS variable note: --info (#4d8eff) not --blue; --danger (#ff4d6a) not --red.

import { Activity, BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useMarketStore } from '@/stores/market-store'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'

// ─── Live analysis strip ──────────────────────────────────────────────────────

function LiveAnalysisStrip() {
  const analysis = useMarketStore(s => s.analysis)

  // ── Trend ─────────────────────────────────────────────────────────────────
  const trendDir   = analysis.trend_direction
  const trendColor =
    trendDir === 'bullish' ? 'var(--accent)' :
    trendDir === 'bearish' ? 'var(--danger)' :
    'var(--dim)'
  const TrendIcon =
    trendDir === 'bullish' ? TrendingUp :
    trendDir === 'bearish' ? TrendingDown :
    Minus

  // ── RSI ───────────────────────────────────────────────────────────────────
  const rsi      = analysis.rsi
  const rsiValid = rsi > 0 && !isNaN(rsi)
  const rsiColor =
    rsi > 70 ? 'var(--danger)' :
    rsi < 30 ? 'var(--accent)' :
    'var(--dim)'
  const rsiTag =
    rsi > 70 ? ' OB' :
    rsi < 30 ? ' OS' :
    ''

  // ── BOS ───────────────────────────────────────────────────────────────────
  const bosActive = analysis.bos_detected
  const bosColor  =
    !bosActive        ? 'var(--muted)' :
    analysis.bos_type === 'bullish' ? 'var(--accent)' :
    'var(--danger)'
  const bosLabel  =
    !bosActive        ? 'No BOS' :
    analysis.bos_type === 'bullish' ? 'BOS ▲' :
    'BOS ▼'

  // ── AOI ───────────────────────────────────────────────────────────────────
  const inAoi    = analysis.price_in_aoi
  const hasZones = analysis.aoi_count_2
  const aoiColor =
    inAoi    ? 'var(--gold)' :
    hasZones ? 'var(--dim)' :
    'var(--muted)'
  const aoiLabel =
    inAoi    ? 'In Zone' :
    hasZones ? 'Near Zone' :
    'No AOI'

  // ── Session ───────────────────────────────────────────────────────────────
  const sessionName  = analysis.session_name
  const isKillzone   = analysis.session_killzone
  const sessionColor =
    isKillzone              ? 'var(--gold)' :
    analysis.session_active ? 'var(--accent)' :
    'var(--muted)'
  const sessionLabel = sessionName ?? 'Off-hours'

  // ── EMA proximity ─────────────────────────────────────────────────────────
  const emaLabel = analysis.ema50_near ? 'At EMA' : 'Away'
  const emaColor = analysis.ema50_near ? 'var(--cyan)' : 'var(--muted)'

  const chips: Array<{ key: string; label: string; value: string; color: string; dot?: boolean }> = [
    {
      key: 'trend',
      label: 'TREND',
      value: trendDir === 'ranging' ? 'RANGING' : trendDir.toUpperCase(),
      color: trendColor,
    },
    {
      key: 'rsi',
      label: 'RSI',
      value: rsiValid ? `${rsi.toFixed(0)}${rsiTag}` : '—',
      color: rsiColor,
    },
    {
      key: 'bos',
      label: 'STRUCT',
      value: bosLabel,
      color: bosColor,
    },
    {
      key: 'aoi',
      label: 'AOI',
      value: aoiLabel,
      color: aoiColor,
      dot: inAoi,
    },
    {
      key: 'session',
      label: 'SESSION',
      value: sessionLabel + (isKillzone ? ' ⚡' : ''),
      color: sessionColor,
    },
    {
      key: 'ema',
      label: 'EMA 50',
      value: emaLabel,
      color: emaColor,
    },
  ]

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Live pulse */}
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: 'var(--accent)' }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ background: 'var(--accent)' }}
          />
        </span>
        <span className="text-xs font-semibold text-dim font-mono tracking-wide">
          LIVE ANALYSIS
        </span>
        <span className="ml-auto text-2xs text-muted font-mono">2.5s</span>
      </div>

      {/* Chips grid */}
      <div
        className="grid grid-cols-3 gap-px"
        style={{ background: 'var(--border)' }}
      >
        {chips.map(chip => (
          <div
            key={chip.key}
            className="flex flex-col gap-0.5 px-3 py-2.5"
            style={{ background: 'var(--card)' }}
          >
            <span className="text-2xs font-mono text-muted tracking-widest uppercase">
              {chip.label}
            </span>
            <div className="flex items-center gap-1">
              {chip.dot && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ background: chip.color }}
                  aria-hidden="true"
                />
              )}
              <span
                className="text-xs font-bold font-mono leading-tight"
                style={{ color: chip.color }}
              >
                {chip.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* FVG + engulfing quick flags */}
      {(analysis.fvg_detected || analysis.engulfing) && (
        <div
          className="flex items-center gap-2 px-3 py-2 flex-wrap"
          style={{
            background: 'rgba(0,0,0,0.15)',
            borderTop: '1px solid var(--border)',
          }}
        >
          {analysis.fvg_detected && (
            <span
              className="flex items-center gap-1 text-2xs font-mono px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(167,139,250,0.1)',
                border: '1px solid rgba(167,139,250,0.25)',
                color: 'var(--purple)',
              }}
            >
              ◆ FVG
            </span>
          )}
          {analysis.engulfing && (
            <span
              className="flex items-center gap-1 text-2xs font-mono px-2 py-0.5 rounded-full"
              style={{
                background: analysis.engulfing_type === 'bullish'
                  ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
                border: `1px solid ${analysis.engulfing_type === 'bullish' ? 'rgba(0,229,176,0.25)' : 'rgba(255,77,106,0.25)'}`,
                color: analysis.engulfing_type === 'bullish' ? 'var(--accent)' : 'var(--danger)',
              }}
            >
              ▣ {analysis.engulfing_type === 'bullish' ? 'Bull' : 'Bear'} Engulf
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Static indicators ────────────────────────────────────────────────────────

const INDICATOR_COLORS: { bg: string; border: string; text: string }[] = [
  { bg: 'rgba(0,229,176,0.07)',    border: 'rgba(0,229,176,0.2)',    text: 'var(--accent)' },
  { bg: 'rgba(77,142,255,0.07)',   border: 'rgba(77,142,255,0.2)',   text: 'var(--info)' },
  { bg: 'rgba(34,211,238,0.07)',   border: 'rgba(34,211,238,0.2)',   text: 'var(--cyan)' },
  { bg: 'rgba(167,139,250,0.07)',  border: 'rgba(167,139,250,0.2)',  text: 'var(--purple)' },
  { bg: 'rgba(251,191,36,0.07)',   border: 'rgba(251,191,36,0.2)',   text: 'var(--gold)' },
]

function getColor(i: number) {
  return INDICATOR_COLORS[i % INDICATOR_COLORS.length] ?? INDICATOR_COLORS[0]!
}

// ─── IndicatorStrip ───────────────────────────────────────────────────────────

interface IndicatorStripProps {
  indicators:   string[]
  coreConcepts: string[]
  isPro:        boolean
}

export function IndicatorStrip({ indicators, coreConcepts, isPro }: IndicatorStripProps) {
  return (
    <section aria-labelledby="indicators-heading" className="flex flex-col gap-4">

      {/* ── Live market analysis ─────────────────────────────────────────── */}
      <LiveAnalysisStrip />

      {/* ── Core concepts (free tier) ────────────────────────────────────── */}
      {coreConcepts.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-3"
            style={{
              background: 'rgba(0,0,0,0.25)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <BookOpen size={12} style={{ color: 'var(--dim)' }} aria-hidden="true" />
            <h2
              id="indicators-heading"
              className="text-xs font-semibold text-dim font-mono tracking-wide uppercase"
            >
              Core Concepts
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 p-3" style={{ background: 'var(--card)' }}>
            {coreConcepts.map((concept, i) => {
              const c = getColor(i)
              return (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                >
                  {concept}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Indicators & tools (Pro) ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Activity size={12} style={{ color: 'var(--dim)' }} aria-hidden="true" />
          <h3 className="text-xs font-semibold text-dim font-mono tracking-wide uppercase">
            Indicators &amp; Tools
          </h3>
        </div>

        {!isPro ? (
          <UpgradePrompt feature="live_checklist" compact />
        ) : indicators.length === 0 ? (
          <p className="text-xs text-muted italic font-mono">No indicators defined.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {indicators.map((ind, i) => {
              const c = getColor(i)
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-150"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.text }} aria-hidden="true" />
                  <span className="text-xs font-mono font-medium" style={{ color: c.text }}>{ind}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
