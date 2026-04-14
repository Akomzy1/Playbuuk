'use client'

// app/(platform)/accounts/accounts-shell.tsx
// Client shell for the accounts page.
//
// Owns:
//   - accounts list state (server-seed + optimistic additions)
//   - ConnectAccount modal open/close state
//   - AccountCard render
//
// AccountCard layout (per account):
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │  [MT5] [DEMO]                               •  active indicator     │
//   │  Broker name — bold                                                 │
//   │  #12345678  ·  ICMarkets-Demo01             ─────────────────────── │
//   │  Balance                     Leverage                               │
//   │  USD 10,000.00               1:500                                  │
//   │  ─────────────────────────────────────────────────────────────────  │
//   │  Connected 2 days ago                    Last sync: just now        │
//   └─────────────────────────────────────────────────────────────────────┘

import { useState, useCallback }  from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Link2, AlertTriangle, Server, Clock, Wifi,
  WifiOff, ShieldCheck,
} from 'lucide-react'
import { ConnectAccount }     from '@/components/trade/connect-account'
import { AllPositions }       from '@/components/trade/all-positions'
import { UpgradePrompt }      from '@/components/ui/upgrade-prompt'
import type { ConnectedAccount } from '@/components/trade/connect-account'
import type { TradingAccountFull } from './page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountsShellProps {
  initialAccounts: TradingAccountFull[]
  isPro:           boolean
  userTier:        string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)

  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

// ─── AccountCard ──────────────────────────────────────────────────────────────

function AccountCard({ account }: { account: TradingAccountFull }) {
  const isLive = account.account_type === 'live'
  const isDemo = account.account_type === 'demo'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{   opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4 rounded-2xl overflow-hidden"
      style={{
        background:  'var(--card)',
        border:      `1px solid ${isLive ? 'rgba(251,146,60,0.2)' : 'var(--border)'}`,
        borderTop:   `2px solid ${isLive ? 'rgba(251,146,60,0.35)' : 'rgba(0,229,176,0.2)'}`,
      }}
    >
      {/* ── Card top ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 flex flex-col gap-3">

        {/* Badges row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Platform */}
            <span
              className="text-2xs font-mono font-bold px-2 py-0.5 rounded"
              style={{
                background: 'var(--surface)',
                border:     '1px solid var(--border)',
                color:      'var(--dim)',
              }}
            >
              {account.platform.toUpperCase()}
            </span>

            {/* Account type */}
            {isDemo ? (
              <span
                className="text-2xs font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(77,142,255,0.1)',
                  border:     '1px solid rgba(77,142,255,0.25)',
                  color:      'var(--info)',
                }}
              >
                DEMO
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-2xs font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(251,146,60,0.08)',
                  border:     '1px solid rgba(251,146,60,0.25)',
                  color:      'var(--warning)',
                }}
              >
                <AlertTriangle size={9} aria-hidden="true" />
                LIVE
              </span>
            )}
          </div>

          {/* Active indicator */}
          {account.is_active ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden="true"
                />
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden="true"
                />
              </span>
              <span className="text-2xs font-mono" style={{ color: 'var(--accent)' }}>
                Active
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <WifiOff size={11} style={{ color: 'var(--muted)' }} aria-hidden="true" />
              <span className="text-2xs font-mono text-muted">Inactive</span>
            </div>
          )}
        </div>

        {/* Broker name */}
        <div>
          <h3
            className="text-base font-bold text-text leading-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            {account.broker_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-dim">#{account.account_number}</span>
            <span className="text-muted" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-2xs font-mono text-muted">
              <Server size={10} aria-hidden="true" />
              {account.server}
            </span>
          </div>
        </div>

        {/* Balance + leverage */}
        <div
          className="grid grid-cols-2 gap-3 rounded-xl p-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <p className="text-2xs font-mono text-muted">BALANCE</p>
            <p
              className="text-lg font-bold font-mono mt-0.5"
              style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
            >
              {account.balance !== null
                ? account.balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '—'
              }
            </p>
            <p className="text-2xs font-mono text-muted mt-0.5">{account.currency}</p>
          </div>
          {account.leverage && (
            <div>
              <p className="text-2xs font-mono text-muted">LEVERAGE</p>
              <p
                className="text-lg font-bold font-mono mt-0.5"
                style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
              >
                1:{account.leverage.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Card footer ───────────────────────────────────────────────────── */}
      <div
        className="px-4 pb-4 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}
      >
        <div className="flex items-center gap-1.5 text-2xs font-mono text-muted">
          <Clock size={10} aria-hidden="true" />
          <span>Connected {relativeTime(account.connected_at)}</span>
        </div>
        {account.last_synced_at && (
          <div className="flex items-center gap-1 text-2xs font-mono text-muted">
            <Wifi size={10} aria-hidden="true" />
            <span>Synced {relativeTime(account.last_synced_at)}</span>
          </div>
        )}
      </div>

      {/* Live account warning banner */}
      {isLive && (
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ background: 'rgba(251,146,60,0.05)', borderTop: '1px solid rgba(251,146,60,0.15)' }}
        >
          <AlertTriangle size={11} style={{ color: 'var(--warning)' }} aria-hidden="true" />
          <p className="text-2xs font-mono" style={{ color: 'var(--warning)' }}>
            Live account — trades here affect your real broker balance
          </p>
        </div>
      )}
    </motion.article>
  )
}

// ─── AccountsShell ────────────────────────────────────────────────────────────

export function AccountsShell({ initialAccounts, isPro, userTier }: AccountsShellProps) {
  const [accounts,     setAccounts]     = useState<TradingAccountFull[]>(initialAccounts)
  const [modalOpen,    setModalOpen]    = useState(false)

  const handleSuccess = useCallback((connected: ConnectedAccount) => {
    const now = new Date().toISOString()
    const newAccount: TradingAccountFull = {
      id:                 crypto.randomUUID(),
      metaapi_account_id: connected.metaapi_account_id,
      broker_name:        connected.broker_name,
      account_number:     connected.account_number,
      platform:           connected.platform,
      account_type:       connected.account_type,
      balance:            connected.balance,
      currency:           connected.currency,
      leverage:           connected.leverage,
      is_active:          true,
      server:             '',       // not returned by connect — fetch separately if needed
      connected_at:       now,
      last_synced_at:     now,
    }
    setAccounts(prev => [newAccount, ...prev])
    setModalOpen(false)
  }, [])

  return (
    <>
      <main className="px-4 py-6 md:px-6 lg:px-8 max-w-[1400px] mx-auto">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-2xl font-bold text-text"
              style={{ letterSpacing: '-0.03em' }}
            >
              Trading Accounts
            </h1>
            <p className="text-sm text-dim mt-1 max-w-xl leading-relaxed">
              Connect your MT4 or MT5 account to enable psychology-gated trade execution.
              Trades only fire when{' '}
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                your setup grade meets your minimum threshold.
              </span>
            </p>
          </div>

          {isPro && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all duration-150"
              style={{
                background: 'var(--accent)',
                color:      'var(--bg)',
                border:     'none',
                cursor:     'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--btn-primary-hover-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)' }}
            >
              <Plus size={14} aria-hidden="true" />
              Connect New Account
            </button>
          )}
        </div>

        {/* ── Pro gate ─────────────────────────────────────────────────────── */}
        {!isPro ? (
          <div className="max-w-lg">
            <UpgradePrompt
              feature="trade_execution"
              headline="Connect your broker — execute with discipline"
              compact={false}
            />
          </div>
        ) : accounts.length === 0 ? (

          /* ── Empty state ──────────────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
            style={{ border: '1px dashed var(--border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: 'rgba(0,229,176,0.06)',
                border:     '1px solid rgba(0,229,176,0.15)',
              }}
              aria-hidden="true"
            >
              <ShieldCheck size={24} style={{ color: 'var(--accent)' }} />
            </div>

            <h2
              className="text-lg font-bold text-text mb-2"
              style={{ letterSpacing: '-0.02em' }}
            >
              No accounts connected
            </h2>
            <p className="text-sm text-dim max-w-sm mb-6 leading-relaxed">
              Connect your MT4 or MT5 account to execute psychology-gated trades.
              Your password is never stored — only a secure MetaApi account ID.
            </p>

            {/* How it works — 3 steps */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mb-8 text-left">
              {[
                { n: '1', title: 'Enter credentials', desc: 'Broker details + MT5 login' },
                { n: '2', title: 'Grade your setup', desc: 'Get A+ to D+ in real time' },
                { n: '3', title: 'Execute when ready', desc: 'Button unlocks at your threshold' },
              ].map(step => (
                <div
                  key={step.n}
                  className="flex flex-col gap-1.5 rounded-xl p-3"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: 'var(--accent)' }}
                  >
                    {step.n}
                  </span>
                  <p className="text-xs font-semibold text-text">{step.title}</p>
                  <p className="text-2xs text-muted">{step.desc}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
              style={{
                background: 'var(--accent)',
                color:      'var(--bg)',
                border:     'none',
                cursor:     'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--btn-primary-hover-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)' }}
            >
              <Link2 size={14} aria-hidden="true" />
              Connect Your First Account
            </button>
          </motion.div>

        ) : (

          /* ── Accounts grid + open positions ───────────────────────────── */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {accounts.map(account => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </AnimatePresence>
            </div>

            {/* Open positions across all accounts — renders null if none open */}
            <AllPositions accounts={accounts.filter(a => a.is_active)} />
          </>
        )}

        {/* Disclaimer */}
        <footer
          className="mt-12 pt-6 text-center"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs text-muted font-mono">
            Not financial advice. Trading carries substantial risk.
            Playbuuk never stores your broker password.
          </p>
        </footer>

      </main>

      {/* ── ConnectAccount modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <ConnectAccount
            onClose={()    => setModalOpen(false)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
    </>
  )
}
