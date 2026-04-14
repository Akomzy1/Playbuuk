// lib/market/structure.ts
// Market structure detection: swing points, Break of Structure, Areas of Interest.
//
// Swing detection uses a pivot approach:
//   A candle at index i is a swing HIGH if its high is the highest in the
//   window [i-lookback … i+lookback].  Lows are the mirror.
//
// BOS (Break of Structure):
//   Bullish BOS — price closes above the most recent swing HIGH.
//   Bearish BOS — price closes below the most recent swing LOW.
//   We also check whether the break happened on the previous closed candle
//   (bos_synced flag), giving the "confirmed" reading.
//
// AOI (Area of Interest):
//   Clustered swing highs form supply zones; swing lows form demand zones.
//   Zones are merged when their mid-points are within 2× ATR of each other.

import type { Candle, SwingPoint, AreaOfInterest } from './engine'

// ─── Swing highs / lows ───────────────────────────────────────────────────────

/**
 * Detect pivot swing highs and lows using a left/right lookback window.
 *
 * @param candles  Closed candles, oldest → newest
 * @param lookback Number of candles on each side of the pivot (default 3)
 */
export function detectSwingHighsLows(
  candles: Candle[],
  lookback = 3,
): SwingPoint[] {
  const swings: SwingPoint[] = []
  const len = candles.length

  for (let i = lookback; i < len - lookback; i++) {
    const curr = candles[i]!
    let isHigh = true
    let isLow  = true

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue
      const c = candles[j]!
      if (c.high >= curr.high) isHigh = false
      if (c.low  <= curr.low)  isLow  = false
    }

    if (isHigh) {
      swings.push({ index: i, price: curr.high, type: 'high', timestamp: curr.timestamp })
    }
    if (isLow) {
      swings.push({ index: i, price: curr.low,  type: 'low',  timestamp: curr.timestamp })
    }
  }

  // Sort by index ascending
  return swings.sort((a, b) => a.index - b.index)
}

// ─── Break of Structure ───────────────────────────────────────────────────────

export interface BOSResult {
  detected:   boolean
  type:       'bullish' | 'bearish' | null
  /** True when the break happened within the last 3 candles (proxy for HTF confirmation). */
  synced:     boolean
  breakPrice: number | null
}

/**
 * Detect the most recent Break of Structure.
 *
 * A bullish BOS occurs when a candle closes above the most recent swing HIGH.
 * Bearish is the mirror.
 *
 * @param candles Closed candles, oldest → newest
 * @param swings  Output of detectSwingHighsLows
 */
export function detectBOS(candles: Candle[], swings: SwingPoint[]): BOSResult {
  const none: BOSResult = { detected: false, type: null, synced: false, breakPrice: null }
  if (candles.length < 5 || swings.length < 2) return none

  const lastIdx    = candles.length - 1
  const lastCandle = candles[lastIdx]!

  // Find the most recent swing HIGH and swing LOW before the last candle
  const recentHighs = swings.filter(s => s.type === 'high' && s.index < lastIdx)
  const recentLows  = swings.filter(s => s.type === 'low'  && s.index < lastIdx)

  if (recentHighs.length === 0 || recentLows.length === 0) return none

  const lastHigh = recentHighs[recentHighs.length - 1]!
  const lastLow  = recentLows[recentLows.length - 1]!

  // Bullish BOS: close above last swing high
  if (lastCandle.close > lastHigh.price) {
    const breakBarAge = lastIdx - lastHigh.index
    return {
      detected:   true,
      type:       'bullish',
      synced:     breakBarAge <= 3,
      breakPrice: lastHigh.price,
    }
  }

  // Bearish BOS: close below last swing low
  if (lastCandle.close < lastLow.price) {
    const breakBarAge = lastIdx - lastLow.index
    return {
      detected:   true,
      type:       'bearish',
      synced:     breakBarAge <= 3,
      breakPrice: lastLow.price,
    }
  }

  return none
}

// ─── Areas of Interest ────────────────────────────────────────────────────────

export interface AOIResult {
  zones:  AreaOfInterest[]
  inAOI:  boolean
  /** At least 2 distinct zones — maps to aoi_count_2 eval key. */
  count2: boolean
}

/**
 * Build supply/demand AOI zones from clustered swing points.
 *
 * Process:
 *  1. Group swing HIGHs into supply zones, swing LOWs into demand zones.
 *  2. Merge any two zone candidates whose mid-points are within 2× ATR.
 *  3. Check whether `currentPrice` falls inside any zone.
 *
 * @param swings       Output of detectSwingHighsLows
 * @param currentPrice Latest bid/mid price
 * @param atr          Current ATR value (used for zone thickness and merge threshold)
 */
export function detectAOI(
  swings:       SwingPoint[],
  currentPrice: number,
  atr:          number,
): AOIResult {
  if (swings.length === 0 || isNaN(atr) || atr === 0) {
    return { zones: [], inAOI: false, count2: false }
  }

  const zoneHalfWidth = atr * 0.5
  const mergeThresh   = atr * 2.0

  type ZoneCandidate = { mid: number; type: 'supply' | 'demand'; count: number }
  const candidates: ZoneCandidate[] = swings.map(s => ({
    mid:   s.price,
    type:  s.type === 'high' ? 'supply' : 'demand',
    count: 1,
  }))

  // Merge nearby candidates of the same type
  const merged: ZoneCandidate[] = []
  for (const c of candidates) {
    const existing = merged.find(
      m => m.type === c.type && Math.abs(m.mid - c.mid) <= mergeThresh,
    )
    if (existing) {
      existing.mid = (existing.mid * existing.count + c.mid) / (existing.count + 1)
      existing.count++
    } else {
      merged.push({ ...c })
    }
  }

  const zones: AreaOfInterest[] = merged.map(m => ({
    top:      m.mid + zoneHalfWidth,
    bottom:   m.mid - zoneHalfWidth,
    mid:      m.mid,
    strength: m.count,
    type:     m.type,
  }))

  const inAOI = zones.some(z => currentPrice >= z.bottom && currentPrice <= z.top)

  return { zones, inAOI, count2: zones.length >= 2 }
}

// ─── Trend direction ─────────────────────────────────────────────────────────

/**
 * Infer overall trend from the sequence of swing highs and lows.
 *   bullish  — higher highs AND higher lows
 *   bearish  — lower highs AND lower lows
 *   ranging  — mixed
 */
export function inferTrendDirection(
  swings: SwingPoint[],
): 'bullish' | 'bearish' | 'ranging' {
  const highs = swings.filter(s => s.type === 'high').slice(-4)
  const lows  = swings.filter(s => s.type === 'low').slice(-4)

  if (highs.length < 2 || lows.length < 2) return 'ranging'

  const hhCount = highs.slice(1).filter((h, i) => h.price > highs[i]!.price).length
  const hlCount = lows .slice(1).filter((l, i) => l.price > lows [i]!.price).length
  const lhCount = highs.slice(1).filter((h, i) => h.price < highs[i]!.price).length
  const llCount = lows .slice(1).filter((l, i) => l.price < lows [i]!.price).length

  const bullScore = hhCount + hlCount
  const bearScore = lhCount + llCount
  const maxScore  = (highs.length - 1) + (lows.length - 1)

  if (bullScore >= maxScore * 0.6) return 'bullish'
  if (bearScore >= maxScore * 0.6) return 'bearish'
  return 'ranging'
}
