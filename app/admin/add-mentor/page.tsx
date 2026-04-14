'use client'

// app/admin/add-mentor/page.tsx
// Admin page to add a new unverified mentor + generate an AI draft playbook.
//
// Flow:
//   Step 1: Fill in mentor details form
//   Step 2: "Generate AI Playbook" → calls /api/playbooks/extract (Claude + web search)
//   Step 3: Shows playbook preview with section summaries
//   Step 4: "Publish as AI Draft" → calls /api/admin/add-mentor to create DB records
//   Step 5: Redirects to /admin/pipeline

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import {
  Loader2, Sparkles, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Users,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedPlaybook {
  strategy_name:     string
  summary:           string | null
  timeframes:        string[]
  session_preference: string | null
  core_concepts:     string[]
  entry_rules:       string[]
  exit_rules:        string[]
  indicators:        string[]
  golden_rules:      string[]
  common_mistakes:   string[]
  preferred_pairs:   string[]
  risk_management:   Record<string, number | null>
  checklist:         Array<{
    id: string; item: string; category: string
    weight: number; auto: boolean; evalKey: string | null
  }>
}

// ─── Market options ───────────────────────────────────────────────────────────

const MARKET_OPTIONS = [
  'Forex', 'Indices', 'Gold / XAU', 'Crypto', 'Oil / Commodities',
  'US Stocks', 'UK Stocks', 'Futures',
]

// ─── PlaybookPreview ──────────────────────────────────────────────────────────

function PlaybookPreview({ pb }: { pb: ExtractedPlaybook }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const sections: { key: string; label: string; items: string[] }[] = [
    { key: 'core_concepts',   label: 'Core Concepts',   items: pb.core_concepts   },
    { key: 'entry_rules',     label: 'Entry Rules',     items: pb.entry_rules     },
    { key: 'exit_rules',      label: 'Exit Rules',      items: pb.exit_rules      },
    { key: 'golden_rules',    label: 'Golden Rules',    items: pb.golden_rules    },
    { key: 'common_mistakes', label: 'Common Mistakes', items: pb.common_mistakes },
    { key: 'indicators',      label: 'Indicators',      items: pb.indicators      },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Overview */}
      <div className="rounded-2xl px-5 py-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-base font-bold text-text mb-1" style={{ letterSpacing: '-0.02em' }}>
          {pb.strategy_name}
        </p>
        {pb.summary && (
          <p className="text-sm text-dim leading-relaxed mb-3">{pb.summary}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {pb.timeframes.map(tf => (
            <span key={tf} className="text-2xs font-mono px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)', color: 'var(--accent)' }}
            >{tf}</span>
          ))}
          {pb.preferred_pairs.map(p => (
            <span key={p} className="text-2xs font-mono px-2 py-0.5 rounded"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: 'var(--gold)' }}
            >{p}</span>
          ))}
          {pb.session_preference && (
            <span className="text-2xs font-mono px-2 py-0.5 rounded"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--dim)' }}
            >{pb.session_preference}</span>
          )}
        </div>
      </div>

      {/* Checklist summary */}
      <div className="rounded-2xl px-5 py-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-bold text-text mb-2">Checklist ({pb.checklist.length} items)</p>
        <div className="flex flex-col gap-1.5">
          {pb.checklist.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center gap-2 text-xs text-dim">
              <span style={{ color: item.auto ? 'var(--accent)' : 'var(--muted)', fontSize: 10 }}>
                {item.auto ? '⚡' : '✋'}
              </span>
              <span className="flex-1 leading-relaxed">{item.item}</span>
              <span className="text-2xs font-mono text-muted flex-shrink-0">w{item.weight}</span>
            </div>
          ))}
          {pb.checklist.length > 5 && (
            <p className="text-2xs font-mono text-muted">+ {pb.checklist.length - 5} more items</p>
          )}
        </div>
      </div>

      {/* Collapsible sections */}
      {sections.filter(s => s.items.length > 0).map(section => (
        <div key={section.key} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={() => setExpanded(expanded === section.key ? null : section.key)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-text"
          >
            <span>{section.label} <span className="font-normal text-muted">({section.items.length})</span></span>
            {expanded === section.key ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded === section.key && (
            <ul className="px-5 pb-3 flex flex-col gap-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="text-xs text-dim flex gap-2">
                  <span className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-2xs font-mono"
                    style={{ background: 'var(--card)', color: 'var(--muted)' }}
                  >{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddMentorPage() {
  const router = useRouter()

  // Step state
  const [step, setStep] = useState<'form' | 'extracting' | 'preview' | 'publishing' | 'done'>('form')
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [mentorName,   setMentorName]   = useState('')
  const [handle,       setHandle]       = useState('')
  const [markets,      setMarkets]      = useState<string[]>([])
  const [style,        setStyle]        = useState('')
  const [bio,          setBio]          = useState('')
  const [contactInfo,  setContactInfo]  = useState('')
  const [extFollowers, setExtFollowers] = useState('')
  const [avatarEmoji,  setAvatarEmoji]  = useState('🎯')

  // Extracted playbook
  const [playbook, setPlaybook] = useState<ExtractedPlaybook | null>(null)
  // Final IDs after publish
  const [createdMentorId, setCreatedMentorId] = useState<string | null>(null)

  function toggleMarket(m: string) {
    setMarkets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  async function handleExtract() {
    if (!mentorName.trim() || !handle.trim() || markets.length === 0) {
      setError('Name, handle, and at least one market are required')
      return
    }
    setError(null)
    setStep('extracting')

    try {
      const res = await fetch('/api/playbooks/extract', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mentor_name: mentorName.trim(),
          handle:      handle.trim().replace(/^@/, ''),
          markets,
          style:       style.trim() || null,
        }),
      })
      const data = await res.json() as { playbook?: ExtractedPlaybook; error?: string }
      if (!res.ok || !data.playbook) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setPlaybook(data.playbook)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed')
      setStep('form')
    }
  }

  async function handlePublish() {
    if (!playbook) return
    setError(null)
    setStep('publishing')

    try {
      const res = await fetch('/api/admin/add-mentor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mentor_name:        mentorName.trim(),
          handle:             handle.trim().replace(/^@/, ''),
          markets,
          style:              style.trim() || null,
          bio:                bio.trim() || null,
          contact_info:       contactInfo.trim() || null,
          avatar_emoji:       avatarEmoji,
          external_followers: extFollowers.trim() || null,
          playbook,
        }),
      })
      const data = await res.json() as { mentor_id?: string; playbook_id?: string; error?: string }
      if (!res.ok || !data.mentor_id) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setCreatedMentorId(data.mentor_id)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
      setStep('preview')
    }
  }

  // ── Done state ────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto">
        <div className="rounded-2xl px-6 py-10 text-center"
          style={{ background: 'var(--card)', border: '1px solid rgba(0,229,176,0.2)', borderTop: '2px solid var(--accent)' }}
        >
          <CheckCircle2 size={40} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
          <p className="text-xl font-bold text-text mb-2" style={{ letterSpacing: '-0.02em' }}>
            Mentor Added Successfully
          </p>
          <p className="text-sm text-dim mb-6 leading-relaxed">
            <strong className="text-text">{mentorName}</strong>&apos;s AI-extracted playbook is now live as a draft.
            Followers can discover their playbook immediately. Usage and escrow accrual begin now.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/pipeline')}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', cursor: 'pointer' }}
            >
              View Pipeline
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('form'); setPlaybook(null); setMentorName(''); setHandle('')
                setMarkets([]); setStyle(''); setBio(''); setContactInfo(''); setExtFollowers('')
                setAvatarEmoji('🎯'); setCreatedMentorId(null)
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              Add Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-1" style={{ letterSpacing: '-0.03em' }}>
          Add Mentor
        </h1>
        <p className="text-sm text-muted">
          Enter the mentor&apos;s details, then generate an AI-extracted playbook from their public content.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6 text-xs font-mono">
        {(['form', 'extracting', 'preview', 'publishing'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted">›</span>}
            <span style={{
              color: s === step ? 'var(--accent)' : (
                ['form','extracting','preview','publishing'].indexOf(step) > i ? 'var(--dim)' : 'var(--muted)'
              ),
              fontWeight: s === step ? 700 : 400,
            }}>
              {s === 'form' ? '1. Details' : s === 'extracting' ? '2. Extracting' : s === 'preview' ? '3. Preview' : '4. Publish'}
            </span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm"
          style={{ background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--danger)' }}
        >
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── EXTRACTING STATE ─────────────────────────────────────────────── */}
      {step === 'extracting' && (
        <div className="rounded-2xl px-6 py-12 text-center"
          style={{ background: 'var(--card)', border: '1px solid rgba(0,229,176,0.15)' }}
        >
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <p className="text-base font-bold text-text mb-1">Extracting {mentorName}&apos;s strategy…</p>
          <p className="text-sm text-muted">
            Claude is searching YouTube, Twitter, TikTok, and trading forums for public content.
            This takes 30–60 seconds.
          </p>
        </div>
      )}

      {/* ── PUBLISHING STATE ─────────────────────────────────────────────── */}
      {step === 'publishing' && (
        <div className="rounded-2xl px-6 py-12 text-center"
          style={{ background: 'var(--card)', border: '1px solid rgba(0,229,176,0.15)' }}
        >
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <p className="text-base font-bold text-text mb-1">Publishing AI draft…</p>
          <p className="text-sm text-muted">Creating mentor profile, playbook, and escrow record.</p>
        </div>
      )}

      {/* ── DETAILS FORM ─────────────────────────────────────────────────── */}
      {step === 'form' && (
        <div className="flex flex-col gap-5">
          {/* Basic info */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-bold text-text">Mentor Details</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted">Display Name *</label>
                  <input type="text" value={mentorName} onChange={e => setMentorName(e.target.value)}
                    placeholder="Alex G"
                    className="rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted">Handle / Username *</label>
                  <input type="text" value={handle} onChange={e => setHandle(e.target.value)}
                    placeholder="@alexg_trades"
                    className="rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted">Avatar Emoji</label>
                  <input type="text" value={avatarEmoji} onChange={e => setAvatarEmoji(e.target.value)}
                    maxLength={4} placeholder="🎯"
                    className="rounded-xl text-sm focus:outline-none text-center"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px', fontSize: 20 }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted">Trading Style</label>
                  <input type="text" value={style} onChange={e => setStyle(e.target.value)}
                    placeholder="Smart Money Concepts, ICT, Price Action…"
                    className="rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
              </div>

              {/* Markets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Markets *</label>
                <div className="flex flex-wrap gap-1.5">
                  {MARKET_OPTIONS.map(m => {
                    const active = markets.includes(m)
                    return (
                      <button key={m} type="button" onClick={() => toggleMarket(m)}
                        className="text-xs font-mono px-2.5 py-1 rounded-lg transition-all duration-100"
                        style={active ? {
                          background: 'rgba(0,229,176,0.12)', border: '1px solid rgba(0,229,176,0.3)',
                          color: 'var(--accent)', cursor: 'pointer',
                        } : {
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          color: 'var(--dim)', cursor: 'pointer',
                        }}
                      >{m}</button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Outreach info */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-bold text-text">Outreach Info</span>
              <span className="text-xs text-muted ml-2">(internal, not shown to traders)</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted">Contact Info</label>
                  <input type="text" value={contactInfo} onChange={e => setContactInfo(e.target.value)}
                    placeholder="email / Twitter DM / YouTube"
                    className="rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted">External Following</label>
                  <input type="text" value={extFollowers} onChange={e => setExtFollowers(e.target.value)}
                    placeholder="e.g. 120k YouTube, 45k Twitter"
                    className="rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Bio / Notes</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)}
                  rows={2} maxLength={2000}
                  placeholder="Any notes about this mentor for the team…"
                  className="rounded-xl text-sm focus:outline-none resize-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleExtract}
            disabled={!mentorName.trim() || !handle.trim() || markets.length === 0}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-bold w-full transition-all duration-150"
            style={{
              background: (!mentorName.trim() || !handle.trim() || markets.length === 0)
                ? 'var(--surface)' : 'var(--accent)',
              color: (!mentorName.trim() || !handle.trim() || markets.length === 0)
                ? 'var(--muted)' : 'var(--bg)',
              border: 'none',
              cursor: (!mentorName.trim() || !handle.trim() || markets.length === 0)
                ? 'not-allowed' : 'pointer',
            }}
          >
            <Sparkles size={18} aria-hidden="true" />
            Generate AI Playbook
          </button>
        </div>
      )}

      {/* ── PLAYBOOK PREVIEW ─────────────────────────────────────────────── */}
      {step === 'preview' && playbook && (
        <div className="flex flex-col gap-5">
          {/* AI banner */}
          <div className="flex items-start gap-3 rounded-2xl px-4 py-3"
            style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.2)' }}
          >
            <Sparkles size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-bold text-text">AI Extraction Complete</p>
              <p className="text-xs text-muted mt-0.5">
                Claude researched {mentorName}&apos;s public content and extracted the playbook below.
                Review it before publishing — the mentor can edit it after claiming their account.
              </p>
            </div>
          </div>

          <PlaybookPreview pb={playbook} />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={() => setStep('form')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >← Back</button>
            <button type="button" onClick={handleExtract}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer' }}
            >
              <Sparkles size={13} /> Re-extract
            </button>
            <button type="button" onClick={handlePublish}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', cursor: 'pointer' }}
            >
              <Users size={15} /> Publish as AI Draft
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
