'use client'

// components/trade/account-selector.tsx
// Dropdown to switch between connected trading accounts.
// Used in the trade panel and the accounts page header.
//
// Features:
//   - Platform badge (MT4/MT5)
//   - DEMO badge (info blue) vs LIVE indicator (warning orange)
//   - Balance shown in broker currency
//   - Disabled state when no accounts are connected
//   - "Connect account" shortcut at bottom of list
//
// Closes on outside click, Escape key, or selection.

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TradingAccount {
  id:                 string
  metaapi_account_id: string
  broker_name:        string
  account_number:     string
  platform:           string
  account_type:       string
  balance:            number | null
  currency:           string
  is_active:          boolean
}

interface AccountSelectorProps {
  accounts:          TradingAccount[]
  selectedId:        string | null
  onChange:          (account: TradingAccount) => void
  onConnectNew?:     () => void
  /** compact = true → used inline in trade panel (smaller height) */
  compact?:          boolean
  disabled?:         boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBalance(balance: number | null, currency: string): string {
  if (balance === null) return '—'
  return `${currency} ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── AccountBadges ────────────────────────────────────────────────────────────

function AccountBadges({ account, size = 'sm' }: { account: TradingAccount; size?: 'sm' | 'xs' }) {
  const px   = size === 'xs' ? 'px-1 py-0'     : 'px-1.5 py-0.5'
  const text = size === 'xs' ? 'text-[10px]'    : 'text-2xs'

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* Platform */}
      <span
        className={`${px} ${text} font-mono font-bold rounded`}
        style={{
          background: 'var(--card)',
          border:     '1px solid var(--border)',
          color:      'var(--dim)',
        }}
      >
        {account.platform.toUpperCase()}
      </span>

      {/* Account type */}
      {account.account_type === 'demo' ? (
        <span
          className={`${px} ${text} font-mono font-bold rounded`}
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
          className={`flex items-center gap-0.5 ${px} ${text} font-mono font-bold rounded`}
          style={{
            background: 'rgba(251,146,60,0.08)',
            border:     '1px solid rgba(251,146,60,0.2)',
            color:      'var(--warning)',
          }}
        >
          <AlertTriangle size={9} aria-hidden="true" />
          LIVE
        </span>
      )}
    </div>
  )
}

// ─── AccountSelector ─────────────────────────────────────────────────────────

export function AccountSelector({
  accounts,
  selectedId,
  onChange,
  onConnectNew,
  compact = false,
  disabled = false,
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false)
  const containerRef    = useRef<HTMLDivElement>(null)

  const activeAccounts = accounts.filter(a => a.is_active)
  const selected       = activeAccounts.find(a => a.id === selectedId) ?? null
  const isEmpty        = activeAccounts.length === 0

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = useCallback((account: TradingAccount) => {
    onChange(account)
    setOpen(false)
  }, [onChange])

  const isDisabled = disabled || isEmpty

  const triggerHeight = compact ? '36px' : '44px'
  const triggerPx     = compact ? 'px-3' : 'px-3.5'

  return (
    <div
      ref={containerRef}
      className="relative w-full"
    >
      {/* ── Trigger ───────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => !isDisabled && setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `Selected account: ${selected.broker_name} ${selected.account_number}` : 'Select trading account'}
        disabled={isDisabled}
        className={`w-full flex items-center justify-between gap-2 rounded-xl transition-all duration-150 ${triggerPx}`}
        style={{
          height:      triggerHeight,
          background:  'var(--card)',
          border:      `1px solid ${open ? 'var(--border-hover)' : 'var(--border)'}`,
          color:       isDisabled ? 'var(--muted)' : 'var(--text)',
          cursor:      isDisabled ? 'not-allowed' : 'pointer',
          boxShadow:   open ? '0 0 0 3px rgba(0,229,176,0.08)' : 'none',
        }}
      >
        {isEmpty ? (
          <span className="text-xs text-muted font-mono">No accounts connected</span>
        ) : selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col min-w-0">
              <span
                className="text-xs font-semibold text-text leading-none truncate"
                style={{ letterSpacing: '-0.01em' }}
              >
                {selected.broker_name}
              </span>
              <span className="text-2xs font-mono text-muted leading-none mt-0.5 tabular-nums">
                {selected.account_number}
              </span>
            </div>
            <AccountBadges account={selected} size="xs" />
            {selected.balance !== null && (
              <span className="text-2xs font-mono text-dim tabular-nums ml-auto flex-shrink-0">
                {formatBalance(selected.balance, selected.currency)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted font-mono">Select account…</span>
        )}

        <ChevronDown
          size={13}
          className="flex-shrink-0 transition-transform duration-150"
          style={{
            color:     'var(--muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        />
      </button>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl overflow-hidden"
            style={{
              background:  'var(--surface)',
              border:      '1px solid var(--border-hover)',
              boxShadow:   '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
            }}
            role="listbox"
            aria-label="Select trading account"
          >
            {/* Account list */}
            <div className="py-1 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {activeAccounts.map(account => {
                const isSelected = account.id === selectedId
                return (
                  <button
                    key={account.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(account)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-100"
                    style={{
                      background: isSelected ? 'rgba(0,229,176,0.06)' : 'transparent',
                      cursor:     'pointer',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--card)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Account info */}
                    <div className="flex flex-col min-w-0">
                      <span
                        className="text-xs font-semibold leading-none truncate"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text)' }}
                      >
                        {account.broker_name}
                      </span>
                      <span className="text-2xs font-mono text-muted leading-none mt-1 tabular-nums">
                        #{account.account_number}
                      </span>
                    </div>

                    {/* Right: badges + balance */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <AccountBadges account={account} size="xs" />
                      {account.balance !== null && (
                        <span
                          className="text-2xs font-mono tabular-nums"
                          style={{ color: 'var(--dim)' }}
                        >
                          {formatBalance(account.balance, account.currency)}
                        </span>
                      )}

                      {/* Selected indicator */}
                      {isSelected && (
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: 'var(--accent)' }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Connect new account shortcut */}
            {onConnectNew && (
              <>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <button
                  type="button"
                  onClick={() => { setOpen(false); onConnectNew() }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors duration-100"
                  style={{ color: 'var(--accent)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,176,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Plus size={13} aria-hidden="true" />
                  Connect new account
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
