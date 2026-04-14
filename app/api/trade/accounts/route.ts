// app/api/trade/accounts/route.ts
// GET /api/trade/accounts — list all trading accounts for the authenticated user.
//
// Returns all connected MT4/MT5 accounts for the current user.
// Passwords are never stored, so there is nothing sensitive to redact.
//
// Response:
//   { accounts: TradingAccountItem[] }
//
// Errors:
//   401 Unauthorised
//   500 Internal

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

// ─── Response type ────────────────────────────────────────────────────────────

export interface TradingAccountItem {
  id:                  string
  metaapi_account_id:  string
  broker_name:         string
  account_number:      string
  server:              string
  platform:            string
  account_type:        string
  balance:             number | null
  currency:            string
  leverage:            number | null
  is_active:           boolean
  connected_at:        Date
  last_synced_at:      Date | null
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const accounts = await db.tradingAccount.findMany({
      where:   { user_id: user.id },
      orderBy: { connected_at: 'desc' },
      select: {
        id:                 true,
        metaapi_account_id: true,
        broker_name:        true,
        account_number:     true,
        server:             true,
        platform:           true,
        account_type:       true,
        balance:            true,
        currency:           true,
        leverage:           true,
        is_active:          true,
        connected_at:       true,
        last_synced_at:     true,
      },
    })

    const items: TradingAccountItem[] = accounts.map(a => ({
      id:                 a.id,
      metaapi_account_id: a.metaapi_account_id,
      broker_name:        a.broker_name,
      account_number:     a.account_number,
      server:             a.server,
      platform:           a.platform,
      account_type:       a.account_type,
      balance:            a.balance != null ? Number(a.balance) : null,
      currency:           a.currency,
      leverage:           a.leverage,
      is_active:          a.is_active,
      connected_at:       a.connected_at,
      last_synced_at:     a.last_synced_at,
    }))

    return NextResponse.json({ accounts: items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trade/accounts] GET error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
