// app/(platform)/accounts/page.tsx
// Connected trading accounts page.
// Traders connect their MT4/MT5 accounts here before using trade execution.
//
// Layout:
//   ┌─ Header ────────────────────────────────────────────────────────────────┐
//   │  Title + subtitle                    [Connect New Account] button       │
//   └─────────────────────────────────────────────────────────────────────────┘
//   ┌─ Accounts grid ─────────────────────────────────────────────────────────┐
//   │  AccountCard × n           (1-col mobile, 2-col md, 3-col xl)           │
//   │  "No accounts" empty state if none                                      │
//   └─────────────────────────────────────────────────────────────────────────┘
//
// Pro-only page. Free users see an upgrade prompt.
// The "Connect New Account" button mounts the ConnectAccount modal (client).

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { checkTierAccess } from '@/lib/auth/tierGate'
import { db }              from '@/lib/db'
import { AccountsShell }   from './accounts-shell'
import type { TradingAccount } from '@/components/trade/account-selector'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Connect Trading Account — Playbuuk',
  description:
    'Connect your MT4 or MT5 trading account to Playbuuk via MetaApi. ' +
    'Execute psychology-gated trades directly from your mentor\'s playbook ' +
    '— only when your setup grade meets your minimum threshold.',
  keywords: [
    'connect MT5 account',
    'MT4 trading account connection',
    'psychology-gated trade execution',
    'MetaApi trading account',
    'Playbuuk trading account',
  ],
  openGraph: {
    title:       'Connect Your Broker — Playbuuk',
    description: 'Link your MT4/MT5 account. Execute trades only when your setup grade says go.',
    type:        'website',
    images:      [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter:     { card: 'summary_large_image' },
  alternates:  { canonical: '/accounts' },
  robots:      { index: false },
}

// ─── Extended type ────────────────────────────────────────────────────────────

export interface TradingAccountFull extends TradingAccount {
  server:         string
  leverage:       number | null
  connected_at:   string
  last_synced_at: string | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AccountsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Tier check ────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  const userTier = profile?.tier ?? 'free'
  const isPro    = checkTierAccess(userTier, 'pro')

  // ── Fetch connected accounts ──────────────────────────────────────────────
  const rawAccounts = isPro
    ? await db.tradingAccount.findMany({
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
    : []

  // Serialise Decimal fields for client boundary
  const accounts: TradingAccountFull[] = rawAccounts.map(a => ({
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
    connected_at:       a.connected_at.toISOString(),
    last_synced_at:     a.last_synced_at?.toISOString() ?? null,
  }))

  return (
    <AccountsShell
      initialAccounts={accounts}
      isPro={isPro}
      userTier={userTier}
    />
  )
}
