// lib/ai/prompts.ts
// Prompt templates for Claude API strategy extraction.

// ─── Playbook extraction system prompt ───────────────────────────────────────

export const EXTRACTION_SYSTEM_PROMPT = `You are a trading strategy analyst for Playbuuk, a trading discipline platform.
Your task is to research a trading mentor's publicly available content and extract their strategy into a structured playbook format.

Be thorough, accurate, and precise. Only include rules and concepts you can verify from public sources (YouTube, Twitter/X, TikTok, blogs).
Do not invent rules. If a section has insufficient public information, return an empty array for that field.

You must respond with a single valid JSON object matching the exact schema below. No markdown, no explanation — pure JSON only.`

// ─── Extraction user prompt ───────────────────────────────────────────────────

export function buildExtractionPrompt(
  mentorName: string,
  handle:     string,
  markets:    string[],
  style?:     string | null,
): string {
  return `Research the trading strategy of mentor: "${mentorName}"
Handle/username: ${handle}
Markets they trade: ${markets.join(', ')}
${style ? `Known style: ${style}` : ''}

Search for their public content on YouTube, Twitter/X, TikTok, trading forums, and blogs.
Extract their trading strategy into the following JSON structure:

{
  "strategy_name": "string — concise name for their strategy (e.g. 'Smart Money Concepts — London Session')",
  "summary": "string — 2-4 sentence overview of the strategy. What is it? Why does it work? Who is it for?",
  "timeframes": ["array of timeframe strings from: M1, M5, M15, M30, H1, H4, D1, W1, MN"],
  "session_preference": "string or null — which trading session they prefer (e.g. 'london', 'new_york', 'london_ny', 'tokyo')",
  "core_concepts": ["array of 3-8 strings — the fundamental ideas the trader must understand"],
  "entry_rules": ["array of 3-10 strings — exact conditions required before entering a trade"],
  "exit_rules": ["array of 3-8 strings — when to take profit, move stop, or exit early"],
  "indicators": ["array of 0-6 strings — any technical indicators or tools they use"],
  "golden_rules": ["array of 3-8 strings — non-negotiable rules. Never break these."],
  "common_mistakes": ["array of 3-6 strings — what traders typically do wrong with this strategy"],
  "preferred_pairs": ["array of currency pairs e.g. EURUSD, GBPUSD, XAUUSD"],
  "risk_management": {
    "risk_per_trade_pct": "number or null",
    "rr_ratio": "number or null",
    "max_daily_loss_pct": "number or null",
    "max_lot_size": "number or null",
    "preferred_lot_size": "number or null"
  },
  "checklist": [
    {
      "id": "unique string ID like ck-1, ck-2 etc",
      "item": "string — the checklist item text as traders will read it",
      "category": "one of: structure, momentum, zone, session, indicator, psychology, custom",
      "weight": "number 1-5 (5=critical, 1=minor)",
      "auto": "boolean — true if objectively detectable by the system",
      "evalKey": "one of the valid eval keys below, or null if auto is false"
    }
  ]
}

Valid evalKeys (use only these exact strings, or null):
trend_exists, aoi_count_2, price_in_aoi, bos_detected, bos_synced,
engulfing, ema50_near, psych_level, session_active, session_killzone,
tl_3touch, tl_valid_slope, tl_span_week, fvg_detected

Checklist rules:
- Weight 5 = trade invalid without it; 1 = minor confirmation
- auto=true means the Playbuuk system can detect this automatically
- auto=false means the trader must manually confirm (evalKey must be null)
- Include 5-12 checklist items total

Return ONLY the JSON object. No code blocks, no markdown, no explanation.`
}
