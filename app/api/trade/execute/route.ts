// app/api/trade/execute/route.ts
// POST /api/trade/execute — psychology-gated trade execution via MetaApi.
//
// SECURITY: Trade execution is server-side ONLY. MetaApi is never called
// from the client. This route is the only execution path.
//
// Psychology gate:
//   The grade is validated here but the enforcement decision is owned by the
//   client (which compares grade against the trader's configured threshold).
//   If gradeOverride = true, the trader consciously chose to bypass their
//   minimum threshold — this is logged as grade_override = true in the
//   journal for accountability. This is non-negotiable. Never omit it.
//
// Pro-only endpoint.
//
// Request body (JSON):
//   {
//     accountId:        string (uuid — trading_accounts.id),
//     symbol:           string (e.g. "EURUSD"),
//     type:             "buy" | "sell",
//     volume:           number (lot size, > 0),
//     stopLoss?:        number,
//     takeProfit?:      number,
//     playbookId:       string (uuid),
//     grade:            "A+" | "B+" | "C+" | "D+",
//     gradeOverride:    boolean,
//     preTradeEmotion?: string (e.g. "FOMO", "Calm", "Revenge"),
//   }
//
// Response:
//   { orderId, positionId, price, journalId }
//
// Errors:
//   400 Invalid body | Account not found | Account not owned by user
//   401 Unauthorised
//   403 Pro required
//   500 MetaApi error | Internal

import { NextResponse, type NextRequest } from 'next/server'
import { z }               from 'zod'
import { createClient }    from '@/lib/supabase/server'
import { checkTierAccess } from '@/lib/auth/tierGate'
import { executeTrade }    from '@/lib/metaapi/execute'
import { db }              from '@/lib/db'

// ─── Request schema ───────────────────────────────────────────────────────────

const ExecuteBodySchema = z.object({
  accountId:        z.string().uuid(),
  symbol:           z.string().min(1).max(20).toUpperCase(),
  type:             z.enum(['buy', 'sell']),
  volume:           z.number().positive(),
  stopLoss:         z.number().positive().optional(),
  takeProfit:       z.number().positive().optional(),
  playbookId:       z.string().uuid(),
  grade:            z.enum(['A+', 'B+', 'C+', 'D+']),
  gradeOverride:    z.boolean(),
  preTradeEmotion:  z.string().max(60).optional(),
  // If trade was initiated from a push alert tap, pass the alert_log UUID.
  // Enables alert_initiated=true in journal + links the alert_log entry.
  alertId:          z.string().uuid().optional(),
})

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Tier check — Pro only ─────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!checkTierAccess(profile?.tier ?? 'free', 'pro')) {
    return NextResponse.json(
      { error: 'Pro subscription required to execute trades' },
      { status: 403 },
    )
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ExecuteBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const {
    accountId, symbol, type, volume, stopLoss, takeProfit,
    playbookId, grade, gradeOverride, preTradeEmotion, alertId,
  } = parsed.data

  // ── Verify account belongs to this user ───────────────────────────────────
  const account = await db.tradingAccount.findFirst({
    where: { id: accountId, user_id: user.id, is_active: true },
    select: { metaapi_account_id: true },
  })

  if (!account) {
    return NextResponse.json(
      { error: 'Trading account not found or not active' },
      { status: 400 },
    )
  }

  // ── Execute via MetaApi ───────────────────────────────────────────────────
  let tradeResult: { orderId: string; positionId: string; price: number }
  try {
    tradeResult = await executeTrade(account.metaapi_account_id, {
      symbol,
      type,
      volume,
      stopLoss,
      takeProfit,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trade/execute] MetaApi error:', message)
    return NextResponse.json(
      { error: 'Trade execution failed', detail: message },
      { status: 500 },
    )
  }

  // ── Auto-log journal entry + usage event (parallel, fire-and-forget on err) ──
  let journalId: string | null = null

  try {
    const [journal] = await Promise.all([
      // Trade journal entry with full psychology context
      db.tradeJournal.create({
        data: {
          user_id:          user.id,
          playbook_id:      playbookId,
          pair:             symbol,
          direction:        type === 'buy' ? 'long' : 'short',
          setup_grade:      grade,
          lot_size:         volume,
          stop_loss:        stopLoss   ?? null,
          take_profit:      takeProfit ?? null,
          mt5_ticket:        tradeResult.orderId,
          execution_source:  'playbuuk',
          grade_override:    gradeOverride,
          pre_trade_emotion: preTradeEmotion ?? null,
          alert_initiated:   !!alertId,
          alert_id:          alertId ?? null,
          outcome:           'pending',
        },
        select: { id: true },
      }),
      // Playbook usage — trade_executed (3 pts for revenue share)
      db.playbookUsage.create({
        data: {
          user_id:    user.id,
          playbook_id: playbookId,
          event_type: 'trade_executed',
        },
      }),
    ])

    journalId = journal.id

    // If this trade came from an alert tap, mark the alert_log entry as converted.
    // Non-critical — fire-and-forget after journal is saved.
    if (alertId && journal.id) {
      db.alertLog.update({
        where: { id: alertId },
        data:  { resulted_in_trade: true, trade_id: journal.id },
      }).catch(() => {/* non-critical */})
    }

  } catch (err) {
    // Journal failure does not cancel the trade — it already executed.
    // Log and continue; the trade is real.
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trade/execute] Journal/usage log error:', message)
  }

  return NextResponse.json(
    {
      orderId:    tradeResult.orderId,
      positionId: tradeResult.positionId,
      price:      tradeResult.price,
      journalId,
    },
    { status: 201 },
  )
}
