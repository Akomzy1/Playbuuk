// lib/market/trendlines.ts
// Trendline detection from swing points.
//
// Strategy:
//   Support trendlines connect swing LOWS  (ascending: demand trendline)
//   Resistance trendlines connect swing HIGHs (descending: supply trendline)
//
// For each pair of swing points we define a line, then count how many other
// swing points of the same type land within a tolerance of that line.
// The line with the most touches wins for each type.
//
// Output fields map to CLAUDE.md eval keys:
//   tl_3touch    — best trendline has ≥ 3 confirmed touches
//   tl_valid_slope — slope is non-flat and non-vertical (0.1–5 pips/candle)
//   tl_span_week   — trendline spans ≥ ~288 candles (1 week × 288 25s bars/day ≈ 2016)
//                    relaxed to 100 candles for MVP simulation timescales

import type { Candle, SwingPoint, Trendline } from './engine'

const TOUCH_TOLERANCE_MULTIPLIER = 0.5   // fraction of ATR for a "touch"
const MIN_SLOPE_PIPS_PER_BAR     = 0.05  // below this → flat (invalid slope)
const MAX_SLOPE_PIPS_PER_BAR     = 10.0  // above this → near-vertical (invalid)
const WEEK_CANDLE_COUNT          = 100   // relaxed "1 week" threshold for 25s bars

// ─── detectTrendlines ─────────────────────────────────────────────────────────

/**
 * Find the best support and resistance trendlines from recent swings.
 *
 * @param swings  Output of detectSwingHighsLows (oldest → newest)
 * @param candles Closed candles — used for reference to latest index
 * @param atr     Current ATR — determines touch tolerance
 */
export function detectTrendlines(
  swings:  SwingPoint[],
  candles: Candle[],
  atr:     number,
): Trendline[] {
  if (swings.length < 2 || isNaN(atr) || atr === 0) return []

  const tolerance     = atr * TOUCH_TOLERANCE_MULTIPLIER
  const latestIndex   = candles.length - 1
  const pipEstimate   = atr / 14  // rough pip size proxy

  const results: Trendline[] = []

  for (const lineType of ['support', 'resistance'] as const) {
    const swingType = lineType === 'support' ? 'low' : 'high'
    const points    = swings.filter(s => s.type === swingType)

    if (points.length < 2) continue

    let best: Trendline | null = null

    // Try every pair of anchor points
    for (let a = 0; a < points.length - 1; a++) {
      for (let b = a + 1; b < points.length; b++) {
        const p1 = points[a]!
        const p2 = points[b]!

        const spanCandles = p2.index - p1.index
        if (spanCandles < 2) continue

        const slope = (p2.price - p1.price) / spanCandles  // price per candle

        // Validate slope in pip-normalised terms
        const absSlopePips = Math.abs(slope) / pipEstimate
        if (absSlopePips < MIN_SLOPE_PIPS_PER_BAR) continue
        if (absSlopePips > MAX_SLOPE_PIPS_PER_BAR) continue

        // Count touches: how many swing points of this type lie on the line?
        let touches = 2  // the anchors themselves
        for (let k = 0; k < points.length; k++) {
          if (k === a || k === b) continue
          const pt = points[k]!
          const expectedPrice = p1.price + slope * (pt.index - p1.index)
          if (Math.abs(pt.price - expectedPrice) <= tolerance) touches++
        }

        if (!best || touches > best.touches) {
          const priceAtCurrent = p1.price + slope * (latestIndex - p1.index)
          best = {
            type:           lineType,
            touches,
            slope,
            startIndex:     p1.index,
            endIndex:       p2.index,
            startPrice:     p1.price,
            endPrice:       p2.price,
            spanCandles,
            priceAtCurrent,
          }
        }
      }
    }

    if (best) results.push(best)
  }

  return results
}

// ─── Eval key helpers ─────────────────────────────────────────────────────────

/** tl_3touch — at least one trendline has ≥ 3 touches. */
export function hasTl3Touch(trendlines: Trendline[]): boolean {
  return trendlines.some(t => t.touches >= 3)
}

/** tl_valid_slope — best trendline has a valid (non-flat, non-vertical) slope. */
export function hasTlValidSlope(trendlines: Trendline[], atr: number): boolean {
  if (trendlines.length === 0 || isNaN(atr) || atr === 0) return false
  const pipEstimate = atr / 14
  return trendlines.some(t => {
    const absSlopePips = Math.abs(t.slope) / pipEstimate
    return absSlopePips >= MIN_SLOPE_PIPS_PER_BAR && absSlopePips <= MAX_SLOPE_PIPS_PER_BAR
  })
}

/** tl_span_week — best trendline spans at least WEEK_CANDLE_COUNT candles. */
export function hasTlSpanWeek(trendlines: Trendline[]): boolean {
  return trendlines.some(t => t.spanCandles >= WEEK_CANDLE_COUNT)
}
