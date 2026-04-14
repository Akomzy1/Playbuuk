// lib/metaapi/positions.ts
// Fetch open positions and close individual positions via MetaApi RPC.
//
// Server-side ONLY. Never call from client components.
// Each function opens and closes its own RPC connection — these are
// on-demand operations, not persistent subscriptions.

import { getMetaApi } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Position {
  id:          string
  symbol:      string
  type:        'buy' | 'sell'
  volume:      number
  openPrice:   number
  currentPrice: number
  profit:      number
  stopLoss?:   number
  takeProfit?: number
}

// ─── getOpenPositions ─────────────────────────────────────────────────────────
// Returns all currently open positions on the connected MT4/MT5 account.

export async function getOpenPositions(metaapiAccountId: string): Promise<Position[]> {
  const api     = await getMetaApi()
  const account = await api.metatraderAccountApi.getAccount(metaapiAccountId)

  const conn = account.getRPCConnection()
  await conn.connect()
  await conn.waitSynchronized(60)

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const raw = await conn.getPositions()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return (raw as Array<Record<string, unknown>>).map(p => ({
      id:           String(p['id']           ?? ''),
      symbol:       String(p['symbol']       ?? ''),
      type:         String(p['type'] ?? '').includes('SELL') ? 'sell' : 'buy',
      volume:       Number(p['volume']       ?? 0),
      openPrice:    Number(p['openPrice']    ?? 0),
      currentPrice: Number(p['currentPrice'] ?? 0),
      profit:       Number(p['profit']       ?? 0),
      stopLoss:     p['stopLoss']  != null ? Number(p['stopLoss'])  : undefined,
      takeProfit:   p['takeProfit'] != null ? Number(p['takeProfit']) : undefined,
    }))
  } finally {
    await conn.close()
  }
}

// ─── closePosition ────────────────────────────────────────────────────────────
// Closes a single open position by its ID (MT5 ticket number).

export async function closePosition(
  metaapiAccountId: string,
  positionId:       string,
): Promise<void> {
  const api     = await getMetaApi()
  const account = await api.metatraderAccountApi.getAccount(metaapiAccountId)

  const conn = account.getRPCConnection()
  await conn.connect()
  await conn.waitSynchronized(60)

  try {
    // MarketTradeOptions has only optional fields — {} is valid
    await conn.closePosition(positionId, {})
  } finally {
    await conn.close()
  }
}
