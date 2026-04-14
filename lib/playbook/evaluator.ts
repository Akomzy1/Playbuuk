// lib/playbook/evaluator.ts
// Discipline engine — evaluates individual checklist items against live market data.
//
// Each evalKey maps 1-to-1 to a boolean field on MarketAnalysis that the
// market-store populates every 2.5s tick. The evaluator is intentionally
// a thin dispatch layer: all the real detection logic lives in lib/market/*.
//
// This separation is deliberate — it keeps the evaluator stateless and
// pure so it can be called in server contexts (alert scanner) or on the
// client (live-checklist) with identical behaviour.
//
// evalKey = null means the item is MANUAL ONLY.
// The evaluator returns `undefined` for those — the checklist-store
// treats undefined as "not auto-evaluated" and defers to the trader's
// manual toggle.
//
// Psychology framing:
//   "BOS either happened or it didn't — you can't talk yourself into it."
//   Auto items eliminate subjective interpretation entirely.

import type { MarketAnalysis } from '@/lib/market/engine'

// ─── Canonical evalKey set ────────────────────────────────────────────────────

/**
 * All valid auto-evaluation keys (from CLAUDE.md).
 * Checklist items with evalKey not in this set — or evalKey = null — are manual.
 */
export const EVAL_KEYS = [
  'trend_exists',
  'aoi_count_2',
  'price_in_aoi',
  'bos_detected',
  'bos_synced',
  'engulfing',
  'ema50_near',
  'psych_level',
  'session_active',
  'session_killzone',
  'tl_3touch',
  'tl_valid_slope',
  'tl_span_week',
  'fvg_detected',
] as const

export type EvalKey = (typeof EVAL_KEYS)[number]

/** Narrow-check: is the given string a known evalKey? */
export function isEvalKey(key: string): key is EvalKey {
  return (EVAL_KEYS as readonly string[]).includes(key)
}

// ─── evaluateChecklistItem ────────────────────────────────────────────────────

/**
 * Evaluate a single checklist item against the current MarketAnalysis.
 *
 * @param evalKey  The item's evalKey string (from ChecklistItem.evalKey)
 * @param analysis The current MarketAnalysis from market-store
 * @returns
 *   true/false — auto-evaluated result
 *   undefined  — evalKey is null or unrecognised (manual item)
 */
export function evaluateChecklistItem(
  evalKey: string | null,
  analysis: MarketAnalysis,
): boolean | undefined {
  if (!evalKey || !isEvalKey(evalKey)) return undefined

  // Direct dispatch to the MarketAnalysis boolean flags.
  // Each flag is set by the relevant lib/market/* detector every tick.
  switch (evalKey) {
    // ── Trend ───────────────────────────────────────────────────────────────
    case 'trend_exists':
      // True when swings show clear HH+HL or LH+LL sequence.
      return analysis.trend_exists

    // ── Areas of Interest ───────────────────────────────────────────────────
    case 'aoi_count_2':
      // True when ≥2 distinct supply/demand zones are identified.
      return analysis.aoi_count_2

    case 'price_in_aoi':
      // True when current price is inside at least one AOI zone.
      return analysis.price_in_aoi

    // ── Break of Structure ──────────────────────────────────────────────────
    case 'bos_detected':
      // True when price closed through the most recent swing high/low.
      return analysis.bos_detected

    case 'bos_synced':
      // True when the BOS occurred within the last 3 candles (recent confirmation).
      // Acts as a proxy for higher-timeframe alignment.
      return analysis.bos_synced

    // ── Pattern ─────────────────────────────────────────────────────────────
    case 'engulfing':
      // True when a bullish or bearish engulfing candle is present within
      // the last 5 candles.
      return analysis.engulfing

    // ── Indicators ──────────────────────────────────────────────────────────
    case 'ema50_near':
      // True when current price is within 1× ATR of the 50-period EMA.
      // Signals price is interacting with the dynamic S/R level.
      return analysis.ema50_near

    // ── Psychological levels ─────────────────────────────────────────────────
    case 'psych_level':
      // True when price is within ~10 pips of a major round-number level
      // (e.g. 1.0800, 1.0900, 150.00, 2400.00).
      return analysis.psych_level

    // ── Session ─────────────────────────────────────────────────────────────
    case 'session_active':
      // True during any major session (London, NY, Tokyo, Sydney).
      return analysis.session_active

    case 'session_killzone':
      // True during London open (07–09 UTC) or NY open (13–15 UTC).
      // These are the highest-probability reversal / manipulation windows.
      return analysis.session_killzone

    // ── Trendlines ──────────────────────────────────────────────────────────
    case 'tl_3touch':
      // True when the best detected trendline has ≥3 confirmed price touches.
      return analysis.tl_3touch

    case 'tl_valid_slope':
      // True when the trendline slope is within normal range (not flat or near-vertical).
      return analysis.tl_valid_slope

    case 'tl_span_week':
      // True when the trendline spans ≥ ~100 candles (≈1 week on 25s bars).
      return analysis.tl_span_week

    // ── Fair Value Gap ───────────────────────────────────────────────────────
    case 'fvg_detected':
      // True when a 3-candle imbalance (FVG) is present in the last 10 candles.
      return analysis.fvg_detected

    // TypeScript exhaustive check — should never reach here
    default: {
      const _exhaustive: never = evalKey
      return undefined
    }
  }
}

// ─── evaluateAll ─────────────────────────────────────────────────────────────

/**
 * Run all known evalKeys against the current analysis.
 * Returns a map of evalKey → boolean for consumers that want the full picture.
 *
 * Used by the alert scanner to evaluate all criteria simultaneously.
 */
export function evaluateAll(analysis: MarketAnalysis): Record<EvalKey, boolean> {
  return Object.fromEntries(
    EVAL_KEYS.map(key => [key, analysis[key]]),
  ) as Record<EvalKey, boolean>
}
