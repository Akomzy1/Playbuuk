// app/api/trade/connect/route.ts
// POST /api/trade/connect — provision an MT4/MT5 account via MetaApi.
//
// Validates inputs, calls MetaApi to create + deploy the cloud account,
// and persists the MetaApi account ID only — the MT5 password is NEVER stored.
//
// Pro-only endpoint. Free users receive 403.
//
// Request body (JSON):
//   {
//     brokerName:    string,
//     accountNumber: string,
//     password:      string,
//     server:        string,
//     platform:      "mt4" | "mt5",
//     accountType:   "demo" | "live",
//   }
//
// Response:
//   {
//     metaapiAccountId: string,
//     balance:          number,
//     currency:         string,
//     leverage:         number,
//   }
//
// Errors:
//   400 Invalid body (Zod)
//   401 Unauthorised
//   403 Pro subscription required
//   500 MetaApi error | Internal

import { NextResponse, type NextRequest } from 'next/server'
import { z }                from 'zod'
import { createClient }     from '@/lib/supabase/server'
import { checkTierAccess }  from '@/lib/auth/tierGate'
import { connectAccount }   from '@/lib/metaapi/accounts'

// ─── Request schema ───────────────────────────────────────────────────────────

const ConnectBodySchema = z.object({
  brokerName:    z.string().min(1).max(120),
  accountNumber: z.string().min(1).max(60),
  password:      z.string().min(1),
  server:        z.string().min(1).max(120),
  platform:      z.enum(['mt4', 'mt5']),
  accountType:   z.enum(['demo', 'live']),
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
      { error: 'Pro subscription required to connect a trading account' },
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

  const parsed = ConnectBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { brokerName, accountNumber, password, server, platform, accountType } = parsed.data

  // ── Connect via MetaApi ───────────────────────────────────────────────────
  try {
    const result = await connectAccount({
      userId: user.id,
      brokerName,
      accountNumber,
      password,       // used to provision MetaApi — never persisted
      server,
      platform,
      accountType,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trade/connect] MetaApi error:', message)
    return NextResponse.json(
      { error: 'Failed to connect trading account', detail: message },
      { status: 500 },
    )
  }
}
