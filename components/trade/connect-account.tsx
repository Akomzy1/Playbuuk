'use client'

// components/trade/connect-account.tsx
// MT4/MT5 account connection modal.
//
// Three render states:
//   'form'    → input fields + security note
//   'loading' → animated "Verifying credentials…" screen
//   'success' → account balance + "Connected ✓" confirmation
//   'error'   → human-readable error with retry option
//
// Security note is always visible in the form state.
// Password input is cleared from component state after a successful connection.
//
// Layout:
//   Backdrop → centred modal card (max-w-md)
//     · Header: icon, title, close button
//     · Body: form OR loading OR success OR error
//     · Footer: CTA button

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Shield, CheckCircle2, AlertTriangle, Loader2,
  Link2, Lock, Server, Monitor, ToggleLeft, ToggleRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectAccountProps {
  onClose:   () => void
  onSuccess: (account: ConnectedAccount) => void
}

export interface ConnectedAccount {
  metaapi_account_id: string
  broker_name:        string
  account_number:     string
  platform:           string
  account_type:       string
  balance:            number
  currency:           string
  leverage:           number
}

type FormState = 'form' | 'loading' | 'success' | 'error'

interface FormData {
  brokerName:    string
  accountNumber: string
  password:      string
  server:        string
  platform:      'mt4' | 'mt5'
  accountType:   'demo' | 'live'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseApiError(message: string): string {
  if (message.toLowerCase().includes('invalid') ||
      message.toLowerCase().includes('password') ||
      message.toLowerCase().includes('credential')) {
    return 'Invalid credentials — check your account number and password.'
  }
  if (message.toLowerCase().includes('server') ||
      message.toLowerCase().includes('connect')) {
    return 'Could not reach broker server. Check the server name and try again.'
  }
  if (message.toLowerCase().includes('timeout')) {
    return 'Connection timed out — the broker server may be offline. Try again shortly.'
  }
  return message || 'Connection failed. Please check your details and try again.'
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps<T extends string> {
  value:    T
  options:  { value: T; label: string }[]
  onChange: (v: T) => void
}

function Toggle<T extends string>({ value, options, onChange }: ToggleProps<T>) {
  return (
    <div
      className="flex rounded-xl overflow-hidden"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      role="radiogroup"
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className="flex-1 px-4 py-2 text-sm font-semibold transition-all duration-150"
            style={{
              background:  active ? 'var(--accent)'  : 'transparent',
              color:       active ? 'var(--bg)'      : 'var(--dim)',
              border:      'none',
              cursor:      'pointer',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── InputField ───────────────────────────────────────────────────────────────

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: React.ReactNode
}

function InputField({ label, icon, id, ...props }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-dim"
        style={{ letterSpacing: '0.04em' }}
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          className="w-full rounded-xl text-sm font-mono transition-colors duration-150 focus:outline-none"
          style={{
            background:     'var(--bg)',
            border:         '1px solid var(--border)',
            color:          'var(--text)',
            padding:        icon ? '10px 12px 10px 36px' : '10px 12px',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.1)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          {...props}
        />
      </div>
    </div>
  )
}

// ─── ConnectAccount ───────────────────────────────────────────────────────────

export function ConnectAccount({ onClose, onSuccess }: ConnectAccountProps) {
  const [state,      setState]      = useState<FormState>('form')
  const [formData,   setFormData]   = useState<FormData>({
    brokerName:    '',
    accountNumber: '',
    password:      '',
    server:        '',
    platform:      'mt5',
    accountType:   'demo',
  })
  const [errorMsg,   setErrorMsg]   = useState('')
  const [result,     setResult]     = useState<ConnectedAccount | null>(null)
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const update = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const canSubmit =
    formData.brokerName.trim().length > 0 &&
    formData.accountNumber.trim().length > 0 &&
    formData.password.length > 0 &&
    formData.server.trim().length > 0

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/trade/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerName:    formData.brokerName.trim(),
          accountNumber: formData.accountNumber.trim(),
          password:      formData.password,
          server:        formData.server.trim(),
          platform:      formData.platform,
          accountType:   formData.accountType,
        }),
      })

      const data = await res.json() as {
        metaapiAccountId?: string
        balance?: number
        currency?: string
        leverage?: number
        error?: string
        detail?: string
      }

      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? 'Connection failed')
      }

      const connected: ConnectedAccount = {
        metaapi_account_id: data.metaapiAccountId ?? '',
        broker_name:        formData.brokerName.trim(),
        account_number:     formData.accountNumber.trim(),
        platform:           formData.platform,
        account_type:       formData.accountType,
        balance:            data.balance   ?? 0,
        currency:           data.currency  ?? 'USD',
        leverage:           data.leverage  ?? 0,
      }

      setResult(connected)
      // Clear password from memory immediately
      setFormData(prev => ({ ...prev, password: '' }))
      setState('success')
      onSuccess(connected)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMsg(parseApiError(message))
      setState('error')
    }
  }, [formData, canSubmit, onSuccess])

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Connect trading account"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{   opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
        style={{
          background:  'var(--surface)',
          border:      '1px solid var(--border)',
          borderTop:   '1px solid var(--border-hover)',
          boxShadow:   '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
          maxHeight:   '90vh',
        }}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(0,229,176,0.08)',
                border:     '1px solid rgba(0,229,176,0.2)',
              }}
              aria-hidden="true"
            >
              <Link2 size={14} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2
                className="text-sm font-bold text-text"
                style={{ letterSpacing: '-0.02em' }}
              >
                Connect Trading Account
              </h2>
              <p className="text-2xs font-mono text-muted mt-0.5">
                MT4 / MT5 via MetaApi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--card)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--muted)'
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>

            {/* ── Form state ─────────────────────────────────────────────── */}
            {state === 'form' && (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{   opacity: 0, x:  8 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 p-5"
                noValidate
              >
                {/* Security notice */}
                <div
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{
                    background:  'rgba(0,229,176,0.04)',
                    border:      '1px solid rgba(0,229,176,0.12)',
                  }}
                >
                  <Shield
                    size={14}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--accent)' }}
                    aria-hidden="true"
                  />
                  <p className="text-2xs text-dim leading-relaxed">
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                      Your password is sent directly to MetaApi for verification.
                    </span>
                    {' '}Playbuuk never stores your MT5 password — only a secure account ID is saved.
                  </p>
                </div>

                {/* Platform + Account type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-dim" style={{ letterSpacing: '0.04em' }}>
                      PLATFORM
                    </span>
                    <Toggle
                      value={formData.platform}
                      options={[
                        { value: 'mt4', label: 'MT4' },
                        { value: 'mt5', label: 'MT5' },
                      ]}
                      onChange={v => update('platform', v)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-dim" style={{ letterSpacing: '0.04em' }}>
                      ACCOUNT TYPE
                    </span>
                    <Toggle
                      value={formData.accountType}
                      options={[
                        { value: 'demo', label: 'Demo' },
                        { value: 'live', label: 'Live' },
                      ]}
                      onChange={v => update('accountType', v)}
                    />
                  </div>
                </div>

                {/* Live account warning */}
                <AnimatePresence>
                  {formData.accountType === 'live' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{   opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="flex items-start gap-2.5 rounded-xl p-3"
                        style={{
                          background: 'rgba(255,77,106,0.04)',
                          border:     '1px solid rgba(255,77,106,0.15)',
                        }}
                      >
                        <AlertTriangle
                          size={13}
                          className="flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--danger)' }}
                          aria-hidden="true"
                        />
                        <p className="text-2xs text-dim leading-relaxed">
                          <span className="font-semibold" style={{ color: 'var(--danger)' }}>
                            Live account — real money.
                          </span>
                          {' '}Trades executed here affect your real broker account. Use a demo account first.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Broker name */}
                <InputField
                  id="broker-name"
                  label="BROKER NAME"
                  placeholder="e.g. IC Markets, FTMO, Exness"
                  value={formData.brokerName}
                  onChange={e => update('brokerName', e.target.value)}
                  autoComplete="off"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  icon={<Monitor size={13} style={{ color: 'var(--muted)' }} />}
                />

                {/* Account number + password — row */}
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    id="account-number"
                    label="ACCOUNT NUMBER"
                    placeholder="12345678"
                    value={formData.accountNumber}
                    onChange={e => update('accountNumber', e.target.value)}
                    autoComplete="off"
                    inputMode="numeric"
                  />
                  <InputField
                    id="password"
                    label="PASSWORD"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => update('password', e.target.value)}
                    autoComplete="current-password"
                    icon={<Lock size={13} style={{ color: 'var(--muted)' }} />}
                  />
                </div>

                {/* Server */}
                <InputField
                  id="server"
                  label="SERVER"
                  placeholder="e.g. ICMarkets-Demo01"
                  value={formData.server}
                  onChange={e => update('server', e.target.value)}
                  autoComplete="off"
                  icon={<Server size={13} style={{ color: 'var(--muted)' }} />}
                />

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-150"
                  style={{
                    background:  canSubmit ? 'var(--accent)' : 'var(--card)',
                    color:       canSubmit ? 'var(--bg)'     : 'var(--muted)',
                    cursor:      canSubmit ? 'pointer'       : 'not-allowed',
                    border:      `1px solid ${canSubmit ? 'transparent' : 'var(--border)'}`,
                  }}
                  onMouseEnter={e => {
                    if (canSubmit) e.currentTarget.style.background = 'var(--btn-primary-hover-bg)'
                  }}
                  onMouseLeave={e => {
                    if (canSubmit) e.currentTarget.style.background = 'var(--accent)'
                  }}
                >
                  <Link2 size={14} aria-hidden="true" />
                  Connect Account
                </button>
              </motion.form>
            )}

            {/* ── Loading state ───────────────────────────────────────────── */}
            {state === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{   opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center justify-center gap-4 p-10"
                aria-live="polite"
                aria-label="Connecting to broker"
              >
                {/* Animated rings */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: 'var(--accent)' }}
                    aria-hidden="true"
                  />
                  <span
                    className="absolute inset-2 rounded-full animate-ping opacity-15"
                    style={{ background: 'var(--accent)', animationDelay: '0.3s' }}
                    aria-hidden="true"
                  />
                  <div
                    className="relative w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(0,229,176,0.1)',
                      border:     '1px solid rgba(0,229,176,0.3)',
                    }}
                    aria-hidden="true"
                  >
                    <Loader2
                      size={20}
                      className="animate-spin"
                      style={{ color: 'var(--accent)' }}
                    />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-text">Verifying credentials…</p>
                  <p className="text-2xs font-mono text-muted mt-1">
                    Connecting to broker server via MetaApi
                  </p>
                </div>

                {/* Step indicators */}
                <div className="flex flex-col gap-1.5 w-full max-w-xs">
                  {[
                    'Provisioning cloud terminal',
                    'Connecting to broker server',
                    'Syncing account data',
                  ].map((step, i) => (
                    <div key={step} className="flex items-center gap-2.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          background:     'var(--accent)',
                          opacity:        0.3 + i * 0.25,
                          animationDelay: `${i * 0.4}s`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="text-2xs font-mono text-muted">{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Success state ───────────────────────────────────────────── */}
            {state === 'success' && result && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-col items-center gap-5 p-8"
                aria-live="polite"
              >
                {/* Check icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(0,229,176,0.1)',
                    border:     '1px solid rgba(0,229,176,0.3)',
                    boxShadow:  '0 0 32px rgba(0,229,176,0.15)',
                  }}
                  aria-hidden="true"
                >
                  <CheckCircle2 size={28} style={{ color: 'var(--accent)' }} />
                </motion.div>

                <div className="text-center">
                  <p
                    className="text-base font-bold text-text"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    Account Connected
                  </p>
                  <p className="text-xs text-dim mt-1">
                    {result.broker_name} — {result.account_number}
                  </p>
                </div>

                {/* Balance card */}
                <div
                  className="w-full rounded-xl p-4 flex items-center justify-between"
                  style={{
                    background: 'var(--card)',
                    border:     '1px solid var(--border)',
                    borderTop:  '1px solid rgba(0,229,176,0.2)',
                  }}
                >
                  <div>
                    <p className="text-2xs font-mono text-muted">BALANCE</p>
                    <p
                      className="text-xl font-bold font-mono mt-0.5"
                      style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
                    >
                      {result.currency}{' '}
                      {result.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span
                        className="text-2xs font-mono font-bold px-2 py-0.5 rounded"
                        style={result.account_type === 'demo' ? {
                          background: 'rgba(77,142,255,0.1)',
                          border:     '1px solid rgba(77,142,255,0.25)',
                          color:      'var(--info)',
                        } : {
                          background: 'rgba(251,146,60,0.08)',
                          border:     '1px solid rgba(251,146,60,0.2)',
                          color:      'var(--warning)',
                        }}
                      >
                        {result.account_type.toUpperCase()}
                      </span>
                      <span
                        className="text-2xs font-mono px-2 py-0.5 rounded"
                        style={{
                          background: 'var(--surface)',
                          border:     '1px solid var(--border)',
                          color:      'var(--dim)',
                        }}
                      >
                        {result.platform.toUpperCase()}
                      </span>
                    </div>
                    {result.leverage > 0 && (
                      <p className="text-2xs font-mono text-muted mt-1">
                        1:{result.leverage} leverage
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                  style={{
                    background: 'var(--accent)',
                    color:      'var(--bg)',
                    border:     'none',
                    cursor:     'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--btn-primary-hover-bg)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)' }}
                >
                  Done
                </button>
              </motion.div>
            )}

            {/* ── Error state ─────────────────────────────────────────────── */}
            {state === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center gap-5 p-8"
                aria-live="assertive"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255,77,106,0.08)',
                    border:     '1px solid rgba(255,77,106,0.2)',
                  }}
                  aria-hidden="true"
                >
                  <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-text">Connection Failed</p>
                  <p
                    className="text-xs text-dim mt-2 leading-relaxed max-w-xs"
                    role="alert"
                  >
                    {errorMsg}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setState('form')}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={{
                    background: 'var(--card)',
                    color:      'var(--text)',
                    border:     '1px solid var(--border)',
                    cursor:     'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  Try Again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  )
}
