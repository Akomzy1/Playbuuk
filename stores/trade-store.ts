// stores/trade-store.ts
// Global trade execution state — shared between TradePanel and PositionsPanel
// so both components stay in sync on the selected account without prop drilling.

import { create } from 'zustand'

interface TradeStore {
  // The trading_accounts.id currently selected in the trade panel.
  // null = no account selected (no connected accounts, or user hasn't chosen yet).
  selectedAccountId: string | null
  setSelectedAccountId: (id: string | null) => void
}

export const useTradeStore = create<TradeStore>(set => ({
  selectedAccountId:    null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
}))
