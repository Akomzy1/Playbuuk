'use client'

// components/marketplace/mentor-grid.tsx
// Filterable, searchable mentor grid.
//
// Grid layout: 1-col mobile → 2-col sm → 3-col lg
// Staggered entrance: animate-fade-up with 50ms delay per card
// Loading: shimmer skeleton cards (same aspect ratio as real cards)
// Empty state: psychology-framed copy
//
// Props:
//   followedIds    — SSR-resolved set of mentor IDs the user follows
//   verifiedOnly   — if true, presets verified=true and hides the status filter
//   headingId      — optional id for the section heading (anchor scrolling)

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { MentorCard, type MentorCardData } from './mentor-card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Filters {
  search: string
  market: string
  style: string
  verified: string
  sort: string
}

export interface MentorGridProps {
  followedIds: Set<string>
  /** Lock the grid to verified mentors only (hides status filter) */
  verifiedOnly?: boolean
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        minHeight: '340px',
      }}
      aria-hidden="true"
    >
      {/* Avatar area */}
      <div className="flex flex-col items-center gap-2 pt-6 pb-4 px-5">
        <div
          className="w-16 h-16 rounded-2xl skeleton"
          style={{ background: 'var(--surface)' }}
        />
        <div className="w-16 h-4 rounded-full skeleton" style={{ background: 'var(--surface)' }} />
        <div className="w-28 h-5 rounded skeleton" style={{ background: 'var(--surface)' }} />
        <div className="w-16 h-3 rounded skeleton" style={{ background: 'var(--surface)' }} />
      </div>
      {/* Stat row */}
      <div className="mx-5 mb-4 h-10 rounded-xl skeleton" style={{ background: 'var(--surface)' }} />
      {/* Content */}
      <div className="px-5 flex flex-col gap-2 mb-4">
        <div className="h-3 w-full rounded skeleton" style={{ background: 'var(--surface)' }} />
        <div className="h-3 w-4/5 rounded skeleton" style={{ background: 'var(--surface)' }} />
        <div className="flex gap-1.5 mt-1">
          <div className="h-5 w-12 rounded-full skeleton" style={{ background: 'var(--surface)' }} />
          <div className="h-5 w-16 rounded-full skeleton" style={{ background: 'var(--surface)' }} />
        </div>
      </div>
      {/* Button */}
      <div className="px-4 pb-4">
        <div className="h-9 w-full rounded-xl skeleton" style={{ background: 'var(--surface)' }} />
      </div>
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKETS = ['forex', 'crypto', 'indices', 'commodities', 'stocks']
const STYLES  = ['swing', 'scalp', 'position', 'day', 'intraday']
const SORTS   = [
  { value: 'followers', label: 'Most Followed' },
  { value: 'rating',    label: 'Highest Rated' },
  { value: 'newest',    label: 'Newest' },
]

// ─── FilterBar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  total: number
  loading: boolean
  verifiedOnly: boolean
}

function FilterBar({ filters, onChange, total, loading, verifiedOnly }: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const hasActiveFilters =
    filters.market ||
    filters.style ||
    (!verifiedOnly && filters.verified) ||
    filters.sort !== 'followers'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted)' }}
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search by name or handle…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full pl-8 pr-8 py-2 text-sm rounded-xl outline-none transition-all duration-150"
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,229,176,0.35)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.05)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = ''
            }}
            aria-label="Search mentors"
          />
          {filters.search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => onChange({ search: '' })}
              aria-label="Clear search"
            >
              <X size={12} style={{ color: 'var(--muted)' }} />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className="py-2 pl-3 pr-8 text-sm rounded-xl outline-none cursor-pointer transition-all duration-150"
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border)',
            color: 'var(--dim)',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7fa3' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.6rem center',
          }}
          aria-label="Sort mentors"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value} style={{ background: 'var(--surface)' }}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Filters toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
          style={{
            background: hasActiveFilters ? 'rgba(0,229,176,0.08)' : 'rgba(0,0,0,0.25)',
            border: `1px solid ${hasActiveFilters ? 'rgba(0,229,176,0.25)' : 'var(--border)'}`,
            color: hasActiveFilters ? 'var(--accent)' : 'var(--dim)',
          }}
          aria-expanded={open}
          aria-label={open ? 'Close filters' : 'Open filters'}
        >
          <SlidersHorizontal size={13} aria-hidden="true" />
          Filters
          {hasActiveFilters && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-subtle"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </button>

        {/* Result count */}
        {!loading && (
          <span className="text-xs text-muted font-mono ml-auto tabular-nums" aria-live="polite">
            {total > 0 ? `${total.toLocaleString()} mentor${total !== 1 ? 's' : ''}` : ''}
          </span>
        )}
      </div>

      {/* Expanded filter panel */}
      {open && (
        <div
          className="flex flex-wrap gap-4 p-4 rounded-xl animate-slide-down"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Market */}
          <div className="flex flex-col gap-2 min-w-0">
            <p className="text-2xs font-semibold text-muted uppercase tracking-widest">Market</p>
            <div className="flex flex-wrap gap-1.5">
              {MARKETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange({ market: filters.market === m ? '' : m })}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition-all duration-150"
                  style={{
                    background: filters.market === m ? 'rgba(34,211,238,0.12)' : 'transparent',
                    border: `1px solid ${filters.market === m ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                    color: filters.market === m ? 'var(--cyan)' : 'var(--dim)',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="flex flex-col gap-2 min-w-0">
            <p className="text-2xs font-semibold text-muted uppercase tracking-widest">Style</p>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ style: filters.style === s ? '' : s })}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition-all duration-150"
                  style={{
                    background: filters.style === s ? 'rgba(167,139,250,0.12)' : 'transparent',
                    border: `1px solid ${filters.style === s ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                    color: filters.style === s ? 'var(--purple)' : 'var(--dim)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status — hidden when verifiedOnly */}
          {!verifiedOnly && (
            <div className="flex flex-col gap-2">
              <p className="text-2xs font-semibold text-muted uppercase tracking-widest">Status</p>
              <div className="flex gap-1.5">
                {[
                  { value: 'true', label: '✓ Verified' },
                  { value: 'false', label: 'Drafts' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ verified: filters.verified === opt.value ? '' : opt.value })}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono transition-all duration-150"
                    style={{
                      background: filters.verified === opt.value ? 'rgba(0,229,176,0.1)' : 'transparent',
                      border: `1px solid ${filters.verified === opt.value ? 'rgba(0,229,176,0.28)' : 'var(--border)'}`,
                      color: filters.verified === opt.value ? 'var(--accent)' : 'var(--dim)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange({ market: '', style: '', verified: verifiedOnly ? 'true' : '', sort: 'followers' })}
              className="self-end flex items-center gap-1 text-xs text-muted hover:text-dim transition-colors ml-auto"
            >
              <X size={11} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MentorGrid ───────────────────────────────────────────────────────────────

export function MentorGrid({ followedIds, verifiedOnly = false }: MentorGridProps) {
  const [mentors, setMentors] = useState<MentorCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [filters, setFilters] = useState<Filters>({
    search: '',
    market: '',
    style: '',
    verified: verifiedOnly ? 'true' : '',
    sort: 'followers',
  })

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch }
      if ('search' in patch) {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(
          () => setDebouncedSearch(patch.search ?? ''),
          300,
        )
      }
      return next
    })
    if (!('search' in patch)) setPage(1)
  }, [])

  useEffect(() => { setPage(1) }, [
    debouncedSearch, filters.market, filters.style, filters.verified, filters.sort,
  ])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams()
    if (debouncedSearch)  params.set('search',   debouncedSearch)
    if (filters.market)   params.set('market',   filters.market)
    if (filters.style)    params.set('style',    filters.style)
    if (filters.verified) params.set('verified', filters.verified)
    params.set('sort',  filters.sort)
    params.set('page',  String(page))
    params.set('limit', '12')

    fetch(`/api/mentors?${params}`)
      .then((r) => r.json())
      .then((data: { mentors: MentorCardData[]; total: number; totalPages: number }) => {
        if (cancelled) return
        const cards = (data.mentors ?? []).map((m) => ({
          ...m,
          initialFollowing: followedIds.has(m.id),
        }))
        setMentors(cards)
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedSearch, filters.market, filters.style, filters.verified, filters.sort, page, followedIds])

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        total={total}
        loading={loading}
        verifiedOnly={verifiedOnly}
      />

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      {loading ? (
        /* Skeleton */
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          aria-busy="true"
          aria-label="Loading mentors"
        >
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>

      ) : mentors.length === 0 ? (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl text-center"
          style={{ border: '1px dashed rgba(107,127,163,0.25)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            aria-hidden="true"
          >
            🔍
          </div>
          <h3 className="text-base font-bold text-text mb-1">No mentors found</h3>
          <p className="text-sm text-dim max-w-xs leading-relaxed">
            Try adjusting your search or filters. Every mentor on Playbuuk has a
            structured playbook built around their strategy.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilters({
                search: '',
                market: '',
                style: '',
                verified: verifiedOnly ? 'true' : '',
                sort: 'followers',
              })
              setDebouncedSearch('')
            }}
            className="mt-5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{
              background: 'rgba(0,229,176,0.08)',
              border: '1px solid rgba(0,229,176,0.22)',
              color: 'var(--accent)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,229,176,0.14)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,229,176,0.08)' }}
          >
            Clear filters
          </button>
        </div>

      ) : (
        /* Mentor cards — staggered fade-up */
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0"
          aria-label={`${total} mentors`}
        >
          {mentors.map((mentor, i) => (
            <li
              key={mentor.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            >
              <MentorCard mentor={mentor} />
            </li>
          ))}
        </ul>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && !loading && (
        <nav
          className="flex items-center justify-center gap-2"
          aria-label="Mentor pages"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
              color: 'var(--dim)',
            }}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Prev
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const p = totalPages <= 7 ? i + 1
                : page <= 4 ? i + 1
                : page >= totalPages - 3 ? totalPages - 6 + i
                : page - 3 + i
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-sm font-mono tabular-nums transition-all duration-150"
                  style={{
                    background: p === page ? 'rgba(0,229,176,0.12)' : 'transparent',
                    border: `1px solid ${p === page ? 'rgba(0,229,176,0.28)' : 'transparent'}`,
                    color: p === page ? 'var(--accent)' : 'var(--dim)',
                  }}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
              color: 'var(--dim)',
            }}
            aria-label="Next page"
          >
            Next
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}
