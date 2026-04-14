// lib/metaapi/execute.ts
// Psychology-gated trade execution via MetaApi RPC connection.
//
// NEVER call from client components. Only from API routes (app/api/trade/execute).
//
// The grade check (C+ minimum by default) is enforced in the API route layer —
// this module handles only the broker-level mechanics. The route passes grade
// data and records grade_override = true in the journal when the trader bypasses
// their threshold. That accountability data is the entire point.
//
// Flow:
//   getAccount → getRPCConnection → connect → waitSynchronized
//   → createMarketBuyOrder / createMarketSellOrder
//   → close connection
//   → return { orderId, price }

import { getMetaApi } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecuteTradeInput {
  symbol:     string
  type:       'buy' | 'sell'
  volume:     number
  stopLoss?:  number
  takeProfit?: number
}

export interface TradeResult {
  orderId:    string
  positionId: string
  price:      number
}

// ─── executeTrade ─────────────────────────────────────────────────────────────
// Opens a market order on the connected MT4/MT5 account.
// Returns the MT5 ticket number (orderId) and fill price.

export async function executeTrade(
  metaapiAccountId: string,
  input: ExecuteTradeInput,
): Promise<TradeResult> {
  const { symbol, type, volume, stopLoss, takeProfit } = input

  const api     = await getMetaApi()
  const account = await api.metatraderAccountApi.getAccount(metaapiAccountId)

  const conn = account.getRPCConnection()
  await conn.connect()
  await conn.waitSynchronized(60)

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result =
      type === 'buy'
        ? await conn.createMarketBuyOrder(symbol, volume, stopLoss, takeProfit)
        : await conn.createMarketSellOrder(symbol, volume, stopLoss, takeProfit)

    return {
      orderId:    result.orderId    ?? '',
      positionId: result.positionId ?? '',
      // MetatraderTradeResponse does not include fill price — caller can
      // fetch the open price from getPositions() if needed for the journal.
      price: 0,
    }
  } finally {
    await conn.close()
  }
}
