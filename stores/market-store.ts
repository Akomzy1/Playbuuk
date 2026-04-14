// stores/market-store.ts
// Zustand store — live market data pipeline.
//
// Architecture:
//   MarketEngine (simulation) → tick every 2.5s
//     ↓ new Candle (every 10 ticks = 25s)
//   Indicators  (EMA50, RSI14, ATR14)
//   Structure   (swings, BOS, AOI)
//   Trendlines  (best support + resistance line)
//   Patterns    (engulfing, FVG)
//   Session     (current session + killzone)
//     ↓
//   MarketAnalysis object stored per pair
//
// Consumers:
//   components/playbook/live-checklist.tsx   — reads analysis to auto-evaluate items
//   components/playbook/setup-grade.tsx      — reads score derived from analysis
//   components/playbook/candlestick-chart.tsx — reads candles[]
//   components/scanner/pair-scanner.tsx      — reads multiple pairs
//
// Usage:
//   const { analysis, candles, price } = useMarketStore()
//   const { setPair, startEngine, stopEngine } = useMarketStore()

'use client'

import { create } from 'zustand'
import { marketEngine, type Candle, type MarketAnalysis } from '@/lib/market/engine'
import { calculateEMA, calculateRSI, calculateATR } from '@/lib/market/indicators'
import {
  detectSwingHighsLows,
  detectBOS,
  detectAOI,
  inferTrendDirection,
} from '@/lib/market/structure'
import {
  detectTrendlines,
  hasTl3Touch,
  hasTlValidSlope,
  hasTlSpanWeek,
} from '@/lib/market/trendlines'
import { detectEngulfing, detectFVG } from '@/lib/market/patterns'
import { getCurrentSession } from '@/lib/market/session'

// ─── Constants ────────────────────────────────────────────────────────────────

const TICK_MS       = 2500   // 2.5 seconds
const SWING_LOOKBACK = 3     // pivot lookback for swing detection
const PSYCH_LEVEL_PIPS = 10  // within this many pips of a round number

// ─── Store types ──────────────────────────────────────────────────────────────

interface PairState {
  candles:  Candle[]
  price:    number
  bid:      number
  ask:      number
  spread:   number
  analysis: MarketAnalysis
}

interface MarketStore {
  // ── State ──────────────────────────────────────────────────────────────────
  currentPair:  string
  activePairs:  string[]
  pairs:        Record<string, PairState>
  running:      boolean

  // ── Derived convenience accessors (current pair) ──────────────────────────
  price:    number
  candles:  Candle[]
  analysis: MarketAnalysis

  // ── Actions ────────────────────────────────────────────────────────────────
  setPair:     (pair: string) => void
  addPair:     (pair: string) => void
  removePair:  (pair: string) => void
  tick:        () => void
  startEngine: () => void
  stopEngine:  () => void
}

// ─── Empty analysis ───────────────────────────────────────────────────────────

function emptyAnalysis(): MarketAnalysis {
  return {
    price: 0, bid: 0, ask: 0, spread: 0,
    ema50: 0, rsi: 50, atr: 0,
    swings: [], zones: [], trendlines: [],
    trend_direction: 'ranging',
    bos_type: null,
    engulfing_type: null,
    session_name: null,
    lastCandle: null,
    trend_exists:    false,
    aoi_count_2:     false,
    price_in_aoi:    false,
    bos_detected:    false,
    bos_synced:      false,
    engulfing:       false,
    ema50_near:      false,
    psych_level:     false,
    session_active:  false,
    session_killzone: false,
    tl_3touch:       false,
    tl_valid_slope:  false,
    tl_span_week:    false,
    fvg_detected:    false,
  }
}

// ─── Analysis pipeline ────────────────────────────────────────────────────────

function runAnalysis(pair: string): PairState | null {
  const priceData = marketEngine.getCurrentPrice(pair)
  if (!priceData) return null

  const candles = marketEngine.getCandles(pair, 300)
  if (candles.length < 20) return null

  const { price, bid, ask, spread } = priceData

  // ── Indicators ─────────────────────────────────────────────────────────────
  const ema50 = calculateEMA(candles, 50)
  const rsi   = calculateRSI(candles, 14)
  const atr   = calculateATR(candles, 14)

  // ── Structure ──────────────────────────────────────────────────────────────
  const swings        = detectSwingHighsLows(candles, SWING_LOOKBACK)
  const bos           = detectBOS(candles, swings)
  const aoiResult     = detectAOI(swings, price, isNaN(atr) ? price * 0.0005 : atr)
  const trendDir      = inferTrendDirection(swings)

  // ── Trendlines ─────────────────────────────────────────────────────────────
  const trendlines = detectTrendlines(
    swings,
    candles,
    isNaN(atr) ? price * 0.0005 : atr,
  )

  // ── Patterns ───────────────────────────────────────────────────────────────
  const engulfing = detectEngulfing(candles, 5)
  const fvg       = detectFVG(candles, 10)

  // ── Session ────────────────────────────────────────────────────────────────
  const session = getCurrentSession()

  // ── Psychological level check ──────────────────────────────────────────────
  // Round to nearest 100 pips (e.g., 1.0800, 1.0900, 150.00) and check proximity
  const pipApprox   = isNaN(atr) ? price * 0.0001 : atr / 14
  const roundUnit   = pipApprox * 100
  const nearestRound = Math.round(price / roundUnit) * roundUnit
  const pipsToRound  = Math.abs(price - nearestRound) / pipApprox
  const nearPsych    = pipsToRound <= PSYCH_LEVEL_PIPS

  // ── EMA proximity ──────────────────────────────────────────────────────────
  const ema50Near = !isNaN(ema50) && !isNaN(atr)
    ? Math.abs(price - ema50) <= atr
    : false

  // ── Build MarketAnalysis ───────────────────────────────────────────────────
  const analysis: MarketAnalysis = {
    price, bid, ask, spread,
    ema50: isNaN(ema50) ? 0 : ema50,
    rsi:   isNaN(rsi)   ? 50 : rsi,
    atr:   isNaN(atr)   ? 0 : atr,
    swings,
    zones:      aoiResult.zones,
    trendlines,
    trend_direction:  trendDir,
    bos_type:         bos.type,
    engulfing_type:   engulfing.type,
    session_name:     session.name,
    lastCandle:       candles[candles.length - 1] ?? null,

    // ── Checklist eval keys ────────────────────────────────────────────────
    trend_exists:     trendDir !== 'ranging',
    aoi_count_2:      aoiResult.count2,
    price_in_aoi:     aoiResult.inAOI,
    bos_detected:     bos.detected,
    bos_synced:       bos.synced,
    engulfing:        engulfing.detected,
    ema50_near:       ema50Near,
    psych_level:      nearPsych,
    session_active:   session.active,
    session_killzone: session.killzone,
    tl_3touch:        hasTl3Touch(trendlines),
    tl_valid_slope:   hasTlValidSlope(trendlines, isNaN(atr) ? price * 0.0005 : atr),
    tl_span_week:     hasTlSpanWeek(trendlines),
    fvg_detected:     fvg,
  }

  return { candles, price, bid, ask, spread, analysis }
}

// ─── Store ────────────────────────────────────────────────────────────────────

// Interval handle lives outside Zustand state (no re-render on change)
let _intervalId: ReturnType<typeof setInterval> | null = null

const DEFAULT_PAIR = 'EURUSD'

function initPair(pair: string): PairState {
  marketEngine.register(pair)
  return runAnalysis(pair) ?? {
    candles:  [],
    price:    0,
    bid:      0,
    ask:      0,
    spread:   0,
    analysis: emptyAnalysis(),
  }
}

export const useMarketStore = create<MarketStore>((set, get) => {
  // Bootstrap the default pair immediately
  const initialState = initPair(DEFAULT_PAIR)

  return {
    currentPair: DEFAULT_PAIR,
    activePairs: [DEFAULT_PAIR],
    pairs: { [DEFAULT_PAIR]: initialState },
    running: false,

    // Convenience accessors (mirror current pair)
    price:    initialState.price,
    candles:  initialState.candles,
    analysis: initialState.analysis,

    // ── setPair ─────────────────────────────────────────────────────────────
    setPair(pair) {
      const { pairs, activePairs } = get()

      // Register if not yet tracked
      if (!pairs[pair]) {
        const newState = initPair(pair)
        set(s => ({
          pairs:       { ...s.pairs, [pair]: newState },
          activePairs: activePairs.includes(pair) ? activePairs : [...activePairs, pair],
        }))
      }

      const pairState = get().pairs[pair] ?? initPair(pair)
      set({
        currentPair: pair,
        price:       pairState.price,
        candles:     pairState.candles,
        analysis:    pairState.analysis,
      })
    },

    // ── addPair ─────────────────────────────────────────────────────────────
    addPair(pair) {
      const { pairs, activePairs } = get()
      if (activePairs.includes(pair)) return
      const newState = initPair(pair)
      set(s => ({
        pairs:       { ...s.pairs, [pair]: newState },
        activePairs: [...activePairs, pair],
      }))
    },

    // ── removePair ──────────────────────────────────────────────────────────
    removePair(pair) {
      const { currentPair, activePairs, pairs } = get()
      const next = activePairs.filter(p => p !== pair)
      const nextPairs = { ...pairs }
      delete nextPairs[pair]

      const nextCurrent = currentPair === pair ? (next[0] ?? DEFAULT_PAIR) : currentPair
      const nextState   = nextPairs[nextCurrent] ?? initPair(nextCurrent)

      set({
        activePairs: next,
        pairs:       nextPairs,
        currentPair: nextCurrent,
        price:       nextState.price,
        candles:     nextState.candles,
        analysis:    nextState.analysis,
      })
    },

    // ── tick ────────────────────────────────────────────────────────────────
    tick() {
      const { activePairs, currentPair } = get()
      const nextPairs: Record<string, PairState> = { ...get().pairs }

      for (const pair of activePairs) {
        marketEngine.tick(pair)  // advance simulation
        const updated = runAnalysis(pair)
        if (updated) nextPairs[pair] = updated
      }

      const current = nextPairs[currentPair]
      set({
        pairs:    nextPairs,
        price:    current?.price    ?? get().price,
        candles:  current?.candles  ?? get().candles,
        analysis: current?.analysis ?? get().analysis,
      })
    },

    // ── startEngine ─────────────────────────────────────────────────────────
    startEngine() {
      if (_intervalId !== null) return  // already running
      set({ running: true })
      _intervalId = setInterval(() => {
        get().tick()
      }, TICK_MS)
    },

    // ── stopEngine ──────────────────────────────────────────────────────────
    stopEngine() {
      if (_intervalId !== null) {
        clearInterval(_intervalId)
        _intervalId = null
      }
      set({ running: false })
    },
  }
})
