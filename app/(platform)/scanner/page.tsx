// app/(platform)/scanner/page.tsx
// Live multi-mentor setup scanner — the "find the best trade right now" page.
//
// Psychology purpose:
//   Instead of the trader monitoring 20 charts across 5 mentor strategies,
//   this page surfaces the best live grade across every followed mentor × pair
//   combination. The answer to "should I trade now?" is immediately visible.
//   Sorted by grade descending: A+ setups rise to the top.
//
// Data flow:
//   SSR: fetch followed mentors → their playbooks → preferred pairs + checklists
//        Build ScanEntry[] (one per mentor × pair)
//   Client: market-store registers all pairs → ticks every 2.5s
//            calculateGrade per entry → sort → render
//
// Access: Pro-only. Free users see a full upgrade gate.
//
// Architecture:
//   Server component — auth, tier check, DB fetch
//   ScannerGrid (client) — live market data, grade computation, filter/sort UI

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { Activity }      from 'lucide-react'
import { createClient }  from '@/lib/supabase/server'
import { checkTierAccess } from '@/lib/auth/tierGate'
import { UpgradePrompt }   from '@/components/ui/upgrade-prompt'
import { ScannerGrid, type ScanEntry } from '@/components/scanner/scanner-grid'
import type { ChecklistItem } from '@/lib/supabase/types'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Live Trading Setup Scanner — Playbuuk',
  description:
    'Scan all your followed mentors\' playbooks live across every preferred pair. ' +
    'Setup grades update every 2.5 seconds — A+ setups rise to the top automatically. ' +
    'Stop chart staring. Walk away until conditions are met.',
  keywords: [
    'live trading setup scanner',
    'multi-mentor forex scanner',
    'trading setup grade',
    'best forex setup now',
    'trading discipline scanner',
    'A+ trading setup finder',
    'live checklist scanner',
  ],
  openGraph: {
    title:       'Live Setup Scanner — Playbuuk',
    description: 'See every mentor\'s setup grade live. A+ setups rise to the top.',
    type:        'website',
    images:      [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter:     { card: 'summary_large_image' },
  alternates:  { canonical: '/scanner' },
  robots:      { index: false },  // scanner is a dynamic app view, not for indexing
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

const structuredData = {
  '@context':          'https://schema.org',
  '@type':             'WebApplication',
  name:                'Playbuuk Live Scanner',
  applicationCategory: 'FinanceApplication',
  description:
    'Real-time multi-mentor trading setup scanner. ' +
    'Grades every mentor × pair combination live at 2.5s intervals.',
  offers: {
    '@type':           'Offer',
    price:             '19.99',
    priceCurrency:     'USD',
    description:       'Pro subscription required',
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScannerPage() {
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

  // ── Fetch followed mentor IDs ─────────────────────────────────────────────
  const { data: follows } = await supabase
    .from('mentor_follows')
    .select('mentor_id')
    .eq('user_id', user.id)

  const followedIds = follows?.map(f => f.mentor_id) ?? []

  // ── Fetch mentors + their playbooks in parallel ───────────────────────────
  const entries: ScanEntry[] = []
  let totalPairsCount = 0

  if (followedIds.length > 0) {
    const [mentorsRes, playbooksRes] = await Promise.all([
      supabase
        .from('mentors')
        .select('id, display_name, handle, avatar_emoji, verified, onboarding_status')
        .in('id', followedIds)
        .neq('onboarding_status', 'admin_added'),

      // Latest playbook per mentor — order by version desc, pick first per mentor
      supabase
        .from('playbooks')
        .select('id, mentor_id, strategy_name, preferred_pairs, checklist')
        .in('mentor_id', followedIds)
        .order('version', { ascending: false }),
    ])

    const mentors   = mentorsRes.data   ?? []
    const playbooks = playbooksRes.data ?? []

    // Build a mentor_id → latest playbook map (first occurrence = latest version)
    const playbookByMentor = new Map<string, typeof playbooks[number]>()
    for (const pb of playbooks) {
      if (!playbookByMentor.has(pb.mentor_id)) {
        playbookByMentor.set(pb.mentor_id, pb)
      }
    }

    // Expand: one entry per mentor × preferred pair
    for (const mentor of mentors) {
      const pb = playbookByMentor.get(mentor.id)
      if (!pb) continue

      const pairs: string[] = Array.isArray(pb.preferred_pairs)
        ? (pb.preferred_pairs as string[]).filter(p => typeof p === 'string')
        : []

      const checklist: ChecklistItem[] = Array.isArray(pb.checklist)
        ? (pb.checklist as unknown as ChecklistItem[])
        : []

      if (pairs.length === 0 || checklist.length === 0) continue

      totalPairsCount += pairs.length

      for (const pair of pairs) {
        entries.push({
          mentorId:       mentor.id,
          mentorName:     mentor.display_name,
          mentorHandle:   mentor.handle,
          mentorEmoji:    mentor.avatar_emoji,
          mentorVerified: mentor.verified,
          playbookId:     pb.id,
          strategyName:   pb.strategy_name,
          pair,
          checklist,
        })
      }
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="px-4 py-6 md:px-6 lg:px-8 max-w-[1600px] mx-auto">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              {/* Live pulse */}
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden="true"
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden="true"
                />
              </span>
              <h1
                className="text-2xl font-bold text-text"
                style={{ letterSpacing: '-0.03em' }}
              >
                Live Scanner
              </h1>
            </div>
            <p className="text-sm text-dim max-w-xl leading-relaxed">
              Every followed mentor × pair combination graded live.{' '}
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                A+ setups rise to the top automatically.
              </span>
              {' '}Walk away — come back when conditions are met.
            </p>

            {isPro && followedIds.length > 0 && (
              <div className="flex items-center gap-3 mt-2.5 font-mono text-2xs text-muted">
                <span>{followedIds.length} mentor{followedIds.length !== 1 ? 's' : ''} followed</span>
                <span aria-hidden="true">·</span>
                <span>{totalPairsCount} pair{totalPairsCount !== 1 ? 's' : ''} tracked</span>
                <span aria-hidden="true">·</span>
                <span style={{ color: 'var(--accent)' }}>2.5s updates</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-dim hover:text-text transition-colors"
              style={{ border: '1px solid var(--border)' }}
            >
              <Activity size={12} aria-hidden="true" />
              Browse mentors
            </Link>
          </div>
        </div>

        {/* ── Pro gate ─────────────────────────────────────────────────────── */}
        {!isPro ? (
          <div className="max-w-lg mx-auto mt-8">
            <UpgradePrompt
              feature="live_scanner"
              headline="See every setup. Grade every pair. Live."
              compact={false}
            />
          </div>
        ) : (
          /* ── Live scanner grid ──────────────────────────────────────────── */
          <ScannerGrid entries={entries} />
        )}

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        <footer
          className="mt-12 pt-6 text-center"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs text-muted font-mono">
            Not financial advice. Trading carries substantial risk.
            Grades are based on simulated market data during MVP.
          </p>
        </footer>
      </main>
    </>
  )
}
