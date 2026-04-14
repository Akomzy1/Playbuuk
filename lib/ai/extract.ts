// lib/ai/extract.ts
// AI strategy extraction using Claude API with web_search tool.
//
// Uses claude-sonnet-4-6 with the web_search tool to research a mentor's
// publicly available content and extract their trading strategy.
//
// Install: npm install @anthropic-ai/sdk
// (package.json has a placeholder — replace with the real SDK)

import Anthropic from '@anthropic-ai/sdk'
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionPrompt } from '@/lib/ai/prompts'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedChecklist {
  id:       string
  item:     string
  category: string
  weight:   number
  auto:     boolean
  evalKey:  string | null
}

export interface ExtractedRisk {
  risk_per_trade_pct?: number | null
  rr_ratio?:          number | null
  max_daily_loss_pct?: number | null
  max_lot_size?:      number | null
  preferred_lot_size?: number | null
}

export interface ExtractedPlaybook {
  strategy_name:     string
  summary:           string | null
  timeframes:        string[]
  session_preference: string | null
  core_concepts:     string[]
  entry_rules:       string[]
  exit_rules:        string[]
  indicators:        string[]
  golden_rules:      string[]
  common_mistakes:   string[]
  preferred_pairs:   string[]
  risk_management:   ExtractedRisk
  checklist:         ExtractedChecklist[]
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const VALID_TIMEFRAMES = new Set(['M1','M5','M15','M30','H1','H4','D1','W1','MN'])
const VALID_EVAL_KEYS  = new Set([
  'trend_exists','aoi_count_2','price_in_aoi','bos_detected','bos_synced',
  'engulfing','ema50_near','psych_level','session_active','session_killzone',
  'tl_3touch','tl_valid_slope','tl_span_week','fvg_detected',
])
const VALID_CATEGORIES = new Set(['structure','momentum','zone','session','indicator','psychology','custom'])

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function safeNumber(v: unknown): number | null {
  if (typeof v === 'number' && !isNaN(v)) return v
  return null
}

function validatePlaybook(raw: Record<string, unknown>): ExtractedPlaybook {
  const checklist: ExtractedChecklist[] = []
  if (Array.isArray(raw.checklist)) {
    for (const item of raw.checklist) {
      if (!item || typeof item !== 'object') continue
      const it = item as Record<string, unknown>
      const id       = typeof it.id === 'string' ? it.id : `ck-${checklist.length + 1}`
      const text     = typeof it.item === 'string' ? it.item.trim() : ''
      const category = VALID_CATEGORIES.has(it.category as string) ? (it.category as string) : 'custom'
      const weight   = typeof it.weight === 'number' ? Math.max(1, Math.min(5, Math.round(it.weight))) : 3
      const auto     = typeof it.auto === 'boolean' ? it.auto : false
      const evalKey  = (auto && VALID_EVAL_KEYS.has(it.evalKey as string)) ? (it.evalKey as string) : null
      if (text) checklist.push({ id, item: text, category, weight, auto, evalKey })
    }
  }

  const rm = (raw.risk_management && typeof raw.risk_management === 'object')
    ? raw.risk_management as Record<string, unknown>
    : {}

  return {
    strategy_name:      typeof raw.strategy_name === 'string' ? raw.strategy_name : 'Untitled Strategy',
    summary:            typeof raw.summary === 'string' ? raw.summary : null,
    timeframes:         safeStringArray(raw.timeframes).filter(t => VALID_TIMEFRAMES.has(t)),
    session_preference: typeof raw.session_preference === 'string' ? raw.session_preference : null,
    core_concepts:      safeStringArray(raw.core_concepts),
    entry_rules:        safeStringArray(raw.entry_rules),
    exit_rules:         safeStringArray(raw.exit_rules),
    indicators:         safeStringArray(raw.indicators),
    golden_rules:       safeStringArray(raw.golden_rules),
    common_mistakes:    safeStringArray(raw.common_mistakes),
    preferred_pairs:    safeStringArray(raw.preferred_pairs).map(p => p.toUpperCase()),
    risk_management: {
      risk_per_trade_pct: safeNumber(rm.risk_per_trade_pct),
      rr_ratio:           safeNumber(rm.rr_ratio),
      max_daily_loss_pct: safeNumber(rm.max_daily_loss_pct),
      max_lot_size:       safeNumber(rm.max_lot_size),
      preferred_lot_size: safeNumber(rm.preferred_lot_size),
    },
    checklist,
  }
}

// ─── extractPlaybook ──────────────────────────────────────────────────────────

export async function extractPlaybook(
  mentorName: string,
  handle:     string,
  markets:    string[],
  style?:     string | null,
): Promise<ExtractedPlaybook> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userPrompt = buildExtractionPrompt(mentorName, handle, markets, style)

  // Use web_search tool to let Claude research the mentor
  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    system:     EXTRACTION_SYSTEM_PROMPT,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    ],
    messages: [
      { role: 'user', content: userPrompt },
    ],
  })

  // Extract the text content from the response
  let jsonText = ''
  for (const block of response.content) {
    if (block.type === 'text') {
      jsonText += block.text
    }
  }

  // Strip any accidental markdown fencing
  jsonText = jsonText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    throw new Error(`AI returned invalid JSON. Response was: ${jsonText.slice(0, 200)}`)
  }

  return validatePlaybook(parsed)
}
