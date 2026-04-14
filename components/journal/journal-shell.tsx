'use client'

// components/journal/journal-shell.tsx
// Interactive journal shell — filters, form toggle, entry list, insights panel.

import { useState, useCallback, useRef }  from 'react'
import { motion, AnimatePresence }         from 'framer-motion'
import { Plus, Filter, Brain, BookOpen, X, ChevronDown } from 'lucide-react'

import type { JournalEntryData }  from './journal-entry'
import { JournalEntry }           from './journal-entry'
import { JournalForm }            from './journal-form'
import { JournalStats }           from './journal-stats'
import { PsychologyInsights }     from './psychology-insights'
import type { MentorPlaybookOption } from '@/app/(platform)/journal/page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalShellProps {
  initialEntries:    JournalEntryData[]
  followedPlaybooks: MentorPlaybookOption[]
}

type ActiveTab = 'journal' | 'insights'

const OUTCOMES  = ['', 'win', 'loss', 'breakeven', 'pending']   as const
const GRADES    = ['', 'A+', 'B+', 'C+', 'D+']                  as const
const EMOTIONS  = ['', 'Calm', 'Conviction', 'FOMO', 'Revenge', 'Boredom'] as const
const OVERRIDES = ['', 'true', 'false']                           as const

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  options:  readonly string[]
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background:   'var(--card)',
          border:       `1px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 7,
          padding:      '6px 28px 6px 10px',
          color:        value ? 'var(--accent)' : 'var(--dim)',
          fontSize:     12,
          fontWeight:   600,
          outline:      'none',
          cursor:       'pointer',
          appearance:   'none',
          minWidth:     90,
        }}
      >
        <option value="">{label}</option>
        {options.filter(o => o !== '').map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: value ? 'var(--accent)' : 'var(--muted)', pointerEvents: 'none' }} />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JournalShell({ initialEntries, followedPlaybooks }: JournalShellProps) {
  const [entries,     setEntries]     = useState<JournalEntryData[]>(initialEntries)
  const [activeTab,   setActiveTab]   = useState<ActiveTab>('journal')
  const [showForm,    setShowForm]    = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(initialEntries.length === 25)

  // Filters
  const [filterOutcome,  setFilterOutcome]  = useState('')
  const [filterGrade,    setFilterGrade]    = useState('')
  const [filterEmotion,  setFilterEmotion]  = useState('')
  const [filterOverride, setFilterOverride] = useState('')
  const [filterPair,     setFilterPair]     = useState('')

  const activeFilterCount = [filterOutcome, filterGrade, filterEmotion, filterOverride, filterPair].filter(Boolean).length

  // Apply client-side filters to already-loaded entries
  const filtered = entries.filter(e => {
    if (filterOutcome  && e.outcome !== filterOutcome) return false
    if (filterGrade    && e.setup_grade !== filterGrade) return false
    if (filterEmotion  && e.pre_trade_emotion !== filterEmotion) return false
    if (filterOverride !== '' && String(e.grade_override) !== filterOverride) return false
    if (filterPair     && !e.pair.includes(filterPair.toUpperCase())) return false
    return true
  })

  function clearFilters() {
    setFilterOutcome('')
    setFilterGrade('')
    setFilterEmotion('')
    setFilterOverride('')
    setFilterPair('')
  }

  async function loadMore() {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/journal?page=${nextPage}&limit=25`)
      if (!res.ok) return
      const data = await res.json()
      setEntries(prev => [...prev, ...data.entries])
      setPage(nextPage)
      setHasMore(data.entries.length === 25)
    } finally {
      setLoading(false)
    }
  }

  function handleNewEntry(entry: { id: string }) {
    // Reload the first entry from the API
    fetch(`/api/journal?limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data.entries?.[0]) {
          setEntries(prev => [data.entries[0], ...prev])
        }
      })
      .catch(() => {/* non-critical */})
    setShowForm(false)
  }

  const isFiltered = activeFilterCount > 0

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 60px' }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin:      0,
          fontSize:    28,
          fontWeight:  800,
          color:       'var(--text)',
          letterSpacing: '-0.02em',
        }}>
          Trade Journal
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--dim)' }}>
          Every trade. Every emotion. Every pattern — surfaced automatically.
        </p>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <JournalStats entries={entries} />
        </div>
      )}

      {/* ── Tab bar + actions ────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   16,
        flexWrap:       'wrap',
        gap:            10,
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', borderRadius: 8, padding: 3 }}>
          {(['journal', 'insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding:      '7px 16px',
                borderRadius: 6,
                border:       'none',
                cursor:       'pointer',
                fontSize:     13,
                fontWeight:   600,
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                background:   activeTab === tab ? 'var(--card)' : 'transparent',
                color:        activeTab === tab ? 'var(--text)' : 'var(--muted)',
                transition:   'all 150ms',
              }}
            >
              {tab === 'journal'
                ? <><BookOpen size={13} /> Journal</>
                : <><Brain size={13} /> Psychology</>
              }
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'journal' && (
            <button
              onClick={() => setShowFilters(s => !s)}
              style={{
                padding:      '7px 14px',
                borderRadius: 8,
                border:       `1px solid ${showFilters || activeFilterCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
                background:   showFilters ? 'rgba(0,229,176,0.08)' : 'var(--surface)',
                color:        showFilters || activeFilterCount > 0 ? 'var(--accent)' : 'var(--dim)',
                fontSize:     13,
                fontWeight:   600,
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                gap:          6,
              }}
            >
              <Filter size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span style={{
                  background:   'var(--accent)',
                  color:        '#050810',
                  borderRadius: 10,
                  fontSize:     10,
                  fontWeight:   800,
                  padding:      '1px 6px',
                  lineHeight:   1.6,
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setShowForm(s => !s)}
            style={{
              padding:      '7px 16px',
              borderRadius: 8,
              border:       'none',
              background:   showForm ? 'var(--surface)' : 'var(--accent)',
              color:        showForm ? 'var(--dim)' : '#050810',
              fontSize:     13,
              fontWeight:   700,
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              transition:   'all 150ms',
            }}
          >
            {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Log Trade</>}
          </button>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && activeTab === 'journal' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden', marginBottom: 14 }}
          >
            <div style={{
              display:      'flex',
              gap:          8,
              flexWrap:     'wrap',
              padding:      '12px 14px',
              background:   'var(--card)',
              borderRadius: 10,
              border:       '1px solid var(--border)',
              alignItems:   'center',
            }}>
              <input
                value={filterPair}
                onChange={e => setFilterPair(e.target.value)}
                placeholder="Pair (e.g. EURUSD)"
                style={{
                  background:   'var(--surface)',
                  border:       `1px solid ${filterPair ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 7,
                  padding:      '6px 10px',
                  color:        'var(--text)',
                  fontSize:     12,
                  fontFamily:   '"IBM Plex Mono", monospace',
                  outline:      'none',
                  width:        140,
                }}
              />

              <FilterSelect label="Outcome"  value={filterOutcome}  onChange={setFilterOutcome}  options={OUTCOMES}  />
              <FilterSelect label="Grade"    value={filterGrade}    onChange={setFilterGrade}    options={GRADES}    />
              <FilterSelect label="Emotion"  value={filterEmotion}  onChange={setFilterEmotion}  options={EMOTIONS}  />
              <FilterSelect
                label="Override"
                value={filterOverride}
                onChange={setFilterOverride}
                options={OVERRIDES}
              />

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{
                    background:   'none',
                    border:       'none',
                    cursor:       'pointer',
                    color:        'var(--muted)',
                    fontSize:     12,
                    fontWeight:   600,
                    display:      'flex',
                    alignItems:   'center',
                    gap:          4,
                    marginLeft:   4,
                  }}
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ marginBottom: 16 }}
          >
            <JournalForm
              followedPlaybooks={followedPlaybooks}
              onSuccess={handleNewEntry}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {activeTab === 'journal' ? (
        <>
          {filtered.length === 0 ? (
            <div style={{
              padding:    '48px 0',
              textAlign:  'center',
              color:      'var(--muted)',
            }}>
              <BookOpen size={32} style={{ opacity: 0.2, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              {isFiltered ? (
                <>
                  <p style={{ margin: 0, fontSize: 14 }}>No trades match these filters.</p>
                  <button onClick={clearFilters} style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 14 }}>No trades logged yet.</p>
                  <p style={{ margin: '6px 0 0', fontSize: 12 }}>
                    Log your first trade to start tracking your psychology.
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    style={{
                      marginTop:    14,
                      padding:      '8px 20px',
                      background:   'var(--accent)',
                      border:       'none',
                      borderRadius: 8,
                      color:        '#050810',
                      fontSize:     13,
                      fontWeight:   700,
                      cursor:       'pointer',
                    }}
                  >
                    Log your first trade
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence mode="popLayout">
                {filtered.map(entry => (
                  <JournalEntry key={entry.id} entry={entry} />
                ))}
              </AnimatePresence>

              {/* Load more */}
              {hasMore && !isFiltered && (
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    style={{
                      padding:      '9px 24px',
                      borderRadius: 8,
                      border:       '1px solid var(--border)',
                      background:   'var(--surface)',
                      color:        loading ? 'var(--muted)' : 'var(--dim)',
                      fontSize:     13,
                      cursor:       loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Insights tab */
        <div style={{
          background:   'var(--card)',
          border:       '1px solid var(--border)',
          borderRadius: 12,
          padding:      '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Brain size={18} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Psychology Patterns
            </h2>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>
            Based on your {entries.filter(e => e.outcome !== 'pending').length} closed trades. Patterns update automatically as you log more.
          </p>
          <PsychologyInsights entries={entries} />
        </div>
      )}

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <p style={{ marginTop: 32, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        Not financial advice. Trading carries substantial risk. Past performance does not indicate future results.
      </p>
    </main>
  )
}
