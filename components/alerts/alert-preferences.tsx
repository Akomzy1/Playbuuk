'use client'

// components/alerts/alert-preferences.tsx
// Setup alert notification preferences — threshold, mentors, pairs, sessions,
// quiet hours, push toggle, and test notification button.

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence }           from 'framer-motion'
import {
  Bell, BellOff, CheckCircle2, XCircle,
  Send, Loader2, Lock, Info,
} from 'lucide-react'
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/alerts/push'

// ─── Types ────────────────────────────────────────────────────────────────────

type Threshold = 'a_plus' | 'b_plus' | 'c_plus'
type Session   = 'london' | 'new_york' | 'tokyo' | 'sydney'

interface Preferences {
  id:                string
  alert_threshold:   Threshold
  alert_mentors:     string[] | null
  alert_pairs:       string[] | null
  alert_sessions:    Session[] | null
  quiet_hours_start: string | null
  quiet_hours_end:   string | null
  push_enabled:      boolean
  has_subscription:  boolean
}

interface FollowedMentor {
  id:           string
  display_name: string
  handle:       string
  avatar_emoji: string
  verified:     boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THRESHOLDS: Array<{ value: Threshold; label: string; desc: string; colour: string }> = [
  { value: 'a_plus', label: 'A+ only',        desc: 'Highest quality setups only. Fewer alerts, higher accuracy.',  colour: '#fbbf24' },
  { value: 'b_plus', label: 'B+ and above',   desc: 'Good setups. A balance of frequency and quality.',             colour: '#4d8eff' },
  { value: 'c_plus', label: 'C+ and above',   desc: 'All tradeable setups. More alerts, lower average quality.',    colour: '#22d3ee' },
]

const SESSIONS: Array<{ value: Session; label: string; hours: string }> = [
  { value: 'london',   label: 'London',   hours: '08:00–17:00 UTC' },
  { value: 'new_york', label: 'New York', hours: '13:00–22:00 UTC' },
  { value: 'tokyo',    label: 'Tokyo',    hours: '00:00–09:00 UTC' },
  { value: 'sydney',   label: 'Sydney',   hours: '22:00–07:00 UTC' },
]

const GRADE_COLOUR: Record<Threshold, string> = {
  a_plus: '#fbbf24',
  b_plus: '#4d8eff',
  c_plus: '#22d3ee',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize:      11,
      fontWeight:    700,
      color:         'var(--dim)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom:  10,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertPreferences() {
  const [prefs,           setPrefs]           = useState<Preferences | null>(null)
  const [mentors,         setMentors]         = useState<FollowedMentor[]>([])
  const [pairsInput,      setPairsInput]      = useState('')
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [testState,       setTestState]       = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [testMessage,     setTestMessage]     = useState('')
  const [pushState,       setPushState]       = useState<'idle' | 'subscribing' | 'unsubscribing'>('idle')
  const [permissionState, setPermissionState] = useState<string>('default')
  const [saveToast,       setSaveToast]       = useState(false)

  // ── Load preferences ──────────────────────────────────────────────────────

  useEffect(() => {
    setPermissionState(getPermissionState())
    fetch('/api/alerts/preferences')
      .then(r => r.json())
      .then(data => {
        setPrefs(data.preferences)
        setMentors(data.followed_mentors ?? [])
        // Populate pairs input from stored array
        if (data.preferences.alert_pairs) {
          setPairsInput((data.preferences.alert_pairs as string[]).join(', '))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Save helper ───────────────────────────────────────────────────────────

  const save = useCallback(async (patch: Partial<Preferences>) => {
    if (!prefs) return
    setSaving(true)

    const updated = { ...prefs, ...patch }
    setPrefs(updated)

    await fetch('/api/alerts/preferences', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(console.error)

    setSaving(false)
    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 2000)
  }, [prefs])

  // ── Threshold change ──────────────────────────────────────────────────────

  const setThreshold = (t: Threshold) => save({ alert_threshold: t })

  // ── Mentor toggle ─────────────────────────────────────────────────────────

  function toggleMentor(id: string) {
    if (!prefs) return
    const current = prefs.alert_mentors ?? []
    const next    = current.includes(id)
      ? current.filter(m => m !== id)
      : [...current, id]
    // null means "all mentors" — if all are selected, normalise to null
    const stored = next.length === mentors.length ? null : next.length === 0 ? null : next
    save({ alert_mentors: stored })
  }

  // ── Session toggle ────────────────────────────────────────────────────────

  function toggleSession(s: Session) {
    if (!prefs) return
    const current = prefs.alert_sessions ?? []
    const next    = current.includes(s)
      ? current.filter(x => x !== s)
      : [...current, s]
    save({ alert_sessions: next.length === 0 ? null : next })
  }

  // ── Pairs save ────────────────────────────────────────────────────────────

  function savePairs() {
    const pairs = pairsInput
      .split(/[,\s]+/)
      .map(p => p.trim().toUpperCase())
      .filter(Boolean)
    save({ alert_pairs: pairs.length > 0 ? pairs : null })
  }

  // ── Push subscription toggle ──────────────────────────────────────────────

  async function togglePush() {
    if (!prefs) return

    if (!isPushSupported()) return

    if (prefs.has_subscription) {
      // Unsubscribe
      setPushState('unsubscribing')
      const ok = await unsubscribeFromPush()
      if (ok) setPrefs(p => p ? { ...p, has_subscription: false, push_enabled: false } : p)
      setPushState('idle')
    } else {
      // Subscribe
      if (permissionState === 'denied') return
      setPushState('subscribing')
      const sub = await subscribeToPush()
      setPermissionState(getPermissionState())
      if (sub) setPrefs(p => p ? { ...p, has_subscription: true, push_enabled: true } : p)
      setPushState('idle')
    }
  }

  // ── Test notification ─────────────────────────────────────────────────────

  async function sendTest() {
    setTestState('sending')
    setTestMessage('')
    try {
      const res  = await fetch('/api/alerts/test', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setTestState('ok')
        setTestMessage('Test notification sent to your device.')
      } else {
        setTestState('error')
        setTestMessage(data.error ?? 'Failed to send test.')
      }
    } catch {
      setTestState('error')
      setTestMessage('Network error. Try again.')
    }
    setTimeout(() => setTestState('idle'), 4000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    )
  }

  if (!prefs) return null

  const isSubscribed = prefs.has_subscription
  const isDenied     = permissionState === 'denied'
  const notSupported = !isPushSupported()

  const selectedMentors = prefs.alert_mentors ?? []
  const allMentors      = selectedMentors.length === 0
  const selectedSessions = prefs.alert_sessions ?? []
  const allSessions      = selectedSessions.length === 0

  return (
    <div style={{ maxWidth: 600 }}>

      {/* ── Push toggle ────────────────────────────────────────────────── */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        padding:      '16px 18px',
        background:   isSubscribed ? 'rgba(0,229,176,0.06)' : 'var(--card)',
        border:       `1px solid ${isSubscribed ? 'rgba(0,229,176,0.25)' : 'var(--border)'}`,
        borderRadius: 12,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width:          40,
            height:         40,
            borderRadius:   10,
            background:     isSubscribed ? 'rgba(0,229,176,0.15)' : 'rgba(107,127,163,0.1)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}>
            {isSubscribed
              ? <Bell size={18} color="#00e5b0" />
              : <BellOff size={18} color="var(--muted)" />
            }
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {isSubscribed ? 'Push notifications enabled' : 'Push notifications off'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
              {isDenied
                ? 'Blocked in browser settings. Update site permissions to re-enable.'
                : notSupported
                ? 'Your browser does not support push notifications.'
                : isSubscribed
                ? 'You\'ll be notified when setup conditions are met.'
                : 'Enable to get notified when A+ setups appear.'
              }
            </div>
          </div>
        </div>

        {/* Toggle button */}
        {!notSupported && !isDenied && (
          <button
            onClick={togglePush}
            disabled={pushState !== 'idle'}
            style={{
              padding:      '8px 18px',
              borderRadius: 8,
              border:       'none',
              background:   isSubscribed ? 'rgba(255,77,106,0.12)' : 'var(--accent)',
              color:        isSubscribed ? '#ff4d6a' : '#050810',
              fontSize:     13,
              fontWeight:   700,
              cursor:       pushState !== 'idle' ? 'not-allowed' : 'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              flexShrink:   0,
              transition:   'all 150ms',
            }}
          >
            {pushState !== 'idle' && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
            {isSubscribed ? 'Disable' : 'Enable'}
          </button>
        )}
        {isDenied && <Lock size={16} color="var(--muted)" />}
      </div>

      {/* ── Everything below is only useful if push is enabled ─────────── */}
      <div style={{ opacity: isSubscribed ? 1 : 0.45, pointerEvents: isSubscribed ? 'auto' : 'none', transition: 'opacity 200ms' }}>

        {/* ── Threshold ────────────────────────────────────────────────── */}
        <SectionLabel>Alert Threshold</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
          {THRESHOLDS.map(t => {
            const active = prefs.alert_threshold === t.value
            return (
              <button
                key={t.value}
                onClick={() => setThreshold(t.value)}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          12,
                  padding:      '12px 14px',
                  borderRadius: 10,
                  border:       `1px solid ${active ? t.colour + '55' : 'var(--border)'}`,
                  background:   active ? `${t.colour}10` : 'var(--card)',
                  cursor:       'pointer',
                  textAlign:    'left',
                  transition:   'all 150ms',
                }}
              >
                {/* Grade badge */}
                <span style={{
                  fontFamily:   '"IBM Plex Mono", monospace',
                  fontSize:     14,
                  fontWeight:   800,
                  color:        t.colour,
                  background:   `${t.colour}18`,
                  border:       `1px solid ${t.colour}33`,
                  borderRadius: 6,
                  padding:      '3px 10px',
                  minWidth:     52,
                  textAlign:    'center',
                }}>
                  {t.label.split(' ')[0]}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--dim)' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                    {t.desc}
                  </div>
                </div>
                {active && <CheckCircle2 size={16} color={t.colour} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>

        <Divider />

        {/* ── Mentors ──────────────────────────────────────────────────── */}
        <SectionLabel>Monitor Mentors</SectionLabel>

        {mentors.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 0 }}>
            Follow mentors to configure per-mentor alerts.
          </p>
        ) : (
          <>
            {/* All mentors toggle */}
            <button
              onClick={() => save({ alert_mentors: null })}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          8,
                marginBottom: 8,
                padding:      '8px 12px',
                borderRadius: 8,
                border:       `1px solid ${allMentors ? 'rgba(0,229,176,0.4)' : 'var(--border)'}`,
                background:   allMentors ? 'rgba(0,229,176,0.08)' : 'var(--card)',
                color:        allMentors ? 'var(--accent)' : 'var(--dim)',
                fontSize:     13,
                fontWeight:   600,
                cursor:       'pointer',
                width:        '100%',
                transition:   'all 150ms',
              }}
            >
              {allMentors
                ? <CheckCircle2 size={14} color="var(--accent)" />
                : <div style={{ width: 14, height: 14, borderRadius: 7, border: '1.5px solid var(--muted)' }} />
              }
              All followed mentors (recommended)
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mentors.map(m => {
                const selected = allMentors || selectedMentors.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMentor(m.id)}
                    style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        10,
                      padding:    '9px 12px',
                      borderRadius: 8,
                      border:     `1px solid ${selected && !allMentors ? 'var(--accent)44' : 'var(--border)'}`,
                      background: selected && !allMentors ? 'rgba(0,229,176,0.06)' : 'var(--surface)',
                      cursor:     'pointer',
                      textAlign:  'left',
                      opacity:    allMentors ? 0.5 : 1,
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{
                      width:          14,
                      height:         14,
                      borderRadius:   3,
                      border:         `1.5px solid ${selected && !allMentors ? 'var(--accent)' : 'var(--muted)'}`,
                      background:     selected && !allMentors ? 'var(--accent)' : 'transparent',
                      flexShrink:     0,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                    }}>
                      {selected && !allMentors && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="#050810" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 16 }}>{m.avatar_emoji}</span>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                        {m.display_name}
                        {m.verified && (
                          <span style={{
                            marginLeft:   5,
                            fontSize:     10,
                            color:        'var(--accent)',
                            fontWeight:   700,
                            background:   'rgba(0,229,176,0.12)',
                            padding:      '1px 5px',
                            borderRadius: 4,
                          }}>✓</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>@{m.handle}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <Divider />

        {/* ── Pairs ────────────────────────────────────────────────────── */}
        <SectionLabel>Monitor Pairs</SectionLabel>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
          Leave empty to use each mentor's preferred pairs.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={pairsInput}
            onChange={e => setPairsInput(e.target.value)}
            onBlur={savePairs}
            onKeyDown={e => e.key === 'Enter' && savePairs()}
            placeholder="EURUSD, GBPUSD, US30 (comma-separated)"
            style={{
              flex:         1,
              background:   'var(--surface)',
              border:       '1px solid var(--border)',
              borderRadius: 8,
              padding:      '9px 12px',
              color:        'var(--text)',
              fontSize:     13,
              fontFamily:   '"IBM Plex Mono", monospace',
              outline:      'none',
            }}
          />
          {pairsInput && (
            <button
              onClick={() => { setPairsInput(''); save({ alert_pairs: null }) }}
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 8,
                padding:      '0 12px',
                color:        'var(--muted)',
                cursor:       'pointer',
              }}
            >
              <XCircle size={14} />
            </button>
          )}
        </div>

        <Divider />

        {/* ── Sessions ─────────────────────────────────────────────────── */}
        <SectionLabel>Trading Sessions</SectionLabel>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
          Only alert during selected sessions. Leave all unselected for 24/7 alerts.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {SESSIONS.map(s => {
            const active = allSessions || selectedSessions.includes(s.value)
            return (
              <button
                key={s.value}
                onClick={() => toggleSession(s.value)}
                style={{
                  padding:      '10px 14px',
                  borderRadius: 8,
                  border:       `1px solid ${active && !allSessions ? 'var(--accent)44' : 'var(--border)'}`,
                  background:   active && !allSessions ? 'rgba(0,229,176,0.07)' : 'var(--surface)',
                  cursor:       'pointer',
                  textAlign:    'left',
                  transition:   'all 150ms',
                }}
              >
                <div style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         7,
                  fontSize:    13,
                  fontWeight:  600,
                  color:       active && !allSessions ? 'var(--text)' : 'var(--dim)',
                  marginBottom: 2,
                }}>
                  {active && !allSessions
                    ? <CheckCircle2 size={13} color="var(--accent)" />
                    : <div style={{ width: 13, height: 13, borderRadius: 7, border: '1.5px solid var(--muted)' }} />
                  }
                  {s.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: '"IBM Plex Mono", monospace', paddingLeft: 20 }}>
                  {s.hours}
                </div>
              </button>
            )
          })}
        </div>

        <Divider />

        {/* ── Quiet hours ──────────────────────────────────────────────── */}
        <SectionLabel>Quiet Hours</SectionLabel>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
          No alerts will be sent during this window. Leave blank to disable.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>From</div>
            <input
              type="time"
              value={prefs.quiet_hours_start ?? ''}
              onChange={e => save({ quiet_hours_start: e.target.value || null })}
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 8,
                padding:      '8px 12px',
                color:        'var(--text)',
                fontSize:     14,
                fontFamily:   '"IBM Plex Mono", monospace',
                outline:      'none',
                colorScheme:  'dark',
              }}
            />
          </div>
          <div style={{ color: 'var(--muted)', marginTop: 18 }}>→</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>To</div>
            <input
              type="time"
              value={prefs.quiet_hours_end ?? ''}
              onChange={e => save({ quiet_hours_end: e.target.value || null })}
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 8,
                padding:      '8px 12px',
                color:        'var(--text)',
                fontSize:     14,
                fontFamily:   '"IBM Plex Mono", monospace',
                outline:      'none',
                colorScheme:  'dark',
              }}
            />
          </div>
          {(prefs.quiet_hours_start || prefs.quiet_hours_end) && (
            <button
              onClick={() => save({ quiet_hours_start: null, quiet_hours_end: null })}
              style={{
                background:   'none',
                border:       'none',
                cursor:       'pointer',
                color:        'var(--muted)',
                marginTop:    18,
                padding:      4,
                display:      'flex',
              }}
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        <Divider />

        {/* ── Test notification ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
              Test Notification
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Send a test push to confirm alerts are working.
            </div>
          </div>
          <button
            onClick={sendTest}
            disabled={testState === 'sending' || !prefs.has_subscription}
            style={{
              padding:      '9px 18px',
              borderRadius: 8,
              border:       '1px solid var(--border)',
              background:   'var(--surface)',
              color:        testState === 'ok'    ? '#00e5b0'
                          : testState === 'error' ? '#ff4d6a'
                          : 'var(--dim)',
              fontSize:     13,
              fontWeight:   600,
              cursor:       testState === 'sending' || !prefs.has_subscription ? 'not-allowed' : 'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:          7,
              flexShrink:   0,
              transition:   'all 150ms',
            }}
          >
            {testState === 'sending' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
             : testState === 'ok'    ? <CheckCircle2 size={14} />
             : testState === 'error' ? <XCircle size={14} />
             : <Send size={14} />
            }
            {testState === 'sending' ? 'Sending…'
             : testState === 'ok'    ? 'Sent!'
             : testState === 'error' ? 'Failed'
             : 'Send Test'
            }
          </button>
        </div>

        {/* Test message */}
        <AnimatePresence>
          {testMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop:    10,
                padding:      '9px 12px',
                borderRadius: 8,
                background:   testState === 'error' ? 'rgba(255,77,106,0.08)' : 'rgba(0,229,176,0.08)',
                border:       `1px solid ${testState === 'error' ? 'rgba(255,77,106,0.25)' : 'rgba(0,229,176,0.25)'}`,
                fontSize:     12,
                color:        testState === 'error' ? '#ff4d6a' : '#00e5b0',
              }}
            >
              {testMessage}
            </motion.div>
          )}
        </AnimatePresence>

      </div>{/* end gated section */}

      {/* ── Info footer ──────────────────────────────────────────────────── */}
      <div style={{
        marginTop:  20,
        display:    'flex',
        gap:        8,
        padding:    '10px 12px',
        borderRadius: 8,
        background: 'var(--surface)',
        border:     '1px solid var(--border)',
      }}>
        <Info size={14} color="var(--muted)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          Alerts are capped at 10/hour. The same setup won't re-alert within 30 minutes.
          Alerts are Pro-only. Stop chart staring — walk away until your setup is ready.
        </p>
      </div>

      {/* ── Save toast ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            style={{
              position:     'fixed',
              bottom:       24,
              right:        24,
              padding:      '10px 18px',
              borderRadius: 10,
              background:   'var(--card)',
              border:       '1px solid rgba(0,229,176,0.3)',
              color:        'var(--accent)',
              fontSize:     13,
              fontWeight:   600,
              display:      'flex',
              alignItems:   'center',
              gap:          7,
              boxShadow:    '0 8px 24px rgba(0,0,0,0.4)',
              zIndex:       9999,
            }}
          >
            <CheckCircle2 size={14} />
            Preferences saved
            {saving && <Loader2 size={12} style={{ opacity: 0.5, marginLeft: 4, animation: 'spin 1s linear infinite' }} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
