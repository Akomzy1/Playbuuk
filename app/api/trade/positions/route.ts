// app/api/trade/positions/route.ts
// GET /api/trade/positions?accountId=<uuid> — fetch open positions.
//
// Opens an RPC connection to the specified account and returns all currently
// open positions from the broker. The accountId must belong to the requesting
// user and be active — otherwise 400.
//
// Query params:
//   accountId — trading_accounts.id (uuid, required)
//
// Response:
//   { positions: Position[] }
//
// Errors:
//   400 Missing/invalid accountId | Account not found
//   401 Unauthorised
//   500 MetaApi error | Internal

import { NextResponse, type NextRequest } from 'next/server'
import { z }                from 'zod'
import { createClient }     from '@/lib/supabase/server'
import { getOpenPositions } from '@/lib/metaapi/positions'
import { db }               from '@/lib/db'

// ─── Query param schema ───────────────────────────────────────────────────────

const QuerySchema = z.object({
  accountId: z.string().uuid(),
})

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Parse + validate query params ─────────────────────────────────────────
  const raw    = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = QuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'accountId query param is required and must be a valid UUID' },
      { status: 400 },
    )
  }

  const { accountId } = parsed.data

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

  // ── Fetch positions via MetaApi ───────────────────────────────────────────
  try {
    const positions = await getOpenPositions(account.metaapi_account_id)
    return NextResponse.json({ positions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trade/positions] MetaApi error:', message)
    return NextResponse.json(
      { error: 'Failed to fetch positions', detail: message },
      { status: 500 },
    )
  }
}
