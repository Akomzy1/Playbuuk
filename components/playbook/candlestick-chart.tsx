'use client'

// components/playbook/candlestick-chart.tsx
// Professional candlestick chart — custom SVG, design-system colours.
//
// Visual layers (back → front):
//   Background + grid lines
//   AOI zone rectangles (supply red / demand green tints)
//   Psychological level dotted lines
//   Trendlines (gradient strokes)
//   EMA 50 line (smooth cubic bezier, glowing)
//   Candle wicks  (thin lines)
//   Candle bodies (rects, bullish = --accent, bearish = --danger)
//   Current price dashed line + badge
//   Price axis (right)
//   Time axis (bottom)
//   Transparent hit-area rect (mouse events)
//   Hover tooltip (absolutely positioned div)
//   Live badge (top-left)
//
// Data: pulled from useMarketStore — re-renders every 2.5s tick.
// EMA series is computed here from the full candle history for accuracy.
// Trendline indices are re-mapped from the full candle array to the
// visible slice so lines draw correctly at any zoom.

import { useRef, useEffect, useState, useCallback, useMemo, useId } from 'react'
import { useMarketStore } from '@/stores/market-store'
import type { Candle, AreaOfInterest, Trendline } from '@/lib/market/engine'

// ─── Layout constants ─────────────────────────────────────────────────────────

const VISIBLE   = 80           // how many candles to show
const PAD       = { top: 24, right: 76, bottom: 36, left: 8 } as const
const BODY_PCT  = 0.65         // candle body is 65% of slot width
const MIN_BODY  = 1            // minimum body height px
const WICK_W    = 1.5          // wick stroke width

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(p: number): string {
  if (p >= 10000) return p.toFixed(0)
  if (p >= 1000)  return p.toFixed(1)
  if (p >= 100)   return p.toFixed(2)
  if (p >= 10)    return p.toFixed(3)
  return p.toFixed(5)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return (
    String(d.getUTCHours()).padStart(2, '0') + ':' +
    String(d.getUTCMinutes()).padStart(2, '0')
  )
}

/** Smooth cubic-bezier path through a series of [x,y] points. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  const f = pts[0]!
  let d = `M ${f[0].toFixed(1)} ${f[1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!
    const curr = pts[i]!
    const cpx  = ((prev[0] + curr[0]) / 2).toFixed(1)
    d += ` C ${cpx} ${prev[1].toFixed(1)}, ${cpx} ${curr[1].toFixed(1)}, ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`
  }
  return d
}

/** Compute EMA values for every candle (returns null until period is reached). */
function getEMASeries(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null)
  if (candles.length < period) return result
  const k = 2 / (period + 1)
  let ema = 0
  for (let i = 0; i < period; i++) ema += candles[i]!.close
  ema /= period
  result[period - 1] = ema
  for (let i = period; i < candles.length; i++) {
    ema = candles[i]!.close * k + ema * (1 - k)
    result[i] = ema
  }
  return result
}

/** 6 evenly-spaced price ticks between min and max. */
function gridTicks(min: number, max: number): number[] {
  const range = max - min
  if (range === 0) return [min]
  const step = range / 5
  return Array.from({ length: 6 }, (_, i) => min + step * i)
}

/** Psychological round-number levels within the visible price range. */
function psychLevels(min: number, max: number, atr: number): number[] {
  const pipApprox = atr > 0 ? atr / 14 : min * 0.0001
  let unit = pipApprox * 100
  const range = max - min
  while (unit > 0 && range / unit > 10) unit *= 2
  while (unit > 0 && range / unit < 2)  unit /= 2
  if (unit <= 0) return []
  const first = Math.ceil(min / unit) * unit
  const levels: number[] = []
  for (let l = first; l <= max + unit * 0.01; l += unit) {
    levels.push(parseFloat(l.toPrecision(10)))
  }
  return levels
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tooltip {
  candle: Candle
  screenX: number
  screenY: number
  idx: number
}

export interface CandlestickChartProps {
  height?:    number
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CandlestickChart({ height = 400, className = '' }: CandlestickChartProps) {
  const uid          = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgWidth, setSvgWidth] = useState(800)

  // ── Responsive width ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setSvgWidth(w)
    })
    ro.observe(el)
    // Initial measure
    setSvgWidth(el.getBoundingClientRect().width || 800)
    return () => ro.disconnect()
  }, [])

  // ── Store data ──────────────────────────────────────────────────────────────
  const allCandles  = useMarketStore(s => s.candles)
  const analysis    = useMarketStore(s => s.analysis)
  const price       = useMarketStore(s => s.price)
  const currentPair = useMarketStore(s => s.currentPair)

  // ── Geometry ────────────────────────────────────────────────────────────────
  const chartW = Math.max(0, svgWidth - PAD.left - PAD.right)
  const chartH = Math.max(0, height  - PAD.top  - PAD.bottom)

  const visible       = useMemo(() => allCandles.slice(-VISIBLE), [allCandles])
  const visibleOffset = allCandles.length - visible.length  // index of visible[0] in allCandles

  // ── Price scale ─────────────────────────────────────────────────────────────
  const { priceMin, priceMax } = useMemo(() => {
    if (visible.length === 0) return { priceMin: 0, priceMax: 1 }
    const lo = Math.min(...visible.map(c => c.low))
    const hi = Math.max(...visible.map(c => c.high))
    const pad = (hi - lo) * 0.12
    return { priceMin: lo - pad, priceMax: hi + pad }
  }, [visible])

  // ── Coordinate transforms ───────────────────────────────────────────────────
  const count = visible.length || 1
  const slotW = chartW / count
  const bodyW = Math.max(MIN_BODY, slotW * BODY_PCT)

  const toX = useCallback(
    (i: number) => PAD.left + i * slotW + slotW / 2,
    [slotW],
  )

  const toY = useCallback(
    (p: number) => {
      const range = priceMax - priceMin
      if (range === 0) return PAD.top + chartH / 2
      return PAD.top + (1 - (p - priceMin) / range) * chartH
    },
    [priceMin, priceMax, chartH],
  )

  // ── EMA series ──────────────────────────────────────────────────────────────
  const emaFull    = useMemo(() => getEMASeries(allCandles, 50), [allCandles])
  const emaVisible = useMemo(() => emaFull.slice(-VISIBLE), [emaFull])

  const emaPath = useMemo(() => {
    const pts: [number, number][] = []
    emaVisible.forEach((v, i) => {
      if (v !== null) pts.push([toX(i), toY(v)])
    })
    return smoothPath(pts)
  }, [emaVisible, toX, toY])

  // ── Grid + psych levels ─────────────────────────────────────────────────────
  const ticks  = useMemo(() => gridTicks(priceMin, priceMax), [priceMin, priceMax])
  const psychs = useMemo(() => psychLevels(priceMin, priceMax, analysis.atr), [priceMin, priceMax, analysis.atr])

  // ── Time axis labels ─────────────────────────────────────────────────────────
  const timeLabels = useMemo(() => {
    const interval = Math.max(1, Math.floor(count / 6))
    return visible
      .map((c, i) => ({ i, label: formatTime(c.timestamp) }))
      .filter((_, i) => i % interval === 0)
  }, [visible, count])

  // ── Trendline projections ───────────────────────────────────────────────────
  const tlLines = useMemo(() => {
    if (!analysis.trendlines.length) return []
    return analysis.trendlines.map((tl, idx) => {
      // Map trendline indices to visible-candle indices
      const tlStartVis = tl.startIndex - visibleOffset  // may be negative

      let x1: number, y1: number
      if (tlStartVis >= 0) {
        x1 = toX(tlStartVis)
        y1 = toY(tl.startPrice)
      } else {
        // Project to left edge of visible area
        const priceAtEdge = tl.startPrice + tl.slope * (visibleOffset - tl.startIndex) * -1
        // wait — slope is positive when price rising. From startIndex to visibleOffset:
        // delta = visibleOffset - tl.startIndex
        const pEdge = tl.startPrice + tl.slope * (visibleOffset - tl.startIndex)
        x1 = toX(0)
        y1 = toY(pEdge)
      }

      // Right anchor: projected price at the last visible candle
      const x2 = toX(count - 1)
      const y2 = toY(tl.priceAtCurrent)

      const gid   = `${uid}-tl-${idx}`
      const color = tl.type === 'support' ? '#00e5b0' : '#ff4d6a'
      const dash  = tl.touches >= 3 ? 'none' : '4 3'

      return { x1, y1, x2, y2, gid, color, dash, tl }
    }).filter(l => {
      // Skip if completely above or below chart
      const yMin = PAD.top
      const yMax = PAD.top + chartH
      return !(Math.min(l.y1, l.y2) > yMax || Math.max(l.y1, l.y2) < yMin)
    })
  }, [analysis.trendlines, visibleOffset, count, toX, toY, chartH, uid])

  // ── Current price direction ──────────────────────────────────────────────────
  const lastCandle       = visible[visible.length - 1] ?? null
  const currentBullish   = lastCandle ? lastCandle.close >= lastCandle.open : true
  const currentPriceColor = currentBullish ? 'var(--accent)' : 'var(--danger)'

  // ── Hover tooltip state ─────────────────────────────────────────────────────
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const svgEl = e.currentTarget.closest('svg')
    if (!svgEl) return
    const rect = svgEl.getBoundingClientRect()
    const mx   = e.clientX - rect.left
    const idx  = Math.floor((mx - PAD.left) / slotW)
    if (idx >= 0 && idx < visible.length) {
      const candle  = visible[idx]!
      const midY    = (toY(candle.high) + toY(candle.low)) / 2
      setTooltip({ candle, screenX: toX(idx), screenY: midY, idx })
    }
  }, [visible, slotW, toX, toY])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  // Tooltip pin to the right of cursor, flip left on right-half
  const tooltipX = tooltip
    ? tooltip.screenX > svgWidth / 2
      ? tooltip.screenX - 150 - 12
      : tooltip.screenX + 12
    : 0
  const tooltipY = tooltip
    ? Math.max(4, Math.min(tooltip.screenY - 60, height - 100))
    : 0

  // ── Clip path ID ─────────────────────────────────────────────────────────────
  const clipId = `${uid}-clip`

  // ─── Render ────────────────────────────────────────────────────────────────
  if (visible.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center rounded-2xl ${className}`}
        style={{ height, background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs text-muted font-mono">Warming up market engine…</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative select-none rounded-2xl overflow-hidden ${className}`}
      style={{ height, background: 'var(--surface)' }}
    >
      <svg
        width={svgWidth}
        height={height}
        style={{ display: 'block', fontFamily: '"IBM Plex Mono", monospace' }}
      >
        <defs>
          {/* Chart clip area */}
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} />
          </clipPath>

          {/* EMA glow filter */}
          <filter id={`${uid}-ema-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Trendline gradients (left=transparent, right=full color) */}
          {tlLines.map(({ gid, color, x1, y1, x2, y2 }) => (
            <linearGradient
              key={gid}
              id={gid}
              x1={x1} y1={y1} x2={x2} y2={y2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0.85" />
            </linearGradient>
          ))}

          {/* Current price badge gradient */}
          <linearGradient id={`${uid}-price-badge`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={currentBullish ? '#00e5b0' : '#ff4d6a'} stopOpacity="0.25" />
            <stop offset="100%" stopColor={currentBullish ? '#00e5b0' : '#ff4d6a'} stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* ── Background ───────────────────────────────────────────────────── */}
        <rect width={svgWidth} height={height} fill="var(--surface)" />

        {/* ── Horizontal grid lines ─────────────────────────────────────────── */}
        {ticks.map((p, i) => {
          const y = toY(p)
          if (y < PAD.top || y > PAD.top + chartH) return null
          return (
            <line
              key={i}
              x1={PAD.left} y1={y}
              x2={PAD.left + chartW} y2={y}
              stroke="var(--border)"
              strokeWidth={i === 0 || i === ticks.length - 1 ? 0 : 1}
              strokeOpacity={0.5}
            />
          )
        })}

        {/* ── Chart border lines ────────────────────────────────────────────── */}
        <line
          x1={PAD.left} y1={PAD.top}
          x2={PAD.left + chartW} y2={PAD.top}
          stroke="var(--border)" strokeWidth={1} strokeOpacity={0.6}
        />
        <line
          x1={PAD.left} y1={PAD.top + chartH}
          x2={PAD.left + chartW} y2={PAD.top + chartH}
          stroke="var(--border)" strokeWidth={1} strokeOpacity={0.6}
        />
        <line
          x1={PAD.left + chartW} y1={PAD.top}
          x2={PAD.left + chartW} y2={PAD.top + chartH}
          stroke="var(--border)" strokeWidth={1} strokeOpacity={0.4}
        />

        {/* ── AOI zones ─────────────────────────────────────────────────────── */}
        <g clipPath={`url(#${clipId})`}>
          {analysis.zones.map((z: AreaOfInterest, i) => {
            const yt = toY(z.top)
            const yb = toY(z.bottom)
            const fill  = z.type === 'supply' ? 'rgba(255,77,106,0.07)'  : 'rgba(0,229,176,0.07)'
            const bclr  = z.type === 'supply' ? 'rgba(255,77,106,0.2)'   : 'rgba(0,229,176,0.2)'
            return (
              <g key={i}>
                <rect
                  x={PAD.left} y={yt}
                  width={chartW} height={Math.max(0, yb - yt)}
                  fill={fill}
                />
                {/* Zone boundary lines */}
                <line x1={PAD.left} y1={yt} x2={PAD.left + chartW} y2={yt}
                  stroke={bclr} strokeWidth={1} strokeDasharray="3 3" />
                <line x1={PAD.left} y1={yb} x2={PAD.left + chartW} y2={yb}
                  stroke={bclr} strokeWidth={1} strokeDasharray="3 3" />
                {/* Zone label */}
                <text
                  x={PAD.left + 4} y={yt + 11}
                  fontSize={9} fill={z.type === 'supply' ? 'rgba(255,77,106,0.7)' : 'rgba(0,229,176,0.7)'}
                  fontFamily='"IBM Plex Mono", monospace'
                >
                  {z.type === 'supply' ? 'SUPPLY' : 'DEMAND'} {z.strength > 1 ? `×${z.strength}` : ''}
                </text>
              </g>
            )
          })}
        </g>

        {/* ── Psychological level lines ─────────────────────────────────────── */}
        <g clipPath={`url(#${clipId})`}>
          {psychs.map((p, i) => {
            const y = toY(p)
            return (
              <line
                key={i}
                x1={PAD.left} y1={y}
                x2={PAD.left + chartW} y2={y}
                stroke="var(--muted)"
                strokeWidth={1}
                strokeDasharray="2 4"
                strokeOpacity={0.45}
              />
            )
          })}
        </g>

        {/* ── Trendlines ────────────────────────────────────────────────────── */}
        <g clipPath={`url(#${clipId})`}>
          {tlLines.map(({ x1, y1, x2, y2, gid, dash, tl }) => (
            <g key={gid}>
              {/* Shadow line for thickness */}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={`url(#${gid})`}
                strokeWidth={tl.touches >= 3 ? 2.5 : 1.5}
                strokeLinecap="round"
                strokeDasharray={dash}
                opacity={0.9}
              />
              {/* Touch count badge at right end */}
              {tl.touches >= 2 && (
                <text
                  x={x2 + 4} y={y2 + 4}
                  fontSize={8}
                  fill={tl.type === 'support' ? 'rgba(0,229,176,0.7)' : 'rgba(255,77,106,0.7)'}
                  fontFamily='"IBM Plex Mono", monospace'
                >
                  {tl.touches}T
                </text>
              )}
            </g>
          ))}
        </g>

        {/* ── EMA 50 line ───────────────────────────────────────────────────── */}
        {emaPath && (
          <g clipPath={`url(#${clipId})`}>
            {/* Glow layer */}
            <path
              d={emaPath}
              fill="none"
              stroke="rgba(77,142,255,0.25)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            {/* Line */}
            <path
              d={emaPath}
              fill="none"
              stroke="var(--info)"
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.8}
            />
          </g>
        )}

        {/* ── Candle wicks ─────────────────────────────────────────────────── */}
        <g clipPath={`url(#${clipId})`}>
          {visible.map((c, i) => {
            const cx      = toX(i)
            const bullish = c.close >= c.open
            const color   = bullish ? '#00e5b0' : '#ff4d6a'
            return (
              <line
                key={`wick-${i}`}
                x1={cx} y1={toY(c.high)}
                x2={cx} y2={toY(c.low)}
                stroke={color}
                strokeWidth={WICK_W}
                opacity={0.7}
              />
            )
          })}
        </g>

        {/* ── Candle bodies ─────────────────────────────────────────────────── */}
        <g clipPath={`url(#${clipId})`}>
          {visible.map((c, i) => {
            const cx      = toX(i)
            const bullish = c.close >= c.open
            const color   = bullish ? '#00e5b0' : '#ff4d6a'
            const yTop    = toY(Math.max(c.open, c.close))
            const yBot    = toY(Math.min(c.open, c.close))
            const bh      = Math.max(MIN_BODY, yBot - yTop)
            // Highlight the most recent candle
            const isLast  = i === visible.length - 1
            return (
              <rect
                key={`body-${i}`}
                x={cx - bodyW / 2}
                y={yTop}
                width={bodyW}
                height={bh}
                fill={bullish ? color : color}
                fillOpacity={isLast ? 1 : bullish ? 0.85 : 0.75}
                stroke={isLast ? color : 'none'}
                strokeWidth={isLast ? 0.5 : 0}
                rx={bodyW > 4 ? 1 : 0}
              />
            )
          })}
        </g>

        {/* ── Current price line ────────────────────────────────────────────── */}
        {(() => {
          const yp = toY(price)
          if (yp < PAD.top || yp > PAD.top + chartH) return null
          return (
            <g>
              <line
                x1={PAD.left} y1={yp}
                x2={PAD.left + chartW} y2={yp}
                stroke={currentPriceColor}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.8}
              />
              {/* Price badge on right axis */}
              <rect
                x={PAD.left + chartW + 1}
                y={yp - 10}
                width={PAD.right - 2}
                height={20}
                fill={`url(#${uid}-price-badge)`}
                rx={3}
              />
              <rect
                x={PAD.left + chartW + 1}
                y={yp - 10}
                width={3}
                height={20}
                fill={currentPriceColor}
                rx={1}
              />
              <text
                x={PAD.left + chartW + 8}
                y={yp + 4}
                fontSize={10}
                fontWeight="600"
                fill={currentPriceColor}
                fontFamily='"IBM Plex Mono", monospace'
              >
                {formatPrice(price)}
              </text>
            </g>
          )
        })()}

        {/* ── Price axis (right) ────────────────────────────────────────────── */}
        {ticks.map((p, i) => {
          const y = toY(p)
          if (y < PAD.top || y > PAD.top + chartH) return null
          // Skip tick if it's too close to current price label
          const yPrice = toY(price)
          if (Math.abs(y - yPrice) < 14) return null
          return (
            <text
              key={i}
              x={PAD.left + chartW + 8}
              y={y + 4}
              fontSize={9}
              fill="var(--dim)"
              fontFamily='"IBM Plex Mono", monospace'
              opacity={0.7}
            >
              {formatPrice(p)}
            </text>
          )
        })}

        {/* ── Time axis (bottom) ────────────────────────────────────────────── */}
        {timeLabels.map(({ i, label }) => (
          <text
            key={i}
            x={toX(i)}
            y={PAD.top + chartH + 22}
            fontSize={9}
            fill="var(--dim)"
            textAnchor="middle"
            fontFamily='"IBM Plex Mono", monospace'
            opacity={0.6}
          >
            {label}
          </text>
        ))}

        {/* ── EMA label ─────────────────────────────────────────────────────── */}
        {emaVisible[emaVisible.length - 1] !== null && (
          <text
            x={PAD.left + 6}
            y={PAD.top + 14}
            fontSize={9}
            fill="var(--info)"
            fontFamily='"IBM Plex Mono", monospace'
            opacity={0.7}
          >
            EMA 50
          </text>
        )}

        {/* ── Hover candle highlight ────────────────────────────────────────── */}
        {tooltip && (() => {
          const c       = tooltip.candle
          const cx      = toX(tooltip.idx)
          const bullish = c.close >= c.open
          const color   = bullish ? '#00e5b0' : '#ff4d6a'
          return (
            <g clipPath={`url(#${clipId})`} pointerEvents="none">
              {/* Vertical crosshair */}
              <line
                x1={cx} y1={PAD.top}
                x2={cx} y2={PAD.top + chartH}
                stroke="var(--dim)"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.4}
              />
              {/* Highlight body outline */}
              <rect
                x={cx - bodyW / 2 - 1}
                y={toY(Math.max(c.open, c.close)) - 1}
                width={bodyW + 2}
                height={Math.max(MIN_BODY, toY(Math.min(c.open, c.close)) - toY(Math.max(c.open, c.close))) + 2}
                fill="none"
                stroke={color}
                strokeWidth={1}
                opacity={0.8}
                rx={2}
              />
            </g>
          )
        })()}

        {/* ── Mouse capture overlay ─────────────────────────────────────────── */}
        <rect
          x={PAD.left} y={PAD.top}
          width={chartW} height={chartH}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </svg>

      {/* ── Hover tooltip ─────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-xl overflow-hidden"
          style={{
            left:   tooltipX,
            top:    tooltipY,
            width:  148,
            background: 'rgba(10,16,30,0.95)',
            border: '1px solid var(--border-hover)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Tooltip header */}
          <div
            className="flex items-center justify-between px-2.5 py-1.5"
            style={{
              background: tooltip.candle.close >= tooltip.candle.open
                ? 'rgba(0,229,176,0.08)'
                : 'rgba(255,77,106,0.08)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span
              className="text-2xs font-bold font-mono"
              style={{ color: tooltip.candle.close >= tooltip.candle.open ? 'var(--accent)' : 'var(--danger)' }}
            >
              {tooltip.candle.close >= tooltip.candle.open ? '▲' : '▼'}{' '}
              {formatTime(tooltip.candle.timestamp)}
            </span>
            <span className="text-2xs font-mono text-muted">
              {currentPair}
            </span>
          </div>

          {/* OHLC grid */}
          <div className="px-2.5 py-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {[
              { label: 'O', value: tooltip.candle.open  },
              { label: 'H', value: tooltip.candle.high  },
              { label: 'L', value: tooltip.candle.low   },
              { label: 'C', value: tooltip.candle.close },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-2xs font-mono text-muted">{label}</span>
                <span
                  className="text-2xs font-mono font-semibold"
                  style={{
                    color: label === 'C'
                      ? tooltip.candle.close >= tooltip.candle.open ? 'var(--accent)' : 'var(--danger)'
                      : 'var(--dim)',
                  }}
                >
                  {formatPrice(value)}
                </span>
              </div>
            ))}
          </div>

          {/* Volume */}
          <div
            className="px-2.5 py-1.5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="text-2xs font-mono text-muted">Vol</span>
            <span className="text-2xs font-mono text-dim">
              {tooltip.candle.volume.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ── Live badge (top-left) ─────────────────────────────────────────── */}
      <div
        className="absolute top-3 left-3 flex items-center gap-2"
        style={{ pointerEvents: 'none' }}
      >
        {/* Pair chip */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{
            background: 'rgba(10,16,30,0.8)',
            border: '1px solid var(--border-hover)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span
            className="text-xs font-bold font-mono tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            {currentPair}
          </span>
          {/* Live pulse */}
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: 'var(--accent)' }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: 'var(--accent)' }}
            />
          </span>
        </div>

        {/* Current price chip */}
        <div
          className="flex items-center px-2 py-1 rounded-lg"
          style={{
            background: 'rgba(10,16,30,0.8)',
            border: `1px solid ${currentBullish ? 'rgba(0,229,176,0.3)' : 'rgba(255,77,106,0.3)'}`,
            backdropFilter: 'blur(4px)',
          }}
        >
          <span
            className="text-xs font-bold font-mono"
            style={{ color: currentPriceColor }}
          >
            {formatPrice(price)}
          </span>
        </div>
      </div>
    </div>
  )
}
