// lib/metaapi/accounts.ts
// MetaApi account management — provision, retrieve, disconnect.
//
// CRITICAL SECURITY RULES enforced here:
//   1. MT5 passwords are NEVER stored. Only the MetaApi account ID is persisted.
//   2. All functions are server-side only. Never call from client components.
//   3. The metaapi_account_id is stored in trading_accounts via Prisma.
//
// Account lifecycle:
//   connectAccount  → createAccount → deploy → waitDeployed → waitConnected
//                   → fetch account info → store only metaapi_account_id
//   disconnectAccount → remove account from MetaApi cloud
//   getAccountInfo  → open RPC connection → getAccountInformation → close

import { getMetaApi }  from './client'
import { db }          from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectAccountInput {
  userId:        string
  brokerName:    string
  accountNumber: string
  password:      string
  server:        string
  platform:      'mt4' | 'mt5'
  accountType:   'demo' | 'live'
}

export interface ConnectedAccountResult {
  metaapiAccountId: string
  balance:          number
  currency:         string
  leverage:         number
}

export interface AccountInfo {
  balance:  number
  equity:   number
  margin:   number
  currency: string
}

// ─── connectAccount ───────────────────────────────────────────────────────────
// Provisions a MetaApi cloud account, waits for it to connect to the broker,
// fetches initial balance/currency/leverage, and persists the MetaApi account
// ID (NOT the password) in the trading_accounts table.

export async function connectAccount(
  input: ConnectAccountInput,
): Promise<ConnectedAccountResult> {
  const { userId, brokerName, accountNumber, password, server, platform, accountType } = input

  const api = await getMetaApi()

  // 1. Create the MetaApi cloud account
  const account = await api.metatraderAccountApi.createAccount({
    name:     `${brokerName} — ${accountNumber}`,
    login:    accountNumber,
    password,
    server,
    platform,
    magic:    0,  // 0 = manual trades (required when manualTrades is true)
    type:     'cloud-g2',
  })

  // 2. Deploy and wait for the terminal to connect to the broker
  await account.deploy()
  await account.waitDeployed(120)
  await account.waitConnected(120)

  // 3. Open RPC connection and fetch initial account info
  const conn = account.getRPCConnection()
  await conn.connect()
  await conn.waitSynchronized(60)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const info = await conn.getAccountInformation()
  await conn.close()

  // 4. Persist — only the MetaApi account ID, never the password
  await db.tradingAccount.upsert({
    where:  { metaapi_account_id: account.id },
    create: {
      user_id:           userId,
      metaapi_account_id: account.id,
      broker_name:       brokerName,
      account_number:    accountNumber,
      server,
      platform,
      account_type:      accountType,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      balance:    info?.balance  ?? null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      currency:   info?.currency ?? 'USD',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      leverage:   info?.leverage ?? null,
      is_active:        true,
      connected_at:     new Date(),
      last_synced_at:   new Date(),
    },
    update: {
      is_active:         true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      balance:           info?.balance  ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      currency:          info?.currency ?? 'USD',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      leverage:          info?.leverage ?? undefined,
      last_synced_at:    new Date(),
    },
  })

  return {
    metaapiAccountId: account.id,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    balance:  (info?.balance  as number)  ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    currency: (info?.currency as string)  ?? 'USD',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    leverage: (info?.leverage as number)  ?? 0,
  }
}

// ─── disconnectAccount ────────────────────────────────────────────────────────
// Removes the MetaApi cloud account and marks the DB record as inactive.
// Does NOT delete the DB record — trading history references are preserved.

export async function disconnectAccount(metaapiAccountId: string): Promise<void> {
  const api = await getMetaApi()

  const account = await api.metatraderAccountApi.getAccount(metaapiAccountId)
  await account.remove()

  await db.tradingAccount.update({
    where:  { metaapi_account_id: metaapiAccountId },
    data:   { is_active: false },
  })
}

// ─── getAccountInfo ───────────────────────────────────────────────────────────
// Opens an RPC connection, fetches live account info (balance, equity, margin),
// then closes the connection.

export async function getAccountInfo(metaapiAccountId: string): Promise<AccountInfo> {
  const api = await getMetaApi()

  const account = await api.metatraderAccountApi.getAccount(metaapiAccountId)

  const conn = account.getRPCConnection()
  await conn.connect()
  await conn.waitSynchronized(60)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const info = await conn.getAccountInformation()
  await conn.close()

  // Sync balance back to DB
  await db.tradingAccount.update({
    where: { metaapi_account_id: metaapiAccountId },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      balance:        info?.balance ?? undefined,
      last_synced_at: new Date(),
    },
  })

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    balance:  (info?.balance  as number) ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    equity:   (info?.equity   as number) ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    margin:   (info?.margin   as number) ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    currency: (info?.currency as string) ?? 'USD',
  }
}
