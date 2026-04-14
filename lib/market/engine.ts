// lib/market/engine.ts
// Simulated forex market data engine.
//
// Generates realistic OHLCV candlestick data for any forex pair using a
// phase-driven random walk model:
//   trending_up | trending_down → directional drift + moderate volatility
//   ranging                     → mean-reverting, low drift
//   reversal                    → high volatility, drift flips
//
// Tick cadence: called every 2.5s by the Zustand store.
// Candle cadence: 10 ticks = 1 closed candle (≈ 25s per bar).
//
// All price moves are normalised to pip units so parameters are pair-agnostic.

// ─── Public types ─────────────────────────────────────────────────────────────

export interface Candle {
  timestamp: number  // unix ms, candle open time
  open:      number
  high:      number
  low:       number
  close:     number
  volume:    number
}

export interface SwingPoint {
  index:     number   // candle index in the candles array
  price:     number
  type:      'high' | 'low'
  timestamp: number
}

export interface AreaOfInterest {
  top:      number
  bottom:   number
  mid:      number
  strength: number            // number of swing confluences
  type:     'supply' | 'demand'
}

export interface Trendline {
  type:           'support' | 'resistance'
  touches:        number
  slope:          number      // price change per candle
  startIndex:     number
  endIndex:       number
  startPrice:     number
  endPrice:       number
  spanCandles:    number
  priceAtCurrent: number      // projected price at latest candle
}

// MarketAnalysis — the canonical output consumed by the checklist evaluator.
// Every field in `evalKey` from CLAUDE.md is represented here exactly.
export interface MarketAnalysis {
  // ── Live price ────────────────────────────────────────────────────────────
  price:  number
  bid:    number
  ask:    number
  spread: number

  // ── Indicators ────────────────────────────────────────────────────────────
  ema50: number
  rsi:   number
  atr:   number

  // ── Collections ───────────────────────────────────────────────────────────
  swings:     SwingPoint[]
  zones:      AreaOfInterest[]
  trendlines: Trendline[]

  // ── Derived context ───────────────────────────────────────────────────────
  trend_direction:  'bullish' | 'bearish' | 'ranging'
  bos_type:         'bullish' | 'bearish' | null
  engulfing_type:   'bullish' | 'bearish' | null
  session_name:     string | null
  lastCandle:       Candle | null

  // ── Checklist evalKeys (CLAUDE.md canonical list) ─────────────────────────
  trend_exists:    boolean  // clear higher-highs/higher-lows or lower sequence
  aoi_count_2:     boolean  // ≥2 identified AOI zones
  price_in_aoi:    boolean  // current price inside an AOI zone
  bos_detected:    boolean  // break of structure confirmed
  bos_synced:      boolean  // BOS present on the visible candle set (proxy for HTF)
  engulfing:       boolean  // engulfing candle pattern on last 2 candles
  ema50_near:      boolean  // price within 1× ATR of EMA50
  psych_level:     boolean  // price within 10 pips of a round-number level
  session_active:  boolean  // any major session is currently open
  session_killzone: boolean // London open (07–09 UTC) or NY open (13–15 UTC)
  tl_3touch:       boolean  // best trendline has ≥3 confirmed touches
  tl_valid_slope:  boolean  // trendline slope is within normal range (not flat/vertical)
  tl_span_week:    boolean  // trendline spans ≥ 1 week of candle history
  fvg_detected:    boolean  // fair value gap in last 10 candles
}

// ─── Pair config ──────────────────────────────────────────────────────────────

interface PairConfig {
  base:   number   // realistic mid-price
  pip:    number   // one pip in price units
  spread: number   // typical spread in price units
}

export const PAIR_CONFIG: Record<string, PairConfig> = {
  EURUSD: { base: 1.08500, pip: 0.0001,  spread: 0.00010 },
  GBPUSD: { base: 1.27000, pip: 0.0001,  spread: 0.00015 },
  USDJPY: { base: 149.500, pip: 0.010,   spread: 0.02000 },
  USDCAD: { base: 1.36000, pip: 0.0001,  spread: 0.00015 },
  AUDUSD: { base: 0.65000, pip: 0.0001,  spread: 0.00012 },
  NZDUSD: { base: 0.59000, pip: 0.0001,  spread: 0.00015 },
  USDCHF: { base: 0.89000, pip: 0.0001,  spread: 0.00012 },
  EURJPY: { base: 162.000, pip: 0.010,   spread: 0.03000 },
  GBPJPY: { base: 190.000, pip: 0.010,   spread: 0.04000 },
  EURGBP: { base: 0.85400, pip: 0.0001,  spread: 0.00013 },
  XAUUSD: { base: 2350.00, pip: 0.100,   spread: 0.50000 },
  BTCUSD: { base: 65000.0, pip: 1.00000, spread: 50.0000 },
}

// ─── Phase config ─────────────────────────────────────────────────────────────

type MarketPhase = 'trending_up' | 'trending_down' | 'ranging' | 'reversal'

interface PhaseParams {
  driftPips: number  // mean pip move per tick (can be negative)
  volPips:   number  // std-dev pip move per tick
  minBars:   number
  maxBars:   number
}

const PHASE_PARAMS: Record<MarketPhase, PhaseParams> = {
  trending_up:   { driftPips:  0.30, volPips: 1.20, minBars: 20, maxBars: 70 },
  trending_down: { driftPips: -0.30, volPips: 1.20, minBars: 20, maxBars: 70 },
  ranging:       { driftPips:  0.00, volPips: 0.70, minBars: 15, maxBars: 45 },
  reversal:      { driftPips:  0.00, volPips: 3.50, minBars:  3, maxBars: 10 },
}

// ─── Internal pair state ──────────────────────────────────────────────────────

interface PairState {
  config:  PairConfig
  price:   number                // current mid price
  phase:   MarketPhase
  barsRemainingInPhase: number
  prevTrendDirection:   'up' | 'down'  // used to flip on reversal exit
  // In-progress candle
  candleOpen:      number
  candleHigh:      number
  candleLow:       number
  candleOpenTime:  number
  ticksInCandle:   number
  candleVolume:    number
  // History
  candles: Candle[]
}

const TICKS_PER_CANDLE = 10
const MAX_CANDLE_HISTORY = 500

// ─── MarketEngine ─────────────────────────────────────────────────────────────

export class MarketEngine {
  private states = new Map<string, PairState>()

  /** Register a pair. Idempotent. */
  register(pair: string): void {
    if (this.states.has(pair)) return

    const config: PairConfig = PAIR_CONFIG[pair] ?? PAIR_CONFIG['EURUSD'] ?? {
      base: 1.08500, pip: 0.0001, spread: 0.0001,
    }
    const now = Date.now()

    // Seed with a small history so indicators have data immediately
    const seedCandles = this.generateSeedHistory(config, now)
    const lastCandle  = seedCandles[seedCandles.length - 1] ?? {
      open: config.base, high: config.base, low: config.base,
      close: config.base, volume: 0, timestamp: now,
    }

    const state: PairState = {
      config,
      price:   lastCandle.close,
      phase:   'ranging',
      barsRemainingInPhase: randomInt(
        PHASE_PARAMS.ranging.minBars,
        PHASE_PARAMS.ranging.maxBars,
      ),
      prevTrendDirection: 'up',
      candleOpen:     lastCandle.close,
      candleHigh:     lastCandle.close,
      candleLow:      lastCandle.close,
      candleOpenTime: now,
      ticksInCandle:  0,
      candleVolume:   0,
      candles:        seedCandles,
    }

    this.states.set(pair, state)
  }

  /**
   * Advance the simulation by one tick (called every 2.5 s).
   * Returns a newly closed Candle when 10 ticks elapse, otherwise null.
   */
  tick(pair: string): Candle | null {
    const s = this.states.get(pair)
    if (!s) return null

    // Generate tick price move
    const params = PHASE_PARAMS[s.phase]
    const move   = (params.driftPips + gaussianRandom() * params.volPips) * s.config.pip

    // For reversal, drift direction is the opposite of prevTrend
    const signedMove = s.phase === 'reversal'
      ? move * (s.prevTrendDirection === 'up' ? -1 : 1)
      : move

    s.price = Math.max(s.price + signedMove, s.config.pip * 10)

    // Update in-progress candle
    if (s.price > s.candleHigh) s.candleHigh = s.price
    if (s.price < s.candleLow)  s.candleLow  = s.price
    s.candleVolume += randomInt(50, 200)
    s.ticksInCandle++

    // Candle close?
    if (s.ticksInCandle < TICKS_PER_CANDLE) return null

    const closed: Candle = {
      timestamp: s.candleOpenTime,
      open:      s.candleOpen,
      high:      s.candleHigh,
      low:       s.candleLow,
      close:     s.price,
      volume:    s.candleVolume,
    }

    s.candles.push(closed)
    if (s.candles.length > MAX_CANDLE_HISTORY) s.candles.shift()

    // Advance phase counter
    s.barsRemainingInPhase--
    if (s.barsRemainingInPhase <= 0) this.transitionPhase(s)

    // Reset in-progress candle
    const nextTime = s.candleOpenTime + TICKS_PER_CANDLE * 2500
    s.candleOpen     = s.price
    s.candleHigh     = s.price
    s.candleLow      = s.price
    s.candleOpenTime = nextTime
    s.ticksInCandle  = 0
    s.candleVolume   = 0

    return closed
  }

  /** Return the last `limit` closed candles for a pair. */
  getCandles(pair: string, limit = 200): Candle[] {
    const s = this.states.get(pair)
    if (!s) return []
    return s.candles.slice(-limit)
  }

  /** Current bid/ask/spread. */
  getCurrentPrice(pair: string): { price: number; bid: number; ask: number; spread: number } | null {
    const s = this.states.get(pair)
    if (!s) return null
    const half = s.config.spread / 2
    return {
      price:  s.price,
      bid:    s.price - half,
      ask:    s.price + half,
      spread: s.config.spread,
    }
  }

  /** All registered pairs. */
  getPairs(): string[] {
    return Array.from(this.states.keys())
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private transitionPhase(s: PairState): void {
    const prev = s.phase

    if (prev === 'ranging') {
      // 60% chance to start trending in a random direction
      s.phase = Math.random() < 0.6
        ? (Math.random() < 0.5 ? 'trending_up' : 'trending_down')
        : 'ranging'
    } else if (prev === 'trending_up') {
      s.prevTrendDirection = 'up'
      s.phase = Math.random() < 0.3 ? 'reversal' : 'ranging'
    } else if (prev === 'trending_down') {
      s.prevTrendDirection = 'down'
      s.phase = Math.random() < 0.3 ? 'reversal' : 'ranging'
    } else {
      // reversal → trending opposite direction
      s.phase = s.prevTrendDirection === 'up' ? 'trending_down' : 'trending_up'
    }

    const p = PHASE_PARAMS[s.phase]
    s.barsRemainingInPhase = randomInt(p.minBars, p.maxBars)
  }

  /** Build ~200 candles of history so indicators are warm from the start. */
  private generateSeedHistory(config: PairConfig, now: number): Candle[] {
    const SEED_COUNT = 200
    const CANDLE_MS  = TICKS_PER_CANDLE * 2500
    const candles: Candle[] = []
    let price = config.base + (Math.random() - 0.5) * config.pip * 20

    for (let i = 0; i < SEED_COUNT; i++) {
      const ts    = now - (SEED_COUNT - i) * CANDLE_MS
      const open  = price
      let high    = price
      let low     = price
      let volume  = 0

      for (let t = 0; t < TICKS_PER_CANDLE; t++) {
        const move = (gaussianRandom() * 1.2) * config.pip
        price = Math.max(price + move, config.pip * 10)
        if (price > high) high = price
        if (price < low)  low  = price
        volume += randomInt(50, 200)
      }

      candles.push({ timestamp: ts, open, high, low, close: price, volume })
    }

    return candles
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Box-Muller transform — standard normal sample. */
function gaussianRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Singleton instance shared across the app. */
export const marketEngine = new MarketEngine()
