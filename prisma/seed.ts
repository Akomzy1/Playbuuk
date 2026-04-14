// prisma/seed.ts
// Seeds the database with:
//   — 1 system admin profile (required for requested_by FK on MentorRequest)
//   — 3 verified mentors with fully-populated playbooks
//   — 3 draft mentors (admin_added) with AI-draft playbooks
//   — MentorEscrow rows for the 3 draft mentors
//   — 3 MentorRequest rows (mentors not yet on the platform)

import { PrismaClient, type Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Prisma 7 requires the pg adapter (matches lib/db.ts setup)
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Fixed UUID for the seed system/admin profile so MentorRequest.requested_by
// has a valid FK target.
const SYSTEM_PROFILE_ID = '00000000-0000-0000-0000-000000000001'

// ─── Verified mentor playbook data ───────────────────────────────────────────

const alexGPlaybook = {
  strategy_name: 'ICT Smart Money Concepts (SMC)',
  summary:
    'Trade with institutional order flow using Smart Money Concepts. Identify Break of Structure (BOS) and Change of Character (CHoCH) to confirm trend direction, mark Areas of Interest (order blocks, FVGs) and enter on the 15min when price returns to a premium/discount zone with an FVG fill confirmation during London or NY killzone sessions.',
  timeframes: ['15min', '1H', '4H'],
  core_concepts: [
    'Break of Structure (BOS) — higher highs/higher lows confirms bullish bias',
    'Change of Character (CHoCH) — first opposing BOS signals potential reversal',
    'Order Blocks — supply/demand zones where institutions placed orders',
    'Fair Value Gaps (FVG) — price imbalances that act as magnets',
    'Premium & Discount Zones — only buy in discount, only sell in premium',
    'Market Structure Shift (MSS) — lower timeframe BOS aligning with HTF bias',
    'Killzone sessions — London (07:00–10:00 GMT) and NY (13:00–16:00 GMT) only',
  ],
  entry_rules: [
    { rule: 'Confirm HTF bias', detail: '4H chart must show clear BOS in intended direction with no opposing CHoCH invalidation' },
    { rule: 'Identify order block or FVG', detail: 'Mark the 1H order block or FVG that aligns with the HTF bias zone' },
    { rule: 'Wait for displacement into zone', detail: 'Price must displace INTO the zone — do not anticipate. Wait for the wick to touch' },
    { rule: 'Entry on 15min MSS', detail: 'Switch to 15min: enter when 15min breaks structure in favour of HTF bias after touching the zone' },
    { rule: 'Session filter', detail: 'Only take entries during London (07:00–10:00 GMT) or NY (13:00–16:00 GMT) killzones' },
    { rule: 'Displacement candle confirmation', detail: 'Entry candle must be an engulfing or strong displacement — no doji entries' },
  ],
  exit_rules: [
    { rule: 'Take profit at next liquidity pool', detail: 'Target equal highs/lows or previous swing high/low as TP1. Partial close 50% at TP1.' },
    { rule: 'TP2 at premium/discount extreme', detail: 'Run remaining position to the 0.79 or 1.0 FIB extension of the last swing' },
    { rule: 'Stop loss below/above order block', detail: 'SL placed 3–5 pips below the low of the entry order block (buys) or above the high (sells)' },
    { rule: 'Invalidation on close through zone', detail: 'If price CLOSES through the zone on the 15min, exit immediately — structure has shifted' },
  ],
  risk_management: {
    risk_per_trade: '1%',
    rr_ratio: '1:3 minimum',
    max_daily_loss: '3%',
    max_open_trades: 2,
    position_sizing: 'Fixed 1% risk per trade. Lot size calculated from SL distance.',
    notes: 'Never move SL to breakeven before TP1 is reached. Let the trade breathe. Max 2 trades per day.',
  },
  indicators: [
    { name: 'EMA 50', purpose: 'Trend direction confirmation on 1H — price above = bullish bias, below = bearish' },
    { name: 'Volume', purpose: 'Confirm displacement candles — high volume on the break validates the move' },
  ],
  checklist: [
    { id: 'alex-1', item: 'HTF (4H) trend is clearly defined — no choppy structure', category: 'structure', weight: 15, auto: true, evalKey: 'trend_exists' },
    { id: 'alex-2', item: 'BOS confirmed on 4H in the trade direction', category: 'structure', weight: 15, auto: true, evalKey: 'bos_detected' },
    { id: 'alex-3', item: '1H BOS aligned with 4H bias (synced)', category: 'structure', weight: 10, auto: true, evalKey: 'bos_synced' },
    { id: 'alex-4', item: 'Price is inside a valid order block or FVG zone', category: 'entry', weight: 15, auto: true, evalKey: 'price_in_aoi' },
    { id: 'alex-5', item: 'Fair Value Gap (FVG) identified in the zone', category: 'entry', weight: 10, auto: true, evalKey: 'fvg_detected' },
    { id: 'alex-6', item: 'Entry candle is an engulfing / displacement', category: 'entry', weight: 10, auto: true, evalKey: 'engulfing' },
    { id: 'alex-7', item: 'Currently inside London or NY killzone', category: 'session', weight: 10, auto: true, evalKey: 'session_killzone' },
    { id: 'alex-8', item: '2+ clean AOI / order blocks visible above/below', category: 'confluence', weight: 5, auto: true, evalKey: 'aoi_count_2' },
    { id: 'alex-9', item: 'No major news event in the next 30 minutes', category: 'risk', weight: 5, auto: false, evalKey: null },
    { id: 'alex-10', item: 'SL placed below/above order block — not inside it', category: 'risk', weight: 5, auto: false, evalKey: null },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'Only trade during London and NY killzones. No random time entries.',
    'Structure first, then zone, then entry. Never skip steps.',
    'If the 4H invalidates, close everything — no holding through CHoCH.',
    'One loss trade per session maximum. If stopped out, the session is done.',
    'Patience is the edge. Missing a trade is not a loss. Chasing is.',
  ],
  common_mistakes: [
    'Entering before the zone is tapped — price must come to you',
    'Taking trades outside of killzone sessions (pre-London setups are almost always traps)',
    'Moving SL to breakeven too early — gets stopped out on wick before TP1 then reverses',
    'Treating every pullback as an order block — OBs must have been the cause of a structural move',
    'Ignoring HTF bias because the LTF "looks good" — 4H overrules everything',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'XAUUSD', 'US30', 'NAS100'],
  session_preference: 'London (07:00–10:00 GMT), New York (13:00–16:00 GMT)',
  is_verified: true,
  is_ai_draft: false,
  published_at: new Date('2024-09-15T00:00:00Z'),
}

const toriPlaybook = {
  strategy_name: 'Clean Price Action — Structure & Confluence',
  summary:
    'Trade pure price action from clean structure levels. No exotic indicators — just candlestick patterns at the right location. Buy at demand zones below EMA 50 with a bullish pin bar or engulfing, sell at supply above EMA 50. Every trade must have at least 3 confluences. Setups without confluence get ignored regardless of how good they look.',
  timeframes: ['1H', '4H', 'Daily'],
  core_concepts: [
    'Support & resistance from swing highs/lows — the market remembers key levels',
    'EMA 50 as dynamic S/R — institutional reference level on 1H and 4H',
    'Pin bars and engulfing candles at key levels — the only entry triggers',
    'Confluence rule: minimum 3 factors before any entry',
    'Structure-based TP — target the next major swing high/low',
    'Session timing — London open and NY open produce the cleanest moves',
  ],
  entry_rules: [
    { rule: 'Identify key level', detail: 'Daily or 4H support/resistance level with at least 2 prior touches — single-touch levels are weak' },
    { rule: 'Price action signal at level', detail: 'Wait for a pin bar or bullish/bearish engulfing candle to CLOSE at the level — no pre-empting' },
    { rule: 'EMA 50 confluence', detail: 'Level should coincide with EMA 50 or price should be trading back through EMA 50 at time of entry' },
    { rule: 'Psychological level bonus', detail: 'Add 1 extra confluence point if the level is at a round number (e.g., 1.0900, 1.1000)' },
    { rule: 'Minimum 3 confluences required', detail: 'Count: (1) level quality, (2) candlestick pattern quality, (3) EMA alignment, (4) session timing, (5) trend direction. 3 minimum.' },
  ],
  exit_rules: [
    { rule: 'TP at next structural level', detail: 'Target the nearest swing high (buys) or swing low (sells) visible on the 4H chart' },
    { rule: 'Partial close at 1:1', detail: 'Take 50% off at 1:1 R:R and move SL to breakeven on the remaining position' },
    { rule: 'Trailing SL on remainder', detail: 'Trail SL under each successive higher low (buys) after TP1 hit — let winners run' },
    { rule: 'Time-based exit', detail: 'If trade has not moved 0.5R within 24 hours, reassess. Dead trades tie up capital.' },
  ],
  risk_management: {
    risk_per_trade: '0.5–1%',
    rr_ratio: '1:2 minimum, target 1:3',
    max_daily_loss: '2%',
    max_open_trades: 3,
    position_sizing: 'Risk 0.5% on A+ setups, 1% on B+ setups — never exceed 1% per trade.',
    notes: 'Three confluence minimum is non-negotiable. B+ setups need 3 confluences. A+ needs 4+.',
  },
  indicators: [
    { name: 'EMA 50', purpose: 'Dynamic support/resistance on 1H and 4H — key confluence factor' },
    { name: 'Volume', purpose: 'Confirm candlestick signals — a pin bar with high volume is far stronger' },
  ],
  checklist: [
    { id: 'tori-1', item: 'Overall market trend is defined (not ranging/choppy)', category: 'structure', weight: 15, auto: true, evalKey: 'trend_exists' },
    { id: 'tori-2', item: 'Break of structure confirms trend direction on 4H', category: 'structure', weight: 10, auto: true, evalKey: 'bos_detected' },
    { id: 'tori-3', item: 'Price is at a defined S/R level (2+ prior touches)', category: 'entry', weight: 15, auto: false, evalKey: null },
    { id: 'tori-4', item: 'EMA 50 aligns with the level (within 10 pips)', category: 'confluence', weight: 10, auto: true, evalKey: 'ema50_near' },
    { id: 'tori-5', item: 'Psychological round number within 15 pips of entry', category: 'confluence', weight: 10, auto: true, evalKey: 'psych_level' },
    { id: 'tori-6', item: 'Pin bar or engulfing candle confirmed on close', category: 'entry', weight: 15, auto: true, evalKey: 'engulfing' },
    { id: 'tori-7', item: 'Active trading session (London or NY)', category: 'session', weight: 10, auto: true, evalKey: 'session_active' },
    { id: 'tori-8', item: 'Minimum 3 confluences checked off above', category: 'risk', weight: 10, auto: false, evalKey: null },
    { id: 'tori-9', item: 'Clear path to TP — no S/R obstacles blocking the move', category: 'risk', weight: 5, auto: false, evalKey: null },
    { id: 'tori-10', item: 'RR ratio is at minimum 1:2', category: 'risk', weight: 10, auto: false, evalKey: null },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'Three confluences or no trade. This is not a suggestion.',
    'Only enter on a CLOSED candle — wicks are not signals.',
    'After TP1, SL moves to breakeven. You will not give back profits.',
    'If the market is ranging, step away. Clean trends only.',
    'Your plan says 1% risk. Your feelings say 2%. Follow the plan.',
  ],
  common_mistakes: [
    'Counting weak confluences — a slightly sloping EMA is not confluence',
    'Entering on a wick instead of waiting for the candle to close',
    'Taking trades in ranging/consolidating markets (EMA 50 is flat = no trade)',
    'Skipping the 24-hour time exit and letting dead trades block capital',
    'Adjusting TP after entry because price stalled — original TP was set for a reason',
  ],
  preferred_pairs: ['EURUSD', 'GBPJPY', 'USDJPY', 'AUDUSD', 'XAUUSD'],
  session_preference: 'London Open (07:00–09:00 GMT), NY Open (13:00–15:00 GMT)',
  is_verified: true,
  is_ai_draft: false,
  published_at: new Date('2024-10-01T00:00:00Z'),
}

const ictPlaybook = {
  strategy_name: 'Inner Circle Trader (ICT) Methodology',
  summary:
    'Trade with the institutional algorithm using time and price theory. The algorithm runs on a cycle: accumulate, manipulate (stop hunt), then distribute. Identify where the manipulation sweep (stop hunt) occurs at a FVG or OB during a specific Killzone, then enter after the Displacement candle closes. The model: IPDA, AMD (Accumulation, Manipulation, Distribution).',
  timeframes: ['5min', '15min', '1H', '4H'],
  core_concepts: [
    'AMD Cycle — Accumulation (12:00–01:00 EST), Manipulation (01:00–06:00 EST), Distribution (07:00+)',
    'Interbank Price Delivery Algorithm (IPDA) — price seeks liquidity pools above equal highs / below equal lows',
    'Fair Value Gaps (FVG/IFVG) — price imbalances the algorithm is programmed to return to',
    'Order Blocks (OB) — last opposing candle before a significant displacement move',
    'Killzones — London (02:00–05:00 EST), NY AM (08:30–11:00 EST), London Close (10:00–12:00 EST)',
    'Liquidity voids — gaps in price where no trading occurred; price fills these magnetically',
    'Optimal Trade Entry (OTE) — 0.62–0.79 retracement of the most recent swing (Fibonacci)',
  ],
  entry_rules: [
    { rule: 'HTF bias is clear', detail: '4H must show directional bias — identify the draw on liquidity (where will price go next in the 20-bar IPDA range)' },
    { rule: 'Killzone active', detail: 'Only enter during a defined Killzone. The algorithm is active during these windows — outside = low probability' },
    { rule: 'Manipulation sweep confirmed', detail: 'Price must have swept the stop hunt level (equal highs/lows or prior day high/low) before the entry' },
    { rule: 'FVG or OB entry', detail: 'Enter inside the nearest FVG or Order Block that aligns with HTF bias after the sweep' },
    { rule: 'OTE confirmation', detail: 'The entry zone should be at the 0.62–0.79 retracement of the displacement move (OTE zone)' },
    { rule: 'Displacement candle close', detail: 'Wait for a strong displacement candle to close fully away from the entry zone before confirming' },
  ],
  exit_rules: [
    { rule: 'Target liquidity pool', detail: 'TP at the nearest liquidity pool: equal highs (buys), equal lows (sells), or old daily high/low' },
    { rule: 'Scale out at 50% at prior session high/low', detail: 'Partial exit at the prior sessions high (buys) or low (sells). Move SL to BE.' },
    { rule: 'Full exit before Killzone ends', detail: 'If trade is running during the last 30 min of the Killzone and TP not hit, close it — choppy prices follow' },
    { rule: 'Hard SL below OB or FVG', detail: 'Stop is placed 2 pips below the low of the FVG or OB entry (buys). If the FVG is violated on a close, exit.' },
  ],
  risk_management: {
    risk_per_trade: '0.5–1%',
    rr_ratio: '1:2 minimum (most ICT setups offer 1:4–1:6)',
    max_daily_loss: '3%',
    max_open_trades: 1,
    position_sizing: 'Never more than 1% per trade. ICT focuses on fewer, higher-quality setups — not volume.',
    notes: 'One trade per session. The model is about quality, not quantity. Sit on hands 95% of the time.',
  },
  indicators: [
    { name: 'No indicators', purpose: 'ICT is pure price action + time. Indicators lag. Only EMA 50 on 4H for institutional reference.' },
    { name: 'EMA 50 (4H only)', purpose: 'Institutional reference — not a signal generator. Just context.' },
  ],
  checklist: [
    { id: 'ict-1', item: 'HTF (4H) bias is clear — identified draw on liquidity', category: 'structure', weight: 15, auto: true, evalKey: 'trend_exists' },
    { id: 'ict-2', item: 'BOS on 4H confirms direction of trade bias', category: 'structure', weight: 10, auto: true, evalKey: 'bos_detected' },
    { id: 'ict-3', item: '1H BOS synced with 4H — no conflicting signals', category: 'structure', weight: 10, auto: true, evalKey: 'bos_synced' },
    { id: 'ict-4', item: 'Price is inside a valid Killzone window', category: 'session', weight: 15, auto: true, evalKey: 'session_killzone' },
    { id: 'ict-5', item: 'Manipulation sweep of liquidity pool confirmed', category: 'entry', weight: 10, auto: false, evalKey: null },
    { id: 'ict-6', item: 'Fair Value Gap (FVG) identified in entry zone', category: 'entry', weight: 10, auto: true, evalKey: 'fvg_detected' },
    { id: 'ict-7', item: 'Price entered the FVG or OB zone', category: 'entry', weight: 10, auto: true, evalKey: 'price_in_aoi' },
    { id: 'ict-8', item: '2+ AOI / liquidity pools visible on 1H', category: 'confluence', weight: 5, auto: true, evalKey: 'aoi_count_2' },
    { id: 'ict-9', item: 'OTE zone (0.62–0.79) aligns with FVG/OB entry', category: 'entry', weight: 10, auto: false, evalKey: null },
    { id: 'ict-10', item: 'Displacement candle closed confirming entry', category: 'entry', weight: 5, auto: true, evalKey: 'engulfing' },
    { id: 'ict-11', item: 'No conflicting HTF structure at the entry level', category: 'risk', weight: 5, auto: false, evalKey: null },
    { id: 'ict-12', item: 'Clear TP target (liquidity pool) with no imbalances blocking path', category: 'risk', weight: 5, auto: false, evalKey: null },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'Time is the most important variable. Outside a Killzone, there is no setup.',
    'Price seeks liquidity. Always ask: where are the stops? That is where price is going first.',
    'Wait for the sweep, then the reversal. Never enter on the sweep itself.',
    'One trade per session. The rest is observation, not participation.',
    'The model requires patience measured in weeks, not minutes. Most days are not trading days.',
  ],
  common_mistakes: [
    'Entering inside a Killzone but before the manipulation sweep — the stop hunt has not happened yet',
    'Confusing any gap for an FVG — an FVG requires three candles with no price overlap between candle 1 and 3',
    'Trading during the Asian session (00:00–07:00 GMT) — the model is inactive, price is setting liquidity traps',
    'Taking 3+ trades in a day — ICT setups are rare by design; overtrading destroys the R:R',
    'Entering outside the OTE zone because "it looks good" — the 0.62–0.79 zone is not a preference, it is the model',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'XAUUSD', 'NAS100', 'US30', 'USDJPY'],
  session_preference: 'London Killzone (02:00–05:00 EST), NY AM Killzone (08:30–11:00 EST)',
  is_verified: true,
  is_ai_draft: false,
  published_at: new Date('2024-08-20T00:00:00Z'),
}

// ─── Draft mentor playbook data ───────────────────────────────────────────────

const mackPlaybook = {
  strategy_name: 'Trendline Breakout & Retest System',
  summary:
    'AI-extracted draft. Identify valid trendlines (3+ touches, clean slope) on the 1H–4H charts, wait for a confirmed break with momentum, then enter on the retest of the trendline as new support/resistance. Works across all major pairs and indices.',
  timeframes: ['1H', '4H'],
  core_concepts: [
    'Trendlines require minimum 3 touch points to be considered valid',
    'Breakout must be accompanied by strong momentum and volume expansion',
    'Retest entry — wait for price to pull back and test the broken trendline from the other side',
    'Trendline angle: 30–60 degrees is optimal. Too flat = weak, too steep = unsustainable',
    'Higher timeframe trendlines carry more weight than lower timeframe',
  ],
  entry_rules: [
    { rule: 'Valid trendline', detail: '3+ clean touches, no wicks through the line (minor accepted), slope between 30–60 degrees' },
    { rule: 'Confirmed breakout', detail: 'Candle must CLOSE above/below trendline — not just wick through it' },
    { rule: 'Retest confirmation', detail: 'Enter when price pulls back to the broken trendline and shows a rejection candle' },
    { rule: 'Volume confirmation', detail: 'Breakout candle should have above-average volume (AI draft — verify threshold)' },
  ],
  exit_rules: [
    { rule: 'TP at prior swing', detail: 'Target the previous swing high (breakout up) or swing low (breakout down)' },
    { rule: 'SL below retest candle', detail: 'Stop loss below the retest rejection candle low (buys) or above its high (sells)' },
    { rule: 'Invalidation on trendline failure', detail: 'If price closes back through the broken trendline, exit — retest failed' },
  ],
  risk_management: {
    risk_per_trade: '1%',
    rr_ratio: '1:2 minimum',
    max_daily_loss: '2%',
    max_open_trades: 2,
    position_sizing: 'AI draft — to be confirmed by Mack',
    notes: 'AI-extracted draft. Pending mentor review.',
  },
  indicators: [
    { name: 'Volume', purpose: 'Confirm breakout momentum (AI draft)' },
  ],
  checklist: [
    { id: 'mack-1', item: 'Trend clearly defined on 4H', category: 'structure', weight: 15, auto: true, evalKey: 'trend_exists' },
    { id: 'mack-2', item: 'Trendline has 3+ confirmed touch points', category: 'structure', weight: 20, auto: true, evalKey: 'tl_3touch' },
    { id: 'mack-3', item: 'Trendline slope is valid (30–60 degrees)', category: 'structure', weight: 10, auto: true, evalKey: 'tl_valid_slope' },
    { id: 'mack-4', item: 'Trendline spans at least 1 week of price action', category: 'structure', weight: 10, auto: true, evalKey: 'tl_span_week' },
    { id: 'mack-5', item: 'Breakout candle closed convincingly through trendline', category: 'entry', weight: 15, auto: false, evalKey: null },
    { id: 'mack-6', item: 'Retest of trendline in progress / complete', category: 'entry', weight: 15, auto: false, evalKey: null },
    { id: 'mack-7', item: 'Market session is active (not Asian low-volume)', category: 'session', weight: 10, auto: true, evalKey: 'session_active' },
    { id: 'mack-8', item: 'RR is at least 1:2', category: 'risk', weight: 5, auto: false, evalKey: null },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'Three touches minimum — two points make a line, three make a trendline.',
    'Wait for the retest. Chasing the breakout is amateur hour.',
    'Steep trendlines break fast and fake out often. Stick to 30–60 degrees.',
  ],
  common_mistakes: [
    'Entering on the breakout before the retest — most breakouts fake out',
    'Drawing trendlines through candle bodies instead of wicks',
    'Taking trendline setups during low-volume Asian session',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'],
  session_preference: 'London and New York sessions',
  is_verified: false,
  is_ai_draft: true,
}

const patPlaybook = {
  strategy_name: 'Supply & Demand Zone Trading',
  summary:
    'AI-extracted draft. Identify fresh supply and demand zones (zones that have not been revisited since their formation), then trade the reaction as price returns to these zones for the first time. The "freshness" of a zone is critical — a zone that has been tested multiple times weakens with each visit.',
  timeframes: ['1H', '4H', 'Daily'],
  core_concepts: [
    'Supply zones form at points of origin of strong bearish moves (institutional selling)',
    'Demand zones form at points of origin of strong bullish moves (institutional buying)',
    'Fresh zones — untested since formation — have the highest probability',
    'Base candles — small indecision candles at the zone origin indicate consolidation before distribution',
    'Zone invalidation — if price closes through a zone, the zone is spent',
  ],
  entry_rules: [
    { rule: 'Identify fresh zone', detail: 'Zone must not have been revisited since it was formed — first return test only' },
    { rule: 'HTF trend alignment', detail: 'Demand zones in uptrends, supply zones in downtrends for highest probability' },
    { rule: 'Entry on zone tap', detail: 'Enter when price touches the proximal edge of the zone (the near side)' },
    { rule: 'Base candle confirmation', detail: 'Verify there is a clear base (consolidation) at the zone origin — no base = weaker zone' },
  ],
  exit_rules: [
    { rule: 'TP at prior zone', detail: 'Target the nearest opposing supply/demand zone as take profit' },
    { rule: 'SL beyond distal edge', detail: 'Stop loss 5 pips beyond the distal edge (far side) of the zone' },
    { rule: 'Zone close invalidation', detail: 'Exit if price closes through the zone — it is no longer valid' },
  ],
  risk_management: {
    risk_per_trade: '1%',
    rr_ratio: '1:2 minimum',
    max_daily_loss: '2%',
    max_open_trades: 2,
    position_sizing: 'AI draft — to be confirmed by Pat',
    notes: 'AI-extracted draft. Pending mentor review.',
  },
  indicators: [],
  checklist: [
    { id: 'pat-1', item: 'HTF trend is defined — demand in uptrend, supply in downtrend', category: 'structure', weight: 15, auto: true, evalKey: 'trend_exists' },
    { id: 'pat-2', item: 'BOS confirms trend direction on 4H', category: 'structure', weight: 15, auto: true, evalKey: 'bos_detected' },
    { id: 'pat-3', item: 'Zone is fresh (untested since formation)', category: 'entry', weight: 20, auto: false, evalKey: null },
    { id: 'pat-4', item: 'Price is inside the zone (proximal edge tapped)', category: 'entry', weight: 15, auto: true, evalKey: 'price_in_aoi' },
    { id: 'pat-5', item: 'Clear base candle(s) visible at zone origin', category: 'entry', weight: 10, auto: false, evalKey: null },
    { id: 'pat-6', item: 'Session is active (London or NY)', category: 'session', weight: 10, auto: true, evalKey: 'session_active' },
    { id: 'pat-7', item: 'Clear TP target at opposing zone', category: 'risk', weight: 10, auto: false, evalKey: null },
    { id: 'pat-8', item: 'RR ratio is at least 1:2', category: 'risk', weight: 5, auto: false, evalKey: null },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'Fresh zones only. A zone visited twice is a zone to avoid.',
    'The best supply/demand trades look obvious in hindsight — trust the zone.',
    'Never enter at the distal edge — that is the invalidation level, not the entry.',
  ],
  common_mistakes: [
    'Trading stale zones that have been tested multiple times',
    'Entering at the distal edge instead of the proximal edge (wrong side of the zone)',
    'Ignoring HTF context — demand zones in downtrends are low probability',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'EURJPY'],
  session_preference: 'London and New York sessions',
  is_verified: false,
  is_ai_draft: true,
}

const carlosPlaybook = {
  strategy_name: 'Fibonacci Confluence Trading',
  summary:
    'AI-extracted draft. Use Fibonacci retracement levels (38.2%, 50%, 61.8%) as entry zones combined with price action signals, key horizontal levels, and EMA confluence. The 61.8% "golden ratio" retracement is the primary entry level. Multiple Fibonacci alignments (confluence) from different swing measurements strengthen the trade.',
  timeframes: ['15min', '1H', '4H'],
  core_concepts: [
    'The 61.8% Fibonacci retracement is the most reliable entry level — the golden ratio',
    'Fibonacci confluence — measuring from multiple swing points to find overlapping levels',
    'Fib extensions (1.272, 1.618) for TP targets in trending markets',
    'Combining Fib with horizontal S/R and EMA creates high-probability zones',
    'Draw Fibonacci from swing low to swing high (buys) or swing high to swing low (sells)',
  ],
  entry_rules: [
    { rule: 'Identify the swing', detail: 'Clear, clean swing high to swing low (or vice versa) on 1H or 4H — no complex overlapping price action' },
    { rule: 'Draw Fib retracement', detail: 'Measure from the swing start to the swing end. Entry zone: 50%–61.8% retracement' },
    { rule: 'Confluence check', detail: 'Count confluences at the 61.8%: horizontal level, EMA 50, second Fib measurement. Need 2+ to enter' },
    { rule: 'Entry trigger', detail: 'Pin bar or engulfing candle closing AT the 61.8% level (or within the 50–61.8% zone)' },
  ],
  exit_rules: [
    { rule: 'TP1 at prior swing extreme', detail: 'First target at the 100% extension (the start of the measured swing)' },
    { rule: 'TP2 at 1.618 extension', detail: 'Run 50% of position to the 1.618 Fibonacci extension for the extended move' },
    { rule: 'SL below 78.6%', detail: 'Stop loss at the 78.6% level — if this breaks, the swing is invalid' },
  ],
  risk_management: {
    risk_per_trade: '1%',
    rr_ratio: '1:2 minimum',
    max_daily_loss: '3%',
    max_open_trades: 2,
    position_sizing: 'AI draft — to be confirmed by Carlos',
    notes: 'AI-extracted draft. Pending mentor review.',
  },
  indicators: [
    { name: 'EMA 50', purpose: 'Fibonacci confluence — when EMA 50 aligns with 61.8%, setup quality increases' },
    { name: 'Fibonacci Retracement', purpose: 'Primary entry tool — 38.2%, 50%, 61.8% levels' },
    { name: 'Fibonacci Extension', purpose: 'TP targets — 1.272 and 1.618 extension levels' },
  ],
  checklist: [
    { id: 'carlos-1', item: 'Overall trend is clear on 4H (not ranging)', category: 'structure', weight: 15, auto: true, evalKey: 'trend_exists' },
    { id: 'carlos-2', item: 'BOS confirms trend direction', category: 'structure', weight: 10, auto: true, evalKey: 'bos_detected' },
    { id: 'carlos-3', item: 'Clear swing drawn — no overlapping price in between', category: 'entry', weight: 15, auto: false, evalKey: null },
    { id: 'carlos-4', item: 'Price is retracing to the 50%–61.8% Fib zone', category: 'entry', weight: 15, auto: true, evalKey: 'price_in_aoi' },
    { id: 'carlos-5', item: 'EMA 50 aligns with the 61.8% Fib level', category: 'confluence', weight: 10, auto: true, evalKey: 'ema50_near' },
    { id: 'carlos-6', item: 'Psychological level within the Fib zone', category: 'confluence', weight: 10, auto: true, evalKey: 'psych_level' },
    { id: 'carlos-7', item: 'Entry candle signal (pin bar or engulfing) at zone', category: 'entry', weight: 10, auto: true, evalKey: 'engulfing' },
    { id: 'carlos-8', item: 'Active trading session', category: 'session', weight: 10, auto: true, evalKey: 'session_active' },
    { id: 'carlos-9', item: 'Minimum 2 confluences at the 61.8% level', category: 'risk', weight: 5, auto: false, evalKey: null },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'The 61.8% is the entry. Not 65%, not 58%. The golden ratio.',
    'No signal at the 61.8% = no trade. Never enter on price alone without a candle signal.',
    'Confluence multiplies probability. One Fib level is interesting. Three aligned is a trade.',
  ],
  common_mistakes: [
    'Drawing Fibonacci from unclear swing points — the swing must be obvious, not forced',
    'Entering at 38.2% instead of waiting for 61.8% — premature entry',
    'Ignoring the EMA confluence — Fib alone is not enough',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'EURJPY', 'AUDUSD'],
  session_preference: 'London and New York sessions',
  is_verified: false,
  is_ai_draft: true,
}

// ─── Additional draft mentor playbook data ───────────────────────────────────

const chrisForexPlaybook = {
  strategy_name: 'Multi-Timeframe Swing Trading',
  summary:
    'AI-extracted draft. Trade the higher-timeframe bias by using the Weekly and Daily charts to identify trend direction, the 4H to confirm structure, and the 1H for precision entries. Swing trades held days to weeks target major support/resistance levels and structural pivots. Every entry needs alignment across all three timeframes.',
  timeframes: ['1H', '4H', 'Daily', 'Weekly'],
  core_concepts: [
    'Top-down analysis — Weekly sets the bias, Daily confirms, 4H refines, 1H triggers',
    'Structural pivots — major swing highs/lows define the playing field',
    'Support and resistance flips — former resistance becomes support after a clean break',
    'Pattern confluence — H&S, double top/bottom, wedges at key levels increase probability',
    'Momentum confirmation — RSI divergence at turning points flags exhaustion before reversal',
    'Holding through pullbacks — swing trading requires tolerance for retracement within structure',
  ],
  entry_rules: [
    { rule: 'Weekly trend alignment', detail: 'Weekly must show a clear directional trend (no ranging HTF). Price below falling weekly structure = only shorts. Above rising structure = only longs.' },
    { rule: 'Daily confirmation', detail: 'Daily chart must echo the weekly bias with at least 2 consecutive closes in the intended direction' },
    { rule: '4H structure entry zone', detail: 'Mark the 4H support (buys) or resistance (sells) level that aligns with HTF bias. Wait for a 4H close back into this zone on a retracement.' },
    { rule: '1H entry trigger', detail: 'Switch to 1H. Enter on a 1H break and close above/below the most recent 1H swing high/low — confirming the bounce off the 4H zone.' },
    { rule: 'Pattern confirmation (optional)', detail: 'If a reversal pattern (double bottom, inverse H&S, bullish engulfing pattern) forms at the 4H level, probability increases. Patterns are not required but elevate grade.' },
    { rule: 'RSI divergence filter', detail: 'If RSI on the 1H shows bullish divergence (price making lower lows, RSI making higher lows) at the entry zone — add 15% to conviction.' },
  ],
  exit_rules: [
    { rule: 'TP1 at prior structural swing', detail: 'First target at the most recent significant swing high (longs) or swing low (shorts) on the 4H chart. Close 50% here.' },
    { rule: 'TP2 at weekly resistance/support', detail: 'Run remaining 50% to the next weekly level. This is the swing target. Move SL to breakeven after TP1.' },
    { rule: 'Trailing stop after TP1', detail: 'After closing TP1, trail the remaining position behind 4H swing lows (longs) or highs (shorts).' },
    { rule: 'Structure break invalidation', detail: 'Exit immediately if a 4H candle closes through the entry zone level — the structure has failed.' },
  ],
  risk_management: {
    risk_per_trade: '1–2%',
    rr_ratio: '1:3 minimum',
    max_daily_loss: '4%',
    max_open_trades: 3,
    position_sizing: 'AI draft — to be confirmed. Risk 1% on first entry, 0.5% scale-in at second level.',
    notes: 'AI-extracted draft. Swing trades — do not check price every 5 minutes. Check at the daily close.',
  },
  indicators: [
    { name: 'RSI (14)', purpose: 'Divergence confirmation at swing turning points — not overbought/oversold levels' },
    { name: 'EMA 50 & EMA 200', purpose: 'Trend filter on Daily — only trade longs above both, shorts below both' },
  ],
  checklist: [
    { id: 'chris-1', item: 'Weekly trend is clearly directional (not ranging)', category: 'structure', weight: 20, auto: true,  evalKey: 'trend_exists' },
    { id: 'chris-2', item: 'Daily confirms weekly bias (2+ consecutive closes in direction)', category: 'structure', weight: 15, auto: true,  evalKey: 'bos_detected' },
    { id: 'chris-3', item: '4H price is at a valid support/resistance zone', category: 'entry',     weight: 15, auto: true,  evalKey: 'price_in_aoi' },
    { id: 'chris-4', item: '1H break of structure triggered in intended direction', category: 'entry',     weight: 15, auto: true,  evalKey: 'bos_synced' },
    { id: 'chris-5', item: 'RSI divergence present at the 4H zone (optional, elevates grade)', category: 'confluence', weight: 10, auto: false, evalKey: null },
    { id: 'chris-6', item: 'Reversal pattern (double bottom/top, H&S) visible at zone', category: 'confluence', weight: 10, auto: false, evalKey: null },
    { id: 'chris-7', item: 'No major news (NFP, CPI, FOMC) within 4 hours', category: 'risk',      weight: 10, auto: false, evalKey: null },
    { id: 'chris-8', item: 'SL placed at the structural invalidation level', category: 'risk',      weight: 5,  auto: false, evalKey: null },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'If the weekly chart does not agree, there is no trade. Not on the daily, not on the 4H.',
    'Swing trading requires patience. Check the daily close, not the 15-minute candle.',
    'Move SL to breakeven at TP1. You should never turn a winner into a loser.',
    'Three timeframes must align. One disagreement = wait.',
  ],
  common_mistakes: [
    'Trading counter-trend setups against the weekly bias — working against institutions',
    'Exiting early on minor pullbacks — swing trades need room to breathe',
    'Not moving SL to breakeven after TP1 — giving back winners unnecessarily',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'GBPJPY', 'XAUUSD', 'AUDUSD', 'USDJPY'],
  session_preference: 'Daily close and London open analysis',
  is_verified: false,
  is_ai_draft: true,
}

const tradingGeekPlaybook = {
  strategy_name: 'London Session Open Scalping',
  summary:
    'AI-extracted draft. Capitalise on the explosive volatility in the first 90 minutes of the London session (08:00–09:30 GMT). Markets gap from the Asian consolidation phase and make decisive directional moves. Use the Asian session range as the anchor — trade breakouts of the Asian high/low with momentum confirmation and tight risk management.',
  timeframes: ['1min', '5min', '15min'],
  core_concepts: [
    'Asian session range (00:00–07:00 GMT) defines the consolidation zone for the day',
    'London open breakout — price breaks the Asian range high (long) or low (short)',
    'Momentum bars — the first breakout candle must be decisive, not a wick poke',
    'Volume spike confirmation — real breakouts have significantly higher volume than the Asian session',
    'False breakout filter — wait for a candle CLOSE beyond the range, not just a wick',
    'Time discipline — only scalp in the first 90 minutes. After 09:30 GMT, session is over.',
  ],
  entry_rules: [
    { rule: 'Mark Asian session range', detail: 'Identify the highest high and lowest low from 00:00 to 07:00 GMT. Mark both levels on the 5min chart.' },
    { rule: 'Wait for London open at 08:00 GMT', detail: 'Do not trade before 08:00 GMT. The range must be confirmed and at least 10 pips wide to be tradeable.' },
    { rule: 'Breakout candle close', detail: 'Wait for a 5min candle to CLOSE above the Asian high (long) or below the Asian low (short) — not just a wick through.' },
    { rule: 'Volume confirmation', detail: 'The breakout candle\'s volume must be at least 1.5× the average volume of the Asian session candles.' },
    { rule: 'Retest entry (lower risk)', detail: 'After the initial break, wait for a 1–2 candle retest of the broken level. Enter on the retest for better R:R.' },
    { rule: 'No entry after 09:30 GMT', detail: 'If no breakout occurs by 09:30 GMT, do not trade. The session window has closed — accept that today is not a trading day.' },
  ],
  exit_rules: [
    { rule: 'TP = 1× the Asian range size', detail: 'If the Asian range was 20 pips, target 20 pips beyond the breakout level for TP1.' },
    { rule: 'TP2 = 2× the range', detail: 'Scale out 50% at 1× range, run remaining to 2× range with trailing stop.' },
    { rule: 'SL = inside the Asian range', detail: 'Stop loss placed 3 pips inside the Asian range (the opposite side from breakout direction).' },
    { rule: 'Hard time exit', detail: 'All positions closed by 09:30 GMT regardless of profit/loss. No exceptions — this is a session-based strategy.' },
  ],
  risk_management: {
    risk_per_trade: '0.5–1%',
    rr_ratio: '1:2 minimum',
    max_daily_loss: '2%',
    max_open_trades: 1,
    position_sizing: 'AI draft — 0.5% risk per scalp. Tight stops mean small lots on major pairs.',
    notes: 'AI-extracted draft. Scalping requires fast execution — use limit orders, not market orders.',
  },
  indicators: [
    { name: 'Volume', purpose: 'Confirm breakout validity — 1.5× Asian session average required' },
    { name: 'Asian Range Lines', purpose: 'Mark Asian high and low as horizontal levels — the primary reference for the session' },
  ],
  checklist: [
    { id: 'geek-1',  item: 'Asian session range marked (high and low clear)',         category: 'structure', weight: 15, auto: false, evalKey: null             },
    { id: 'geek-2',  item: 'Range is at least 10 pips wide',                          category: 'entry',     weight: 10, auto: false, evalKey: null             },
    { id: 'geek-3',  item: 'Currently inside London session window (08:00–09:30 GMT)',category: 'session',   weight: 20, auto: true,  evalKey: 'session_killzone' },
    { id: 'geek-4',  item: '5min candle CLOSED beyond the Asian range level',         category: 'entry',     weight: 20, auto: true,  evalKey: 'bos_detected'   },
    { id: 'geek-5',  item: 'Volume on breakout candle exceeds Asian session average', category: 'confluence',weight: 15, auto: false, evalKey: null             },
    { id: 'geek-6',  item: 'Entry on retest of broken level (not immediate breakout)',category: 'entry',     weight: 10, auto: false, evalKey: null             },
    { id: 'geek-7',  item: 'SL placed inside the Asian range (not outside)',          category: 'risk',      weight: 10, auto: false, evalKey: null             },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'The Asian range is your anchor. If price does not break it by 09:30, there is no trade.',
    'Candle CLOSE beyond the range. A wick is not a breakout.',
    'All positions closed by 09:30 GMT. A scalp that becomes a swing is a mistake.',
    'If the range is less than 10 pips, skip the day — the range is too tight to trade.',
  ],
  common_mistakes: [
    'Trading before 08:00 GMT — the London breakout has not started yet',
    'Entering on a wick through the level instead of waiting for the close',
    'Holding past the 09:30 GMT hard exit — scalps do not become swings',
  ],
  preferred_pairs: ['GBPUSD', 'EURUSD', 'GBPJPY', 'EURGBP'],
  session_preference: 'London session only (08:00–09:30 GMT)',
  is_verified: false,
  is_ai_draft: true,
}

const navinPlaybook = {
  strategy_name: 'Naked Price Action — No Indicators',
  summary:
    'AI-extracted draft. Trade purely from price — no indicators, no moving averages, no Fibonacci, no RSI. Read what the candles are telling you: who is in control (buyers or sellers), where are they defending, and where is the market likely to go next. Every answer is already in the price chart.',
  timeframes: ['4H', '1H', '15min'],
  core_concepts: [
    'Price tells the complete story — indicators are derivatives of price, never the source',
    'Candle anatomy — wicks reject levels, bodies show commitment, size shows conviction',
    'Previous day high/low (PDH/PDL) — institutional reference levels watched by smart money',
    'Round number magnets — 1.3000, 1.2500 etc. act as psychological price magnets',
    'Trend identification without indicators: higher highs/higher lows = uptrend, nothing else needed',
    'Momentum through candle sequences — 3 or more consecutive closes in one direction signals momentum',
  ],
  entry_rules: [
    { rule: 'Identify the trend naked', detail: 'Look at the 4H chart with no indicators. Is price making higher highs and higher lows? That is the only trend confirmation needed.' },
    { rule: 'Mark key levels', detail: 'Identify previous day high/low, round numbers, and recent swing highs/lows on the 1H chart. These are your potential entry zones.' },
    { rule: 'Wait for price to reach a level', detail: 'Do not chase. Wait for price to return to your pre-marked level. If it does not come back, the trade does not happen.' },
    { rule: 'Candle signal at the level', detail: 'Look for a rejection candle AT the level: pin bar (long wick, small body), inside bar breakout, or engulfing. The signal must be at the level — not 10 pips away.' },
    { rule: 'Minimum risk-reward', detail: 'Before entry, visualise where the SL goes (below/above the signal candle low/high) and where the TP is (next major level). If it is not 1:2, do not trade.' },
  ],
  exit_rules: [
    { rule: 'TP at next key naked level', detail: 'Target the most obvious level on the chart where price has previously reacted. Do not use Fibonacci extensions — use what you can see.' },
    { rule: 'SL beyond the signal candle', detail: 'Stop loss placed 3–5 pips beyond the wick of the entry candle. If the candle low is taken out, the signal is invalid.' },
    { rule: 'Exit on momentum failure', detail: 'If price reaches midway to TP and then shows 3 opposing candles with no continuation, consider partial close.' },
  ],
  risk_management: {
    risk_per_trade: '1%',
    rr_ratio: '1:2 minimum',
    max_daily_loss: '3%',
    max_open_trades: 2,
    position_sizing: 'AI draft — 1% risk. Lot size from SL distance.',
    notes: 'AI-extracted draft. Patience is the strategy. If you do not see a clean setup, the trade is not there.',
  },
  indicators: [] as Prisma.InputJsonValue,
  checklist: [
    { id: 'navin-1', item: '4H trend identified without indicators (HH/HL or LH/LL pattern)', category: 'structure', weight: 20, auto: true,  evalKey: 'trend_exists' },
    { id: 'navin-2', item: 'Entry level is a pre-marked key level (not drawn after price arrives)', category: 'entry',     weight: 15, auto: false, evalKey: null          },
    { id: 'navin-3', item: 'Price has returned to the pre-marked level (not chased)',             category: 'entry',     weight: 15, auto: true,  evalKey: 'price_in_aoi' },
    { id: 'navin-4', item: 'Rejection candle at the level (pin bar, inside bar, engulfing)',      category: 'entry',     weight: 20, auto: true,  evalKey: 'engulfing'    },
    { id: 'navin-5', item: 'Round number or PDH/PDL confluence at the entry level',               category: 'confluence',weight: 10, auto: true,  evalKey: 'psych_level'  },
    { id: 'navin-6', item: 'R:R is at least 1:2 before entry',                                   category: 'risk',      weight: 15, auto: false, evalKey: null          },
    { id: 'navin-7', item: 'No indicators on the chart — truly naked price action',               category: 'risk',      weight: 5,  auto: false, evalKey: null          },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'Remove all indicators. If you cannot read the chart naked, you do not understand price.',
    'Mark your levels BEFORE price arrives. Levels drawn after price is there are confirmation bias.',
    'Wait at the level. If price passes through without a signal, the level was wrong.',
    'Patience is the edge. Most days there is no trade. That is correct.',
  ],
  common_mistakes: [
    'Drawing levels after price arrives instead of in advance',
    'Entering without a candle signal — price at a level is not enough',
    'Using indicators "just to confirm" — if you are adding indicators, you do not trust naked price',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'AUDUSD'],
  session_preference: 'London and New York sessions',
  is_verified: false,
  is_ai_draft: true,
}

const samSeidenPlaybook = {
  strategy_name: 'Institutional Supply & Demand — Origin of Move',
  summary:
    'AI-extracted draft. Identify the exact price level where institutions placed large buy or sell orders — the Origin of Move (OOM). These are the zones where price departed rapidly (strong imbalance), leaving unfilled institutional orders. When price returns to these fresh, untested zones, institutions re-enter to fill their remaining orders, creating high-probability reversals.',
  timeframes: ['15min', '1H', '4H', 'Daily'],
  core_concepts: [
    'Origin of Move (OOM) — the exact price zone from which a strong, impulsive move originated',
    'Supply zone — a price level where sellers overwhelmed buyers; price fell sharply away',
    'Demand zone — a price level where buyers overwhelmed sellers; price rallied sharply away',
    'Fresh vs. tested zones — a zone loses probability with every test. First test = highest probability.',
    'Proximal vs. distal edge — entry at the proximal (near) edge of the zone, SL beyond the distal (far) edge',
    'Zone quality indicators: the bigger the departing candle, the more valid the zone',
  ],
  entry_rules: [
    { rule: 'Identify the Origin of Move', detail: 'Find where a strong, impulsive move began. Trace price back to the base of the move — that is the zone. On Daily chart for macro context, 1H for precision.' },
    { rule: 'Confirm the zone is fresh', detail: 'The zone must be untested — price has NOT returned to it since the move originated. Every retest degrades quality.' },
    { rule: 'Mark proximal and distal edges', detail: 'Proximal edge = the near side of the zone (where price first started moving). Distal edge = the far boundary. Enter near the proximal edge.' },
    { rule: 'Confirm the trend context', detail: 'Demand zones in downtrends are low probability. Only take demand zones in uptrends (or at major monthly demand). Align zone with trend.' },
    { rule: 'Enter at the proximal edge', detail: 'Place a limit order at the proximal edge of the zone. Do not enter at market — let price come to your level.' },
    { rule: 'Strong departure confirmation', detail: 'Look at the candle(s) that left the zone originally. Strong, impulsive departure = high institutional interest left behind.' },
  ],
  exit_rules: [
    { rule: 'TP at next opposing zone', detail: 'Target the next supply zone above (longs) or demand zone below (shorts). Do not guess — trade from zone to zone.' },
    { rule: 'SL beyond the distal edge', detail: 'Stop loss placed 2–3 pips beyond the distal edge of the zone. If this level breaks, institutional orders were absorbed — the zone is dead.' },
    { rule: 'Exit if zone is tested more than 3 times', detail: 'A zone tested 3 times is weakening. Consider reducing position size or avoiding if price has returned multiple times before your entry.' },
  ],
  risk_management: {
    risk_per_trade: '1%',
    rr_ratio: '1:3 minimum',
    max_daily_loss: '3%',
    max_open_trades: 2,
    position_sizing: 'AI draft — 1% per trade. Wide zones require smaller position sizes.',
    notes: 'AI-extracted draft. Use limit orders, not market orders. The edge is in being patient.',
  },
  indicators: [
    { name: 'Volume', purpose: 'Confirm institutional activity — high volume at zone origin validates the zone strength' },
  ],
  checklist: [
    { id: 'seiden-1', item: 'Origin of Move clearly identified (base of impulsive candle)',    category: 'structure', weight: 20, auto: true,  evalKey: 'price_in_aoi'  },
    { id: 'seiden-2', item: 'Zone is FRESH — price has not returned to it since origin',       category: 'entry',     weight: 25, auto: false, evalKey: null           },
    { id: 'seiden-3', item: 'Proximal edge identified and limit order placed there',           category: 'entry',     weight: 15, auto: false, evalKey: null           },
    { id: 'seiden-4', item: 'Zone aligns with the higher-timeframe trend direction',           category: 'structure', weight: 15, auto: true,  evalKey: 'trend_exists' },
    { id: 'seiden-5', item: 'Departing candle from zone was strong and impulsive',            category: 'confluence',weight: 10, auto: false, evalKey: null           },
    { id: 'seiden-6', item: 'SL placed beyond the distal edge of the zone',                   category: 'risk',      weight: 10, auto: false, evalKey: null           },
    { id: 'seiden-7', item: 'Zone has been tested 2 times or fewer (fresh = higher probability)', category: 'risk',  weight: 5,  auto: false, evalKey: null           },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'Fresh zones only. A zone that has been tested 3+ times is no longer an edge.',
    'Enter at the proximal edge with a limit order. Never chase price into a zone.',
    'The bigger and faster the original departure, the stronger the zone.',
    'Demand zones in downtrends and supply zones in uptrends are low-probability. Respect the trend.',
  ],
  common_mistakes: [
    'Entering at the distal edge instead of the proximal — wrong side of the zone, wider SL',
    'Trading zones that have been tested multiple times — the institutional orders are filled',
    'Using S&D in isolation without trend context — demand zones in downtrends often fail',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'EURJPY', 'GBPJPY'],
  session_preference: 'New York and London sessions',
  is_verified: false,
  is_ai_draft: true,
}

const raynerTeoPlaybook = {
  strategy_name: 'Systematic Trend Following',
  summary:
    'AI-extracted draft. Follow strong, established trends using a mechanical, rule-based approach. Use the 200 EMA to define the trend, the 50 EMA as a dynamic support/resistance, and the ATR to size positions consistently. The goal is to ride big trending moves while keeping losses small and letting winners run — removing all discretion from the process.',
  timeframes: ['Daily', '4H'],
  core_concepts: [
    '200 EMA as the trend filter — only longs above the 200 EMA, only shorts below',
    '50 EMA as dynamic support/resistance — entries on pullbacks to the 50 EMA',
    'ATR-based position sizing — risk the same dollar amount regardless of stop distance',
    'Trending markets spend 30% of time trending, 70% ranging — patience is the edge',
    'Cut losses fast, let winners run — asymmetric payoff is the foundation of trend following',
    'Breakout entries on Donchian channel for momentum continuation trades',
  ],
  entry_rules: [
    { rule: '200 EMA trend filter', detail: 'Price must be above the 200 EMA (daily) for longs. Below the 200 EMA for shorts. No exceptions — this is the first filter.' },
    { rule: '50 EMA pullback entry', detail: 'Wait for price to pull back to the 50 EMA on the daily chart. Enter as price begins to bounce off the 50 EMA in the trend direction.' },
    { rule: 'Bounce confirmation', detail: 'A daily candle must close BACK above the 50 EMA after touching it. A wick touch is not enough — the close matters.' },
    { rule: 'Donchian breakout (alternative)', detail: 'If price breaks above a 20-period Donchian channel high (longs) or below the low (shorts) with the 200 EMA filter active, enter on the break.' },
    { rule: 'ATR stop distance', detail: 'Set SL at 2× ATR(14) below the 50 EMA touch point. This ensures the stop is outside normal market noise.' },
  ],
  exit_rules: [
    { rule: 'Trailing stop at 2× ATR', detail: 'Trail the stop loss at 2× ATR(14) below the most recent swing low (longs) or above the most recent swing high (shorts). Move up as price advances — never down.' },
    { rule: 'Exit on 200 EMA close', detail: 'If a daily candle closes below the 200 EMA (longs) or above it (shorts), exit the position. The trend filter is broken.' },
    { rule: 'No fixed TP', detail: 'There is no profit target. The trail stop is the only exit. Let the trend run as far as it goes.' },
  ],
  risk_management: {
    risk_per_trade: '1%',
    rr_ratio: 'No fixed R:R — trend following; winners are as large as the trend allows',
    max_daily_loss: '3%',
    max_open_trades: 5,
    position_sizing: 'AI draft — ATR-based sizing. Risk 1% per trade. Lot size = (Account × 1%) ÷ (ATR × 2).',
    notes: 'AI-extracted draft. Systematic means no discretion. Follow the rules. Every. Single. Time.',
  },
  indicators: [
    { name: 'EMA 200', purpose: 'Trend filter — primary direction bias. Above = longs only. Below = shorts only.' },
    { name: 'EMA 50',  purpose: 'Dynamic support/resistance — pullback entry level in the trend direction' },
    { name: 'ATR (14)', purpose: 'Stop loss calculation and position sizing — remove the subjectivity from risk management' },
    { name: 'Donchian Channel (20)', purpose: 'Breakout entry signal for momentum continuation — 20-period high/low channel' },
  ],
  checklist: [
    { id: 'rayner-1', item: 'Price is on the correct side of the 200 EMA (above for longs, below for shorts)', category: 'structure',   weight: 25, auto: true,  evalKey: 'trend_exists' },
    { id: 'rayner-2', item: 'Price has pulled back to or is touching the 50 EMA',                              category: 'entry',       weight: 20, auto: true,  evalKey: 'ema50_near'   },
    { id: 'rayner-3', item: 'A daily candle has closed back on the correct side of the 50 EMA',               category: 'entry',       weight: 20, auto: true,  evalKey: 'bos_detected' },
    { id: 'rayner-4', item: 'SL is set at 2× ATR below the 50 EMA',                                          category: 'risk',        weight: 15, auto: false, evalKey: null           },
    { id: 'rayner-5', item: 'Position size calculated using ATR-based formula (1% risk)',                     category: 'risk',        weight: 15, auto: false, evalKey: null           },
    { id: 'rayner-6', item: 'No earnings, central bank meeting, or major data within 24 hours',               category: 'risk',        weight: 5,  auto: false, evalKey: null           },
  ] as Prisma.InputJsonValue,
  golden_rules: [
    'The 200 EMA is law. If price is below it, there are no longs. Not even "close enough."',
    'There is no profit target. The trailing stop is the exit. Let winners run.',
    'If you are adding discretion, you are no longer trend following. Follow the system.',
    'Most trend-following trades lose. A few big winners make up for all the small losses. This is the deal.',
  ],
  common_mistakes: [
    'Adding a profit target — cutting winners short defeats the entire thesis of trend following',
    'Ignoring the 200 EMA filter and taking counter-trend trades because they "look good"',
    'Using a fixed stop instead of ATR — positions sized inconsistently lead to inconsistent results',
  ],
  preferred_pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'XAUUSD', 'USDCAD', 'NZDUSD'],
  session_preference: 'Daily chart — check at the daily close once per day',
  is_verified: false,
  is_ai_draft: true,
}

// ─── Main seed function ───────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...')

  // ── 1. System admin profile (needed for MentorRequest.requested_by FK) ──────
  await prisma.profile.upsert({
    where: { id: SYSTEM_PROFILE_ID },
    update: {},
    create: {
      id: SYSTEM_PROFILE_ID,
      role: 'admin',
      display_name: 'Playbuuk Admin',
      tier: 'pro',
    },
  })
  console.log('✓ System profile created')

  // ── 2. Verified mentors ───────────────────────────────────────────────────
  const alexG = await prisma.mentor.upsert({
    where: { handle: 'alexg_fx' },
    update: {},
    create: {
      display_name: 'Alex G',
      handle: 'alexg_fx',
      bio: 'ICT/SMC trader. Former institutional desk analyst turned full-time retail trader. I teach Smart Money Concepts the way institutions actually use them — not the watered-down YouTube version.',
      avatar_emoji: '🎯',
      markets: ['Forex', 'Indices', 'Gold'],
      style: 'ICT / Smart Money Concepts',
      signature: 'Structure first. Zone second. Entry last. In that exact order.',
      follower_count: 2847,
      external_followers: '47K YouTube',
      rating: 4.9,
      review_count: 312,
      verified: true,
      verified_at: new Date('2024-09-15T00:00:00Z'),
      onboarding_status: 'verified',
      added_by: SYSTEM_PROFILE_ID,
      contact_info: '@alexg_fx on Twitter',
    },
  })

  await prisma.playbook.upsert({
    where: {
      id: (
        await prisma.playbook.findFirst({ where: { mentor_id: alexG.id, strategy_name: alexGPlaybook.strategy_name } })
      )?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: {
      mentor_id: alexG.id,
      ...alexGPlaybook,
    },
  })

  const tori = await prisma.mentor.upsert({
    where: { handle: 'toritrades' },
    update: {},
    create: {
      display_name: 'Tori Trades',
      handle: 'toritrades',
      bio: 'Price action only. No indicators, no noise. 5 years of trading forex full time. I believe in confluence — if you need more than 3 reasons to take a trade, it is not a trade.',
      avatar_emoji: '💎',
      markets: ['Forex', 'Gold'],
      style: 'Price Action',
      signature: 'Three confluences or no trade. Simple. Repeatable. Profitable.',
      follower_count: 1923,
      external_followers: '28K Instagram',
      rating: 4.8,
      review_count: 204,
      verified: true,
      verified_at: new Date('2024-10-01T00:00:00Z'),
      onboarding_status: 'verified',
      added_by: SYSTEM_PROFILE_ID,
      contact_info: '@toritrades on Instagram',
    },
  })

  await prisma.playbook.upsert({
    where: {
      id: (
        await prisma.playbook.findFirst({ where: { mentor_id: tori.id, strategy_name: toriPlaybook.strategy_name } })
      )?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: {
      mentor_id: tori.id,
      ...toriPlaybook,
    },
  })

  const ict = await prisma.mentor.upsert({
    where: { handle: 'ict_concepts' },
    update: {},
    create: {
      display_name: 'ICT Inner Circle',
      handle: 'ict_concepts',
      bio: 'The Inner Circle Trader methodology. Time and price theory. The algorithm is real, the killzones are real, and patience is the hardest part. Study the model, not the person.',
      avatar_emoji: '🧠',
      markets: ['Forex', 'Indices', 'Gold', 'Crypto'],
      style: 'ICT Methodology',
      signature: 'The algorithm is not emotional. It runs on time and price. Learn the model.',
      follower_count: 5412,
      external_followers: '120K YouTube',
      rating: 4.7,
      review_count: 891,
      verified: true,
      verified_at: new Date('2024-08-20T00:00:00Z'),
      onboarding_status: 'verified',
      added_by: SYSTEM_PROFILE_ID,
      contact_info: '@ICT_concepts',
    },
  })

  await prisma.playbook.upsert({
    where: {
      id: (
        await prisma.playbook.findFirst({ where: { mentor_id: ict.id, strategy_name: ictPlaybook.strategy_name } })
      )?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: {
      mentor_id: ict.id,
      ...ictPlaybook,
    },
  })

  console.log('✓ Verified mentors + playbooks created (Alex G, Tori Trades, ICT)')

  // ── 3. Draft mentors ──────────────────────────────────────────────────────
  const mack = await prisma.mentor.upsert({
    where: { handle: 'mackgray_fx' },
    update: {},
    create: {
      display_name: 'Mack Gray',
      handle: 'mackgray_fx',
      bio: 'Trendline breakout specialist. Clean charts, clean entries. If I cannot draw the line from memory, I do not take the trade.',
      avatar_emoji: '📐',
      markets: ['Forex', 'Indices'],
      style: 'Trendline Breakout',
      follower_count: 0,
      external_followers: '12K Twitter',
      verified: false,
      onboarding_status: 'admin_added',
      added_by: SYSTEM_PROFILE_ID,
      contact_info: '@mackgray_fx on Twitter',
    },
  })

  await prisma.playbook.upsert({
    where: {
      id: (
        await prisma.playbook.findFirst({ where: { mentor_id: mack.id, strategy_name: mackPlaybook.strategy_name } })
      )?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: {
      mentor_id: mack.id,
      ...mackPlaybook,
    },
  })

  const pat = await prisma.mentor.upsert({
    where: { handle: 'tradewithpat' },
    update: {},
    create: {
      display_name: 'TradeWithPat',
      handle: 'tradewithpat',
      bio: 'Supply and demand zone trader. I have been trading these zones for 8 years. The zones do not lie — only the trader does when they ignore them.',
      avatar_emoji: '🏗️',
      markets: ['Forex', 'Gold'],
      style: 'Supply & Demand',
      follower_count: 0,
      external_followers: '19K YouTube',
      verified: false,
      onboarding_status: 'admin_added',
      added_by: SYSTEM_PROFILE_ID,
      contact_info: '@tradewithpat on YouTube',
    },
  })

  await prisma.playbook.upsert({
    where: {
      id: (
        await prisma.playbook.findFirst({ where: { mentor_id: pat.id, strategy_name: patPlaybook.strategy_name } })
      )?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: {
      mentor_id: pat.id,
      ...patPlaybook,
    },
  })

  const carlos = await prisma.mentor.upsert({
    where: { handle: 'fxcarlos' },
    update: {},
    create: {
      display_name: 'FX Carlos',
      handle: 'fxcarlos',
      bio: 'Fibonacci is not magic — it is math. Price respects the golden ratio because institutions watch it. I teach traders to see what institutions see.',
      avatar_emoji: '🌀',
      markets: ['Forex', 'Gold', 'Indices'],
      style: 'Fibonacci Confluence',
      follower_count: 0,
      external_followers: '8K Instagram',
      verified: false,
      onboarding_status: 'admin_added',
      added_by: SYSTEM_PROFILE_ID,
      contact_info: '@fxcarlos on Instagram',
    },
  })

  await prisma.playbook.upsert({
    where: {
      id: (
        await prisma.playbook.findFirst({ where: { mentor_id: carlos.id, strategy_name: carlosPlaybook.strategy_name } })
      )?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: {
      mentor_id: carlos.id,
      ...carlosPlaybook,
    },
  })

  // ── 3b. Additional draft mentors (Chris Forex, Trading Geek, Navin, Sam Seiden, Rayner Teo) ──

  const chrisForex = await prisma.mentor.upsert({
    where: { handle: 'chrisforex' },
    update: {},
    create: {
      display_name:       'Chris Forex',
      handle:             'chrisforex',
      bio:                'Multi-timeframe swing trader. I teach traders to read the weekly, daily, and 4H in alignment before touching the 1H trigger. The higher timeframe is the thesis — the lower timeframe is the entry. Never the other way around.',
      avatar_emoji:       '📊',
      markets:            ['Forex', 'Gold', 'Indices'],
      style:              'Multi-Timeframe Swing Trading',
      follower_count:     0,
      external_followers: '31K YouTube',
      verified:           false,
      onboarding_status:  'draft_ready',
      added_by:           SYSTEM_PROFILE_ID,
      contact_info:       '@chrisforex on YouTube',
    },
  })
  await prisma.playbook.upsert({
    where: {
      id: (await prisma.playbook.findFirst({ where: { mentor_id: chrisForex.id, strategy_name: chrisForexPlaybook.strategy_name } }))?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: { mentor_id: chrisForex.id, ...chrisForexPlaybook },
  })

  const tradingGeek = await prisma.mentor.upsert({
    where: { handle: 'tradinggeek' },
    update: {},
    create: {
      display_name:       'The Trading Geek',
      handle:             'tradinggeek',
      bio:                'I trade one strategy, one session, and one pair. The London open breakout on GBPUSD. That is it. Six figures from 90 minutes a day — you do not need complexity, you need consistency.',
      avatar_emoji:       '⚡',
      markets:            ['Forex'],
      style:              'London Session Scalping',
      follower_count:     0,
      external_followers: '14K TikTok',
      verified:           false,
      onboarding_status:  'draft_ready',
      added_by:           SYSTEM_PROFILE_ID,
      contact_info:       '@tradinggeek on TikTok',
    },
  })
  await prisma.playbook.upsert({
    where: {
      id: (await prisma.playbook.findFirst({ where: { mentor_id: tradingGeek.id, strategy_name: tradingGeekPlaybook.strategy_name } }))?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: { mentor_id: tradingGeek.id, ...tradingGeekPlaybook },
  })

  const navin = await prisma.mentor.upsert({
    where: { handle: 'urbanforex' },
    update: {},
    create: {
      display_name:       'Navin Prithyani',
      handle:             'urbanforex',
      bio:                'I removed every indicator from my charts 10 years ago and never looked back. Price is the only truth. Everything else is a story you tell yourself to justify an entry you already want to take.',
      avatar_emoji:       '🎯',
      markets:            ['Forex', 'Gold'],
      style:              'Naked Price Action',
      follower_count:     0,
      external_followers: '89K YouTube',
      verified:           false,
      onboarding_status:  'draft_ready',
      added_by:           SYSTEM_PROFILE_ID,
      contact_info:       '@urbanforex on YouTube',
    },
  })
  await prisma.playbook.upsert({
    where: {
      id: (await prisma.playbook.findFirst({ where: { mentor_id: navin.id, strategy_name: navinPlaybook.strategy_name } }))?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: { mentor_id: navin.id, ...navinPlaybook },
  })

  const samSeiden = await prisma.mentor.upsert({
    where: { handle: 'samseiden' },
    update: {},
    create: {
      display_name:       'Sam Seiden',
      handle:             'samseiden',
      bio:                'Institutional supply and demand — the way banks and institutions actually trade. I have been teaching the Origin of Move concept for 20 years. Fresh zones where price has never returned are where the institutional orders are waiting.',
      avatar_emoji:       '🏛️',
      markets:            ['Forex', 'Gold', 'Stocks', 'Futures'],
      style:              'Institutional Supply & Demand',
      follower_count:     0,
      external_followers: '52K YouTube',
      verified:           false,
      onboarding_status:  'draft_ready',
      added_by:           SYSTEM_PROFILE_ID,
      contact_info:       '@samseiden on YouTube',
    },
  })
  await prisma.playbook.upsert({
    where: {
      id: (await prisma.playbook.findFirst({ where: { mentor_id: samSeiden.id, strategy_name: samSeidenPlaybook.strategy_name } }))?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: { mentor_id: samSeiden.id, ...samSeidenPlaybook },
  })

  const rayner = await prisma.mentor.upsert({
    where: { handle: 'raynerteo' },
    update: {},
    create: {
      display_name:       'Rayner Teo',
      handle:             'raynerteo',
      bio:                'Systematic trend following. The 200 EMA tells me the trend. The 50 EMA tells me when to enter. ATR tells me where to stop. That is the complete system. No discretion — ever. The system either signals or it does not.',
      avatar_emoji:       '📈',
      markets:            ['Forex', 'Stocks', 'Crypto', 'Commodities'],
      style:              'Systematic Trend Following',
      follower_count:     0,
      external_followers: '220K YouTube',
      verified:           false,
      onboarding_status:  'draft_ready',
      added_by:           SYSTEM_PROFILE_ID,
      contact_info:       '@raynerteo on YouTube',
    },
  })
  await prisma.playbook.upsert({
    where: {
      id: (await prisma.playbook.findFirst({ where: { mentor_id: rayner.id, strategy_name: raynerTeoPlaybook.strategy_name } }))?.id ?? '00000000-0000-0000-0000-000000000000',
    },
    update: {},
    create: { mentor_id: rayner.id, ...raynerTeoPlaybook },
  })

  console.log('✓ Draft mentors + AI-draft playbooks created (Mack Gray, TradeWithPat, FX Carlos, Chris Forex, Trading Geek, Navin, Sam Seiden, Rayner Teo)')

  // ── 4. MentorEscrow for draft mentors ──────────────────────────────────────
  await prisma.mentorEscrow.upsert({
    where: { mentor_id: mack.id },
    update: {},
    create: {
      mentor_id: mack.id,
      total_accrued: 0,
      released: false,
    },
  })

  await prisma.mentorEscrow.upsert({
    where: { mentor_id: pat.id },
    update: {},
    create: {
      mentor_id: pat.id,
      total_accrued: 0,
      released: false,
    },
  })

  await prisma.mentorEscrow.upsert({
    where: { mentor_id: carlos.id },
    update: {},
    create: {
      mentor_id: carlos.id,
      total_accrued: 0,
      released: false,
    },
  })

  // Escrow for the 5 new draft mentors
  for (const mentor of [chrisForex, tradingGeek, navin, samSeiden, rayner]) {
    await prisma.mentorEscrow.upsert({
      where:  { mentor_id: mentor.id },
      update: {},
      create: { mentor_id: mentor.id, total_accrued: 0, released: false },
    })
  }

  console.log('✓ MentorEscrow created for all draft mentors')

  // ── 5. MentorRequests (mentors NOT yet on the platform) ────────────────────
  // Upsert by checking for existing requests with same mentor_handle
  // Rayner Teo is now a draft mentor — removed from requests.
  // Requests are mentors not yet on the platform at all.
  const requestData = [
    {
      mentor_name:   'Adam Grimes',
      mentor_handle: 'adamhgrimes',
      markets:       ['Stocks', 'Futures', 'Forex'],
      vote_count:    47,
      status:        'open' as const,
    },
    {
      mentor_name:   'The Trading Channel',
      mentor_handle: 'thetradingchannel',
      markets:       ['Forex', 'Indices'],
      vote_count:    31,
      status:        'open' as const,
    },
    {
      mentor_name:   'Anton Kreil',
      mentor_handle: 'antonkreil',
      markets:       ['Forex', 'Stocks', 'Futures'],
      vote_count:    22,
      status:        'open' as const,
    },
    {
      mentor_name:   'No Nonsense Forex',
      mentor_handle: 'nnfx',
      markets:       ['Forex'],
      vote_count:    18,
      status:        'open' as const,
    },
  ]

  for (const req of requestData) {
    const existing = await prisma.mentorRequest.findFirst({
      where: { mentor_handle: req.mentor_handle },
    })

    if (!existing) {
      await prisma.mentorRequest.create({
        data: {
          mentor_name: req.mentor_name,
          mentor_handle: req.mentor_handle,
          markets: req.markets,
          requested_by: SYSTEM_PROFILE_ID,
          vote_count: req.vote_count,
          status: req.status,
        },
      })
    }
  }

  console.log('✓ MentorRequests created (Adam Grimes: 47, The Trading Channel: 31, Anton Kreil: 22, NNFX: 18)')
  console.log('✅ Seed complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
