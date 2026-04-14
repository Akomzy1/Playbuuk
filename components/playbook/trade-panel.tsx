'use client'

// components/playbook/trade-panel.tsx
// The psychology gate in action — the trade execution panel.
//
// This is the moment of truth. Every design decision here serves one goal:
// force the trader to execute only when conditions justify it, and make
// deviation a visible, conscious act that is logged permanently.
//
// ─── States ────────────────────────────────────────────────────────────────
//
//  STATE 1: No account connected
//  → Prompt to connect, link to /accounts
//
//  STATE 2: Account connected + grade >= threshold (C+)
//  → Execute button: enabled — large gradient, subtle pulse
//  → Pre-filled: direction, lot size, SL, TP from playbook risk rules
//  → Editable fields show deviation from playbook values via "modified" label
//  → Account selector if multiple accounts
//  → Account balance shown
//
//  STATE 3: Account connected + grade < threshold
//  → Execute button: DISABLED — greyed, padlock icon
//  → Red "Setup D+ — below your C+ minimum. Wait." message
//  → "Override threshold" link (yellow) → override confirmation dialog
//
//  STATE 4: (modal) Pre-execution confirmation → TradeTicket component
//
// ─── Lot size calculation ────────────────────────────────────────────────────
//  If playbook has risk_per_trade_pct + account balance known:
//    risk_amount = balance × (risk_per_trade_pct / 100)
//    sl_pips     = 1.5 × ATR from market analysis converted to pips
//    pip_value   ≈ $10/pip/lot (EURUSD approximation)
//    lot_size    = risk_amount / (sl_pips × pip_value)
//  Capped by max_lot_size if set. Falls back to preferred_lot_size then 0.01.

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence }  from 'framer-motion'
import Link                         from 'next/link'
import {
  Link2, Lock, TrendingUp, TrendingDown, AlertTriangle,
  Wallet, ShieldAlert, Target, AlertCircle,
} from 'lucide-react'
import { useChecklistStore }     from '@/stores/checklist-store'
import { useMarketStore }        from '@/stores/market-store'
import { useTradeStore }         from '@/stores/trade-store'
import { canExecuteTrade }       from '@/lib/playbook/grader'
import { AccountSelector }       from '@/components/trade/account-selector'
import { TradeTicket }           from '@/components/trade/trade-ticket'
import type { TradingAccountFull } from '@/app/(platform)/accounts/page'
import type { RiskManagement }     from '@/lib/supabase/types'
import type { TradeDetails }       from '@/components/trade/trade-ticket'
import type { Grade }              from '@/lib/playbook/grader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TradePanelProps {
  playbookId:     string
  mentorName:     string
  riskManagement: RiskManagement
  accounts:       TradingAccountFull[]
}

// ─── Grade display config ─────────────────────────────────────────────────────

const GRADE_COLORS: Record<Grade, { text: string; border: string; bg: string }> = {
  'A+': { text: 'var(--gold)',   border: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.06)'  },
  'B+': { text: 'var(--accent)', border: 'rgba(0,229,176,0.3)',   bg: 'rgba(0,229,176,0.05)'   },
  'C+': { text: 'var(--cyan)',   border: 'rgba(34,211,238,0.25)', bg: 'rgba(34,211,238,0.05)'  },
  'D+': { text: 'var(--danger)', border: 'rgba(255,77,106,0.25)', bg: 'rgba(255,77,106,0.05)'  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pipsFromAtr(atr: number, symbol: string): number {
  const isJpy   = symbol.toUpperCase().includes('JPY')
  const pipSize = isJpy ? 0.01 : 0.0001
  return Math.max(10, Math.round((atr * 1.5) / pipSize))
}

function calcLotSize(
  balance:      number,
  riskPct:      number,
  slPips:       number,
  maxLot:       number | undefined,
  preferredLot: number | undefined,
): number {
  if (slPips <= 0 || balance <= 0) return preferredLot ?? 0.01
  const riskAmount = balance * (riskPct / 100)
  const pipValue   = 10 // ~$10/pip/lot (EURUSD)
  const raw        = riskAmount / (slPips * pipValue)
  const capped     = maxLot ? Math.min(raw, maxLot) : raw
  return Math.max(0.01, Math.round(capped * 100) / 100)
}

function calcSLPrice(price: number, slPips: number, dir: 'buy' | 'sell', symbol: string): number {
  const pipVal = symbol.toUpperCase().includes('JPY') ? 0.01 : 0.0001
  const offset = slPips * pipVal
  return dir === 'buy' ? price - offset : price + offset
}

function calcTPPrice(price: number, slPips: number, rr: number, dir: 'buy' | 'sell', symbol: string): number {
  const pipVal = symbol.toUpperCase().includes('JPY') ? 0.01 : 0.0001
  const offset = slPips * rr * pipVal
  return dir === 'buy' ? price + offset : price - offset
}

// ─── NumberInput ──────────────────────────────────────────────────────────────

interface NumberInputProps {
  label:        string
  value:        string
  defaultValue: string
  onChange:     (v: string) => void
  icon?:        React.ReactNode
  accentColor?: string
}

function NumberInput({ label, value, defaultValue, onChange, icon, accentColor = 'var(--accent)' }: NumberInputProps) {
  const modified = value !== '' && value !== defaultValue

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-1">
        <span className="text-2xs font-mono text-muted truncate" style={{ letterSpacing: '0.04em' }}>
          {label}
        </span>
        {modified && (
          <span className="text-2xs font-mono flex-shrink-0" style={{ color: 'var(--warning)' }}>
            edited
          </span>
        )}
      </div>
      <div className="relative">
        {icon && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          type="number"
          step="any"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={defaultValue}
          className="w-full rounded-lg text-xs font-mono tabular-nums focus:outline-none transition-colors duration-150"
          style={{
            background: 'var(--bg)',
            border:     `1px solid ${modified ? 'rgba(251,146,60,0.4)' : 'var(--border)'}`,
            color:      'var(--text)',
            padding:    icon ? '6px 6px 6px 24px' : '6px 8px',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = modified ? 'rgba(251,146,60,0.7)' : accentColor
            e.currentTarget.style.boxShadow   = `0 0 0 2px ${modified ? 'rgba(251,146,60,0.08)' : 'rgba(0,229,176,0.07)'}`
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = modified ? 'rgba(251,146,60,0.4)' : 'var(--border)'
            e.currentTarget.style.boxShadow   = 'none'
          }}
        />
      </div>
    </div>
  )
}

// ─── TradePanel ───────────────────────────────────────────────────────────────

export function TradePanel({ playbookId, mentorName, riskManagement, accounts }: TradePanelProps) {
  const currentGrade = useChecklistStore(s => s.currentGrade)
  const gradeResult  = useChecklistStore(s => s.gradeResult)
  const currentPair  = useMarketStore(s => s.currentPair)
  const analysis     = useMarketStore(s => s.analysis)
  const price        = useMarketStore(s => s.price)

  const selectedAccountId    = useTradeStore(s => s.selectedAccountId)
  const setSelectedAccountId = useTradeStore(s => s.setSelectedAccountId)

  // Seed the store on first mount if it has no value yet
  const defaultAccountId = (
    accounts.find(a => a.account_type === 'demo' && a.is_active)?.id
    ?? accounts.find(a => a.is_active)?.id
    ?? null
  )
  useEffect(() => {
    if (selectedAccountId === null && defaultAccountId !== null) {
      setSelectedAccountId(defaultAccountId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [gradeOverride,  setGradeOverride]  = useState(false)
  const [overrideDialog, setOverrideDialog] = useState(false)
  const [ticketOpen,     setTicketOpen]     = useState(false)
  const [lotValue,       setLotValue]       = useState('')
  const [slValue,        setSlValue]        = useState('')
  const [tpValue,        setTpValue]        = useState('')

  // Infer direction from market analysis
  const direction: 'buy' | 'sell' = useMemo(() => {
    if (analysis.bos_type === 'bullish')        return 'buy'
    if (analysis.bos_type === 'bearish')        return 'sell'
    if (analysis.trend_direction === 'bullish') return 'buy'
    if (analysis.trend_direction === 'bearish') return 'sell'
    return 'buy'
  }, [analysis.bos_type, analysis.trend_direction])

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  )

  // Pre-filled defaults from playbook risk rules + live market data
  const defaults = useMemo(() => {
    const balance  = selectedAccount?.balance ?? 0
    const riskPct  = riskManagement.risk_per_trade_pct ?? 1
    const rrRatio  = riskManagement.rr_ratio           ?? 2
    const atr      = analysis.atr ?? 0
    const slPips   = pipsFromAtr(atr, currentPair)
    const lot      = calcLotSize(balance, riskPct, slPips, riskManagement.max_lot_size, riskManagement.preferred_lot_size)
    const sl       = calcSLPrice(price, slPips, direction, currentPair)
    const tp       = calcTPPrice(price, slPips, rrRatio, direction, currentPair)
    const decimals = currentPair.toUpperCase().includes('JPY') ? 3 : 5

    return {
      lot:        lot.toFixed(2),
      sl:         sl.toFixed(decimals),
      tp:         tp.toFixed(decimals),
      slPips,
      riskAmount: balance * (riskPct / 100),
      currency:   selectedAccount?.currency ?? 'USD',
    }
  }, [selectedAccount, riskManagement, analysis.atr, price, direction, currentPair])

  // Reset edits when pair or account changes
  useEffect(() => {
    setLotValue('')
    setSlValue('')
    setTpValue('')
    setGradeOverride(false)
  }, [currentPair, selectedAccountId])

  const hasAccounts = accounts.length > 0
  const canExecute  = canExecuteTrade(currentGrade) || gradeOverride
  const isBlocked   = !canExecute
  const gc          = GRADE_COLORS[currentGrade]

  const tradeDetails: TradeDetails = useMemo(() => ({
    accountId:     selectedAccountId ?? '',
    playbookId,
    mentorName,
    symbol:        currentPair,
    direction,
    volume:        parseFloat(lotValue || defaults.lot) || 0.01,
    stopLoss:      slValue  ? parseFloat(slValue)  : parseFloat(defaults.sl)  || undefined,
    takeProfit:    tpValue  ? parseFloat(tpValue)  : parseFloat(defaults.tp)  || undefined,
    stopLossPips:  defaults.slPips,
    riskAmount:    defaults.riskAmount,
    currency:      defaults.currency,
    grade:         currentGrade,
    gradeOverride,
  }), [
    selectedAccountId, playbookId, mentorName, currentPair, direction,
    lotValue, slValue, tpValue, defaults, currentGrade, gradeOverride,
  ])

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 1: No account connected
  // ─────────────────────────────────────────────────────────────────────────
  if (!hasAccounts) {
    return (
      <section
        aria-label="Trade execution — no account connected"
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card)',
          border:     '1px solid var(--border)',
          borderTop:  '2px solid rgba(0,229,176,0.12)',
        }}
      >
        <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.15)' }}
            aria-hidden="true"
          >
            <Link2 size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">No trading account connected</p>
            <p className="text-xs text-dim mt-1.5 leading-relaxed max-w-xs">
              Connect your MT5 account to execute trades directly from Playbuuk — only when your setup grade meets your minimum threshold.
            </p>
          </div>
          <Link
            href="/accounts"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            <Link2 size={13} aria-hidden="true" />
            Connect Account
          </Link>
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 2 / 3: Account connected — main panel
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <section
        aria-label="Trade execution panel"
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card)',
          border:     '1px solid var(--border)',
          borderTop:  `2px solid ${isBlocked ? 'rgba(255,77,106,0.3)' : 'rgba(0,229,176,0.22)'}`,
        }}
      >

        {/* ── Panel header ─────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-mono font-bold"
              style={direction === 'buy' ? {
                background: 'rgba(77,142,255,0.1)',
                border:     '1px solid rgba(77,142,255,0.25)',
                color:      'var(--info)',
              } : {
                background: 'rgba(255,77,106,0.08)',
                border:     '1px solid rgba(255,77,106,0.2)',
                color:      'var(--danger)',
              }}
            >
              {direction === 'buy'
                ? <TrendingUp  size={9} aria-hidden="true" />
                : <TrendingDown size={9} aria-hidden="true" />}
              {direction.toUpperCase()}
            </span>
            <span className="text-xs font-bold font-mono text-text" style={{ letterSpacing: '0.02em' }}>
              {currentPair}
            </span>
          </div>

          <span
            className="text-xs font-bold font-mono px-2 py-0.5 rounded"
            style={{ background: gc.bg, border: `1px solid ${gc.border}`, color: gc.text }}
          >
            {currentGrade}
          </span>
        </div>

        {/* ── Account selector ──────────────────────────────────────────── */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-mono text-muted" style={{ letterSpacing: '0.04em' }}>
              ACCOUNT
            </span>
            {selectedAccount?.balance != null && (
              <div className="flex items-center gap-1">
                <Wallet size={10} style={{ color: 'var(--muted)' }} aria-hidden="true" />
                <span className="text-2xs font-mono text-dim tabular-nums">
                  {selectedAccount.currency}{' '}
                  {selectedAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
          <AccountSelector
            accounts={accounts}
            selectedId={selectedAccountId}
            onChange={a => setSelectedAccountId(a.id)}
            compact
          />
        </div>

        {/* ── Trade parameters ──────────────────────────────────────────── */}
        <div className="px-4 py-3 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono text-muted" style={{ letterSpacing: '0.04em' }}>
              TRADE PARAMETERS
            </span>
            <span className="text-2xs font-mono text-muted">
              pre-filled from playbook rules
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <NumberInput
              label="LOT SIZE"
              value={lotValue}
              defaultValue={defaults.lot}
              onChange={setLotValue}
            />
            <NumberInput
              label="STOP LOSS"
              value={slValue}
              defaultValue={defaults.sl}
              onChange={setSlValue}
              icon={<ShieldAlert size={9} style={{ color: 'var(--danger)' }} />}
              accentColor="rgba(255,77,106,0.7)"
            />
            <NumberInput
              label="TAKE PROFIT"
              value={tpValue}
              defaultValue={defaults.tp}
              onChange={setTpValue}
              icon={<Target size={9} style={{ color: 'var(--accent)' }} />}
            />
          </div>

          {/* Risk metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Risk', value: `${defaults.currency} ${defaults.riskAmount.toFixed(2)}` },
              { label: 'SL',   value: `${defaults.slPips}p` },
              riskManagement.rr_ratio
                ? { label: 'RR', value: `1:${riskManagement.rr_ratio}` }
                : null,
            ].filter(Boolean).map(item => (
              <span key={item!.label} className="text-2xs font-mono text-muted">
                {item!.label}:{' '}
                <span style={{ color: 'var(--dim)' }}>{item!.value}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Gate + execute button ──────────────────────────────────────── */}
        <div className="px-4 pb-4 flex flex-col gap-2.5 pt-3">

          {/* Grade blocked message */}
          <AnimatePresence>
            {isBlocked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{   opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-start gap-2.5 rounded-xl p-3 mb-0.5"
                  style={{
                    background: 'rgba(255,77,106,0.05)',
                    border:     '1px solid rgba(255,77,106,0.15)',
                  }}
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle
                    size={13}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--danger)' }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
                      Setup {currentGrade} — below your C+ minimum
                    </p>
                    <p className="text-2xs text-dim mt-0.5 leading-relaxed">
                      {gradeResult.missingItems[0]
                        ? `"${gradeResult.missingItems[0].item}" not met. Wait for better conditions.`
                        : 'Key criteria not met. Wait for better conditions.'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The execute button — the most important element on the page */}
          <motion.button
            type="button"
            disabled={!canExecute || !selectedAccountId}
            onClick={() => { if (canExecute && selectedAccountId) setTicketOpen(true) }}
            aria-label={
              !canExecute
                ? `Execute trade locked — grade ${currentGrade} below C+ threshold`
                : `Review and execute ${direction} on ${currentPair}`
            }
            className="w-full flex items-center justify-center gap-2.5 rounded-xl font-bold text-sm relative overflow-hidden"
            style={{
              height: '52px',
              cursor: (canExecute && selectedAccountId) ? 'pointer' : 'not-allowed',
              ...(canExecute ? {
                background: direction === 'buy'
                  ? 'linear-gradient(135deg, var(--accent) 0%, var(--info) 100%)'
                  : 'linear-gradient(135deg, var(--danger) 0%, #c73255 100%)',
                color:     '#fff',
                border:    'none',
              } : {
                background: 'var(--surface)',
                color:      'var(--muted)',
                border:     '1px solid var(--border)',
              }),
            }}
            animate={canExecute ? {
              boxShadow: [
                direction === 'buy'
                  ? '0 4px 20px rgba(0,229,176,0.2)'
                  : '0 4px 20px rgba(255,77,106,0.2)',
                direction === 'buy'
                  ? '0 4px 36px rgba(0,229,176,0.45)'
                  : '0 4px 36px rgba(255,77,106,0.45)',
                direction === 'buy'
                  ? '0 4px 20px rgba(0,229,176,0.2)'
                  : '0 4px 20px rgba(255,77,106,0.2)',
              ],
            } : { boxShadow: 'none' }}
            transition={canExecute ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : {}}
          >
            {!canExecute ? (
              <>
                <Lock size={14} aria-hidden="true" />
                Execute Trade — Locked
              </>
            ) : direction === 'buy' ? (
              <>
                <TrendingUp size={15} aria-hidden="true" />
                Execute Buy · {currentPair}
              </>
            ) : (
              <>
                <TrendingDown size={15} aria-hidden="true" />
                Execute Sell · {currentPair}
              </>
            )}
          </motion.button>

          {/* Override link */}
          <AnimatePresence>
            {isBlocked && !gradeOverride && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{   opacity: 0 }}
                transition={{ duration: 0.15, delay: 0.1 }}
                className="text-center"
              >
                <button
                  type="button"
                  onClick={() => setOverrideDialog(true)}
                  className="text-2xs font-mono hover:opacity-75 transition-opacity duration-150"
                  style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Override threshold — I understand the risk
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Override active */}
          <AnimatePresence>
            {gradeOverride && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{   opacity: 0 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 text-2xs font-mono" style={{ color: 'var(--warning)' }}>
                  <AlertTriangle size={10} aria-hidden="true" />
                  Override active — logged in journal
                </div>
                <button
                  type="button"
                  onClick={() => setGradeOverride(false)}
                  className="text-2xs font-mono text-muted hover:text-dim"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Override confirmation dialog ─────────────────────────────────── */}
      <AnimatePresence>
        {overrideDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--overlay)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Override grade threshold"
            onClick={e => { if (e.target === e.currentTarget) setOverrideDialog(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{   opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
              style={{
                background: 'var(--surface)',
                border:     '1px solid rgba(251,146,60,0.3)',
                borderTop:  '2px solid rgba(251,146,60,0.5)',
                boxShadow:  '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: 'rgba(251,146,60,0.1)',
                    border:     '1px solid rgba(251,146,60,0.3)',
                  }}
                  aria-hidden="true"
                >
                  <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
                    Override grade threshold
                  </h2>
                  <p className="text-xs text-dim mt-1.5 leading-relaxed">
                    You&apos;re about to execute on a{' '}
                    <span className="font-bold" style={{ color: 'var(--danger)' }}>
                      {currentGrade} setup
                    </span>{' '}
                    — below your C+ minimum. This override is permanently logged in your journal and counted in psychology insights.
                  </p>
                </div>
              </div>

              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{ background: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.12)' }}
              >
                <p className="text-xs font-mono italic" style={{ color: 'var(--warning)' }}>
                  &ldquo;Your discipline is your edge. The system is telling you to wait.&rdquo;
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setOverrideDialog(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={{
                    background: 'var(--card)',
                    border:     '1px solid var(--border)',
                    color:      'var(--text)',
                    cursor:     'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  Cancel — I&apos;ll wait
                </button>
                <button
                  type="button"
                  onClick={() => { setGradeOverride(true); setOverrideDialog(false) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                  style={{
                    background: 'rgba(251,146,60,0.1)',
                    border:     '1px solid rgba(251,146,60,0.3)',
                    color:      'var(--warning)',
                    cursor:     'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,0.1)' }}
                >
                  Override &amp; Execute
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Execution disclaimer — shown only when execute is available ─── */}
      {canExecute && (
        <p
          className="text-xs font-mono text-center leading-relaxed"
          style={{ color: 'var(--muted)', marginTop: '-0.25rem' }}
        >
          Not financial advice.{' '}
          <a
            href="/disclaimer"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--dim)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Full risk disclosure
          </a>
          .
        </p>
      )}

      {/* ── Trade ticket ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {ticketOpen && (
          <TradeTicket
            details={tradeDetails}
            onClose={() => setTicketOpen(false)}
            onDone={() => {
              setTicketOpen(false)
              setGradeOverride(false)
              setLotValue('')
              setSlValue('')
              setTpValue('')
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
