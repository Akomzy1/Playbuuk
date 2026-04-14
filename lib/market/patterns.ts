// lib/market/patterns.ts
// Candlestick pattern detection.
//
// Engulfing:
//   Bullish — bearish candle followed by a bullish candle whose body fully
//             engulfs the prior candle's body.
//   Bearish — mirror image.
//
// Fair Value Gap (FVG / Imbalance):
//   A 3-candle sequence where candle[n-2].high < candle[n].low (bullish gap)
//   or candle[n-2].low > candle[n].high (bearish gap), leaving an unfilled
//   price range — an "imbalance" that price may return to fill.
//
// Both patterns look back across the last N candles to detect recent signals
// rather than only the single most recent bar.

import type { Candle } from './engine'

// ─── Engulfing ────────────────────────────────────────────────────────────────

export interface EngulfingResult {
  detected: boolean
  type:     'bullish' | 'bearish' | null
}

/**
 * Detect a bullish or bearish engulfing pattern in the last `lookback` candles.
 * Returns the most recent occurrence.
 *
 * @param candles  Closed candles, oldest → newest
 * @param lookback How many candles to look back (default 5)
 */
export function detectEngulfing(
  candles:  Candle[],
  lookback = 5,
): EngulfingResult {
  const none: EngulfingResult = { detected: false, type: null }
  if (candles.length < 2) return none

  const start = Math.max(1, candles.length - lookback)

  // Scan newest → oldest for the most recent engulfing
  for (let i = candles.length - 1; i >= start; i--) {
    const curr = candles[i]!
    const prev = candles[i - 1]!

    const currBody = Math.abs(curr.close - curr.open)
    const prevBody = Math.abs(prev.close - prev.open)

    // Skip doji-like candles (body < 10% of range)
    const currRange = curr.high - curr.low
    if (currRange > 0 && currBody / currRange < 0.1) continue

    const bullish =
      prev.close < prev.open &&  // prev is bearish
      curr.close > curr.open &&  // curr is bullish
      curr.open  < prev.close && // curr opens below prev close
      curr.close > prev.open  && // curr closes above prev open
      currBody > prevBody

    const bearish =
      prev.close > prev.open &&  // prev is bullish
      curr.close < curr.open &&  // curr is bearish
      curr.open  > prev.close && // curr opens above prev close
      curr.close < prev.open  && // curr closes below prev open
      currBody > prevBody

    if (bullish) return { detected: true, type: 'bullish' }
    if (bearish) return { detected: true, type: 'bearish' }
  }

  return none
}

// ─── Fair Value Gap ───────────────────────────────────────────────────────────

/**
 * Detect a Fair Value Gap (imbalance) in the last `lookback` candles.
 *
 * A bullish FVG: candles[i-2].high < candles[i].low  (gap left above)
 * A bearish FVG: candles[i-2].low  > candles[i].high (gap left below)
 *
 * @param candles  Closed candles, oldest → newest
 * @param lookback How many candles to scan (default 10)
 */
export function detectFVG(candles: Candle[], lookback = 10): boolean {
  if (candles.length < 3) return false

  const start = Math.max(2, candles.length - lookback)

  for (let i = candles.length - 1; i >= start; i--) {
    const c0 = candles[i - 2]!  // candle N-2
    const c2 = candles[i]!      // candle N

    // Bullish FVG: gap above (c0.high < c2.low → untouched range)
    if (c0.high < c2.low) return true

    // Bearish FVG: gap below (c0.low > c2.high → untouched range)
    if (c0.low > c2.high) return true
  }

  return false
}
