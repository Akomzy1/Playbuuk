// app/(platform)/mentor/[id]/page.tsx
// Playbook viewer — the core product page. The discipline engine in action.
//
// ─── Layout ────────────────────────────────────────────────────────────────────
//
//   Desktop (lg+):  two-column grid
//   ┌─────────────────────────────┬──────────────────┐
//   │  Left col (flex-col gap-4)  │  Right col (sticky, scrollable)
//   │  · PairScanner              │  · SetupGrade     │
//   │  · CandlestickChart         │  · [Trade panel]  │
//   │  · IndicatorStrip           │  · LiveChecklist  │
//   │                             │  · GoldenRules    │
//   │                             │  · EntryExitRules │
//   │                             │  · CommonMistakes │
//   └─────────────────────────────┴──────────────────┘
//
//   Mobile (single-col):
//   PairScanner → SetupGrade → Chart → IndicatorStrip → LiveChecklist → Rules
//   Right column uses `order-1 lg:order-2` so grade appears above chart on mobile.
//
// ─── Lifecycle ─────────────────────────────────────────────────────────────────
//   PlaybookEngineInit (client, Pro only):
//     mount  → loadChecklist(items, id)
//     mount  → addPair() for each preferred pair, startEngine()
//     mount  → POST /api/playbooks/:id/usage { event_type: 'checklist_open' }
//     every 5m → POST usage { event_type: 'time_spent', duration_seconds: 300 }
//     unmount → stopEngine()
//
// ─── Tier gating ───────────────────────────────────────────────────────────────
//   Pro  → discipline engine (chart, scanner, grade, checklist) unlocked
//   Free → blurred overlays on discipline engine; golden rules always visible

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient }     from '@/lib/supabase/server'
import { isFollowing }      from '@/lib/mentor/follow'
import { checkTierAccess }  from '@/lib/auth/tierGate'
import { PlaybookHeader }   from '@/components/playbook/playbook-header'
import { GoldenRules }      from '@/components/playbook/golden-rules'
import { CommonMistakes }   from '@/components/playbook/common-mistakes'
import { IndicatorStrip }   from '@/components/playbook/indicator-strip'
import { EntryExitRules }   from '@/components/playbook/entry-exit-rules'
import { LiveChecklist }    from '@/components/playbook/live-checklist'
import { SetupGrade }       from '@/components/playbook/setup-grade'
import { CandlestickChart } from '@/components/playbook/candlestick-chart'
import { PairScanner }      from '@/components/playbook/pair-scanner'
import { PlaybookEngineInit } from '@/components/playbook/playbook-engine-init'
import { TierGate }         from '@/components/ui/tier-gate'
import { PricingTiers }     from '@/components/marketplace/pricing-tiers'
import { TradePanel }         from '@/components/playbook/trade-panel'
import { PositionsPanel }    from '@/components/playbook/positions-panel'
import { db }               from '@/lib/db'
import type { ChecklistItem, RiskManagement } from '@/lib/supabase/types'
import type { TradingAccountFull } from '@/app/(platform)/accounts/page'

// ─── Metadata ─────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = createClient()

  const { data: mentor } = await supabase
    .from('mentors')
    .select('display_name, handle, bio')
    .eq('id', id)
    .maybeSingle()

  if (!mentor) return { title: 'Mentor not found — Playbuuk' }

  const { data: playbook } = await supabase
    .from('playbooks')
    .select('strategy_name, summary')
    .eq('mentor_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const title = playbook
    ? `${mentor.display_name} — ${playbook.strategy_name} Playbook | Playbuuk`
    : `${mentor.display_name} Trading Strategy Playbook | Playbuuk`

  const description =
    playbook?.summary ??
    mentor.bio ??
    `${mentor.display_name}'s trading strategy playbook on Playbuuk — auto-detecting checklist, real-time setup grading, and psychology-gated execution.`

  return {
    title,
    description,
    keywords: [
      `${mentor.display_name} trading strategy`,
      `${mentor.handle} playbook`,
      'trading discipline checklist',
      'forex setup grading',
      'live trading checklist',
      'auto-detecting trading setup',
      'trading psychology tool',
    ],
    openGraph: {
      title,
      description,
      type:   'article',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter:    { card: 'summary_large_image' },
    alternates: { canonical: `/mentor/${id}` },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlaybookPage({ params }: PageProps) {
  const { id: mentorId } = await params

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fetch mentor ──────────────────────────────────────────────────────────
  const { data: mentor, error: mentorErr } = await supabase
    .from('mentors')
    .select(
      `id, display_name, handle, bio, avatar_emoji, markets, style, signature,
       follower_count, external_followers, rating, review_count,
       verified, verified_at, onboarding_status`,
    )
    .eq('id', mentorId)
    .maybeSingle()

  if (mentorErr || !mentor) notFound()

  // ── Fetch playbook ────────────────────────────────────────────────────────
  const { data: playbook } = await supabase
    .from('playbooks')
    .select('*')
    .eq('mentor_id', mentorId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ── User tier + follow state + trading accounts (parallel) ──────────────
  const [{ data: profile }, following, rawAccounts] = await Promise.all([
    supabase.from('profiles').select('tier').eq('id', user.id).single(),
    isFollowing(user.id, mentorId),
    db.tradingAccount.findMany({
      where:   { user_id: user.id, is_active: true },
      orderBy: { connected_at: 'desc' },
      select: {
        id: true, metaapi_account_id: true, broker_name: true,
        account_number: true, server: true, platform: true,
        account_type: true, balance: true, currency: true,
        leverage: true, is_active: true, connected_at: true, last_synced_at: true,
      },
    }),
  ])

  // Serialise Decimal → number at server boundary
  const accounts: TradingAccountFull[] = rawAccounts.map(a => ({
    id:                 a.id,
    metaapi_account_id: a.metaapi_account_id,
    broker_name:        a.broker_name,
    account_number:     a.account_number,
    server:             a.server,
    platform:           a.platform,
    account_type:       a.account_type,
    balance:            a.balance != null ? Number(a.balance) : null,
    currency:           a.currency,
    leverage:           a.leverage,
    is_active:          a.is_active,
    connected_at:       a.connected_at.toISOString(),
    last_synced_at:     a.last_synced_at?.toISOString() ?? null,
  }))

  const userTier = profile?.tier ?? 'free'
  const isPro    = checkTierAccess(userTier, 'pro')

  // ── Typed playbook fields ─────────────────────────────────────────────────
  const goldenRules    = Array.isArray(playbook?.golden_rules)
    ? (playbook.golden_rules    as string[]) : []
  const commonMistakes = Array.isArray(playbook?.common_mistakes)
    ? (playbook.common_mistakes as string[]) : []
  const coreConcepts   = Array.isArray(playbook?.core_concepts)
    ? (playbook.core_concepts   as string[]) : []
  const indicators     = Array.isArray(playbook?.indicators)
    ? (playbook.indicators      as string[]) : []
  const entryRules     = Array.isArray(playbook?.entry_rules)
    ? (playbook.entry_rules     as string[]) : []
  const exitRules      = Array.isArray(playbook?.exit_rules)
    ? (playbook.exit_rules      as string[]) : []
  const checklist      = Array.isArray(playbook?.checklist)
    ? (playbook.checklist       as unknown as ChecklistItem[]) : []
  const preferredPairs = Array.isArray(playbook?.preferred_pairs)
    ? (playbook.preferred_pairs as string[]).filter(p => typeof p === 'string') : []
  const riskManagement = (playbook?.risk_management ?? {}) as RiskManagement

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const structuredData = {
    '@context':   'https://schema.org',
    '@type':      'Article',
    headline:     playbook?.strategy_name ?? `${mentor.display_name} Trading Strategy`,
    description:  playbook?.summary ?? mentor.bio ?? '',
    author:       { '@type': 'Person', name: mentor.display_name },
    publisher:    { '@type': 'Organization', name: 'Playbuuk' },
    dateModified: playbook?.updated_at,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Lifecycle init — Pro only; renders null */}
      {isPro && playbook && (
        <PlaybookEngineInit
          playbookId={playbook.id}
          checklist={checklist}
          preferredPairs={preferredPairs.length > 0 ? preferredPairs : ['EURUSD']}
        />
      )}

      <main className="px-4 py-6 md:px-6 lg:px-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-6">

          {/* ── PlaybookHeader — full width ───────────────────────────────── */}
          {playbook ? (
            <PlaybookHeader
              mentor={{
                id:                 mentor.id,
                display_name:       mentor.display_name,
                handle:             mentor.handle,
                avatar_emoji:       mentor.avatar_emoji,
                bio:                mentor.bio,
                verified:           mentor.verified,
                follower_count:     mentor.follower_count,
                rating:             mentor.rating,
                style:              mentor.style,
                markets:            mentor.markets,
              }}
              playbook={{
                strategy_name:      playbook.strategy_name,
                summary:            playbook.summary,
                timeframes:         playbook.timeframes,
                preferred_pairs:    playbook.preferred_pairs,
                session_preference: playbook.session_preference,
                is_verified:        playbook.is_verified,
                is_ai_draft:        playbook.is_ai_draft,
                version:            playbook.version,
                published_at:       playbook.published_at,
                updated_at:         playbook.updated_at,
              }}
              initialFollowing={following}
            />
          ) : (
            /* No playbook yet */
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl text-center"
              style={{ border: '1px dashed var(--border)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                aria-hidden="true"
              >
                {mentor.avatar_emoji ?? '👤'}
              </div>
              <h1 className="text-xl font-bold text-text mb-2">{mentor.display_name}</h1>
              <p className="text-sm text-dim max-w-sm">
                This mentor&apos;s playbook is being prepared.
                Follow them to get notified when it goes live.
              </p>
            </div>
          )}

          {/* ── Two-column discipline engine ──────────────────────────────── */}
          {playbook && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">

              {/*
                ── Left column — chart, scanner, indicators ─────────────────
                Mobile order: renders AFTER right column (grade/checklist appear first)
                Desktop: natural left-column placement
              */}
              <div className="flex flex-col gap-4 order-2 lg:order-1">

                {/* Pair scanner strip — Pro only */}
                {isPro && preferredPairs.length > 0 && (
                  <PairScanner
                    pairs={preferredPairs}
                    checklist={checklist}
                  />
                )}

                {/* Candlestick chart — Pro only */}
                <TierGate
                  requiredTier="pro"
                  userTier={userTier}
                  feature="live_checklist"
                  headline="Live chart — see the setup form in real time"
                >
                  <CandlestickChart height={380} />
                </TierGate>

                {/* Indicator strip — live analysis (Pro) + core concepts (free) */}
                <IndicatorStrip
                  indicators={indicators}
                  coreConcepts={coreConcepts}
                  isPro={isPro}
                />

              </div>

              {/*
                ── Right column — grade, checklist, rules ───────────────────
                Mobile order: renders FIRST (grade before chart on mobile)
                Desktop: sticky right column, independently scrollable
              */}
              <div
                className="flex flex-col gap-4 order-1 lg:order-2 lg:sticky lg:top-6 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pb-4"
              >

                {/* Setup grade — Pro only */}
                <TierGate
                  requiredTier="pro"
                  userTier={userTier}
                  feature="setup_grading"
                  headline="Your setup grade — live A+ to D+"
                >
                  <SetupGrade />
                </TierGate>

                {/* Trade panel — psychology-gated execution */}
                {isPro && playbook && (
                  <TradePanel
                    playbookId={playbook.id}
                    mentorName={mentor.display_name}
                    riskManagement={riskManagement}
                    accounts={accounts}
                  />
                )}

                {/* Open positions — current pair, live updates */}
                {isPro && accounts.length > 0 && (
                  <PositionsPanel filterToPair />
                )}

                {/* Live checklist — Pro only */}
                <TierGate
                  requiredTier="pro"
                  userTier={userTier}
                  feature="live_checklist"
                >
                  <LiveChecklist checklist={checklist} />
                </TierGate>

                {/* Golden rules — always visible */}
                <GoldenRules goldenRules={goldenRules} />

                {/* Entry + exit rules — Pro only */}
                <TierGate
                  requiredTier="pro"
                  userTier={userTier}
                  feature="live_checklist"
                >
                  <EntryExitRules
                    entryRules={entryRules}
                    exitRules={exitRules}
                  />
                </TierGate>

                {/* Common mistakes — Pro only */}
                <TierGate
                  requiredTier="pro"
                  userTier={userTier}
                  feature="psychology_insights"
                >
                  <CommonMistakes mistakes={commonMistakes} />
                </TierGate>

                {/* Pricing CTA — free users only */}
                {!isPro && (
                  <section aria-label="Upgrade to Pro">
                    <PricingTiers
                      currentTier={userTier}
                      mentorId={mentor.id}
                      mentorName={mentor.display_name}
                    />
                  </section>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <footer
          className="mt-12 pt-6 text-center"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs text-muted font-mono">
            Not financial advice. Trading carries substantial risk.
            Past performance is not indicative of future results.
          </p>
        </footer>
      </main>
    </>
  )
}
