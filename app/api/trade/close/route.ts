// app/api/trade/close/route.ts
// POST /api/trade/close — close an open position via MetaApi.
//
// Closes a single open position identified by its MT5 position ID.
// The accountId must belong to the requesting user.
//
// After closing, marks any matching pending journal entry as 'pending' (the
// trader updates the outcome manually via the journal UI once they know
// the final P&L — MetaApi close response does not include realised P&L).
//
// Request body (JSON):
//   {
//     accountId:  string (uuid — trading_accounts.id),
//     positionId: string (MT5 position/ticket ID),
//   }
//
// Response:
//   { closed: true, positionId }
//
// Errors:
//   400 Invalid body | Account not found
//   401 Unauthorised
//   500 MetaApi error | Internal

import { NextResponse, type NextRequest } from 'next/server'
import { z }               from 'zod'
import { createClient }    from '@/lib/supabase/server'
import { closePosition }   from '@/lib/metaapi/positions'
import { db }              from '@/lib/db'

// ─── Request schema ───────────────────────────────────────────────────────────

const CloseBodySchema = z.object({
  accountId:  z.string().uuid(),
  positionId: z.string().min(1),
})

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CloseBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { accountId, positionId } = parsed.data

  // ── Verify account ownership ──────────────────────────────────────────────
  const account = await db.tradingAccount.findFirst({
    where:  { id: accountId, user_id: user.id, is_active: true },
    select: { metaapi_account_id: true },
  })

  if (!account) {
    return NextResponse.json(
      { error: 'Trading account not found or not active' },
      { status: 400 },
    )
  }

  // ── Close position via MetaApi ────────────────────────────────────────────
  try {
    await closePosition(account.metaapi_account_id, positionId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trade/close] MetaApi error:', message)
    return NextResponse.json(
      { error: 'Failed to close position', detail: message },
      { status: 500 },
    )
  }

  // ── Update journal entry if one exists for this ticket ───────────────────
  // Fire-and-forget — close already happened, journal update is best-effort.
  // Outcome stays 'pending' until the trader updates it via the journal UI
  // (we don't have the realised P&L from MetaApi's close response).
  db.tradeJournal
    .updateMany({
      where: {
        user_id:    user.id,
        mt5_ticket: positionId,
        outcome:    'pending',
      },
      data: { updated_at: new Date() },
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[trade/close] Journal update error:', message)
    })

  return NextResponse.json({ closed: true, positionId })
}
