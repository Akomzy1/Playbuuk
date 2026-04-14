// lib/market/indicators.ts
// Pure technical indicator functions.
//
// All functions accept a Candle array (oldest → newest) and a period.
// Returns NaN when there is insufficient data — callers must guard.
//
// EMA  — standard exponential moving average (multiplier = 2 / (period + 1))
// RSI  — Wilder's RSI using SMA seed for the first period
// ATR  — Wilder's smoothed ATR

import type { Candle } from './engine'

// ─── EMA ──────────────────────────────────────────────────────────────────────

/**
 * Exponential Moving Average of candle close prices.
 * Returns the EMA value at the last candle.
 */
export function calculateEMA(candles: Candle[], period: number): number {
  if (candles.length < period) return NaN

  const k = 2 / (period + 1)

  // Seed with simple average of first `period` closes
  let ema = 0
  for (let i = 0; i < period; i++) {
    ema += candles[i]!.close
  }
  ema /= period

  // Apply EMA formula for remaining candles
  for (let i = period; i < candles.length; i++) {
    ema = candles[i]!.close * k + ema * (1 - k)
  }

  return ema
}

// ─── RSI ──────────────────────────────────────────────────────────────────────

/**
 * Wilder's Relative Strength Index.
 * Returns 0–100. Returns NaN when candles < period + 1.
 */
export function calculateRSI(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return NaN

  // Compute all price changes
  const changes: number[] = []
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i]!.close - candles[i - 1]!.close)
  }

  // Seed: simple average gain/loss over first `period` changes
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    const c = changes[i] ?? 0
    if (c > 0) avgGain += c
    else        avgLoss += Math.abs(c)
  }
  avgGain /= period
  avgLoss /= period

  // Wilder's smoothing for remaining changes
  for (let i = period; i < changes.length; i++) {
    const c = changes[i] ?? 0
    const gain = c > 0 ? c : 0
    const loss = c < 0 ? Math.abs(c) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// ─── ATR ──────────────────────────────────────────────────────────────────────

/**
 * Wilder's Average True Range.
 * True Range = max(high-low, |high-prevClose|, |low-prevClose|)
 * Returns NaN when candles < period + 1.
 */
export function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return NaN

  // Calculate all true ranges
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i]!
    const prev = candles[i - 1]!
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low  - prev.close),
    )
    trs.push(tr)
  }

  // Seed: simple average of first `period` true ranges
  let atr = 0
  for (let i = 0; i < period; i++) {
    atr += trs[i] ?? 0
  }
  atr /= period

  // Wilder's smoothing
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + (trs[i] ?? 0)) / period
  }

  return atr
}
