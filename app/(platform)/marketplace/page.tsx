// app/(platform)/marketplace/page.tsx
// Mentor Marketplace — platform home page (authenticated users).
//
// Architecture:
//   Server Component: SSR-fetches verified & draft mentors + follow state
//   Hero section:   static, no data needed
//   Verified grid:  <MentorGrid verifiedOnly /> (client, search/filter/paginate)
//   Coming Soon:    SSR-fetched draft mentors rendered as lighter cards
//   Request CTA:    static banner → /requests
//
// SEO: full generateMetadata, JSON-LD SoftwareApplication, OG image

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getFollowedMentorIds } from '@/lib/mentor/follow'
import { MentorGrid } from '@/components/marketplace/mentor-grid'
import { MentorCard, type MentorCardData } from '@/components/marketplace/mentor-card'
import { ArrowDown, CheckCircle2, Star, Zap, Brain, ChevronRight, Users } from 'lucide-react'

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Playbuuk — Trading Discipline Platform | Stop Emotional Trading',
  description:
    'Follow top trading mentors. Access AI-powered playbooks with auto-detecting checklists, real-time setup grading, and psychology-gated execution. Trade the plan, not the emotion.',
  keywords: [
    'trading discipline platform',
    'trading psychology tool',
    'stop revenge trading',
    'FOMO trading solution',
    'trading checklist app',
    'forex trading mentor',
    'trading playbook',
    'setup grading A+',
    'trading discipline app',
    'how to stop emotional trading',
  ],
  openGraph: {
    title: 'Playbuuk — Trade the Plan, Not the Emotion',
    description:
      'AI-powered playbooks that enforce trading discipline. Auto-detecting checklists, psychology-gated execution, and setup alerts.',
    type: 'website',
    url: 'https://playbuuk.com/marketplace',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Playbuuk — Trading Discipline Platform' }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://playbuuk.com/marketplace' },
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Playbuuk',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description:
    'Trading psychology and strategy discipline platform with AI-powered playbooks, auto-detecting checklists, and psychology-gated trade execution.',
  offers: {
    '@type': 'Offer',
    price: '19.99',
    priceCurrency: 'USD',
    name: 'Pro subscription',
    description: 'Full discipline engine, setup alerts, psychology-gated execution',
  },
  featureList: [
    'Auto-detecting trading checklist',
    'Real-time setup grading (A+ to D+)',
    'Psychology-gated trade execution',
    'MT5/MT4 trade bridge',
    'Setup alert notifications',
    'Trading journal with emotion tracking',
    'Mentor strategy playbooks',
  ],
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MarketplacePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Run all SSR data fetches in parallel
  const [followedIds, { data: draftMentors }] = await Promise.all([
    user ? getFollowedMentorIds(user.id) : Promise.resolve(new Set<string>()),
    supabase
      .from('mentors')
      .select(`
        id, display_name, handle, bio, avatar_emoji,
        markets, style, follower_count, external_followers,
        rating, review_count, verified, onboarding_status,
        playbooks ( id, strategy_name, is_ai_draft )
      `)
      .eq('verified', false)
      .neq('onboarding_status', 'admin_added')
      .order('follower_count', { ascending: false })
      .limit(6),
  ])

  // Shape draft mentors into MentorCardData
  const draftCards: MentorCardData[] = (draftMentors ?? []).map((m) => {
    const playbook = Array.isArray(m.playbooks) ? m.playbooks[0] as { id: string; strategy_name: string; is_ai_draft: boolean } | undefined : undefined
    return {
      id: m.id,
      display_name: m.display_name,
      handle: m.handle,
      bio: m.bio,
      avatar_emoji: m.avatar_emoji,
      markets: Array.isArray(m.markets) ? m.markets as string[] : [],
      style: m.style,
      follower_count: m.follower_count,
      external_followers: m.external_followers,
      rating: m.rating,
      review_count: m.review_count,
      verified: false,
      onboarding_status: m.onboarding_status,
      is_ai_draft: playbook?.is_ai_draft ?? true,
      playbook_id: playbook?.id ?? null,
      strategy_name: playbook?.strategy_name ?? null,
      initialFollowing: followedIds.has(m.id),
    }
  })

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen">

        {/* ════════════════════════════════════════
            HERO SECTION
        ════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden bg-grid"
          aria-label="Playbuuk — Trade the plan, not the emotion"
        >
          {/* Ambient glows */}
          <div
            className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
            style={{ background: 'var(--accent)' }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[100px]"
            style={{ background: 'var(--info)' }}
            aria-hidden="true"
          />

          <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 md:pt-20 md:pb-16">

            {/* Platform badge */}
            <div className="flex justify-center mb-6">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold font-mono"
                style={{
                  background: 'rgba(0,229,176,0.07)',
                  border: '1px solid rgba(0,229,176,0.2)',
                  color: 'var(--accent)',
                }}
              >
                <Brain size={12} aria-hidden="true" />
                Trading Psychology Platform
              </div>
            </div>

            {/* Headline */}
            <div className="text-center max-w-3xl mx-auto mb-6">
              <h1
                className="font-bold leading-[1.1] tracking-tight mb-4"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}
              >
                Trade the plan,{' '}
                <span className="text-gradient">not the emotion.</span>
              </h1>
              <p
                className="text-dim leading-relaxed"
                style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)' }}
              >
                Your strategy works. Your psychology doesn&apos;t.{' '}
                <span className="text-text font-medium">Playbuuk fixes the gap</span>{' '}
                between knowing your rules and actually following them.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-12">
              <a
                href="#mentors"
                className="btn-primary flex items-center gap-2 py-3 px-6 rounded-xl text-sm font-bold"
                style={{ boxShadow: '0 0 28px rgba(0,229,176,0.25)' }}
              >
                Browse Mentors
                <ArrowDown size={15} aria-hidden="true" />
              </a>
              <Link
                href="/requests"
                className="btn-secondary flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold"
              >
                Request a Mentor
              </Link>
            </div>

            {/* Feature pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {[
                {
                  icon: CheckCircle2,
                  title: 'Auto-detecting checklist',
                  body: 'BOS either happened or it didn\'t. No room for "looks close enough."',
                  color: 'var(--accent)',
                  bg: 'rgba(0,229,176,0.05)',
                  border: 'rgba(0,229,176,0.15)',
                },
                {
                  icon: Star,
                  title: 'A+ to D+ setup grade',
                  body: 'Objective score removes the question "do I feel good about this?"',
                  color: 'var(--gold)',
                  bg: 'rgba(251,191,36,0.05)',
                  border: 'rgba(251,191,36,0.15)',
                },
                {
                  icon: Zap,
                  title: 'Psychology-gated execution',
                  body: 'Below C+? Trade locked. Stop FOMO and revenge entries cold.',
                  color: 'var(--info)',
                  bg: 'rgba(77,142,255,0.05)',
                  border: 'rgba(77,142,255,0.15)',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col gap-2 p-4 rounded-2xl"
                  style={{ background: f.bg, border: `1px solid ${f.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <f.icon size={14} style={{ color: f.color }} aria-hidden="true" />
                    <span className="text-xs font-bold text-text">{f.title}</span>
                  </div>
                  <p className="text-xs text-dim leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            VERIFIED MENTORS SECTION
        ════════════════════════════════════════ */}
        <section
          id="mentors"
          className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16"
          aria-labelledby="verified-heading"
        >
          {/* Section header */}
          <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono"
                  style={{
                    background: 'rgba(0,229,176,0.1)',
                    border: '1px solid rgba(0,229,176,0.28)',
                    color: 'var(--accent)',
                  }}
                >
                  <CheckCircle2 size={11} aria-hidden="true" />
                  Verified
                </span>
              </div>
              <h2
                id="verified-heading"
                className="text-2xl md:text-3xl font-bold text-text"
                style={{ letterSpacing: '-0.03em' }}
              >
                Mentor Marketplace
              </h2>
              <p className="text-sm text-dim mt-1.5 max-w-xl leading-relaxed">
                Mentors who have reviewed and approved their own playbook.
                Their strategy rules are final — follow their checklist, follow their discipline.
              </p>
            </div>

            {/* Stats strip */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <Users size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <span className="text-xs text-dim font-mono">Follow freely — upgrade to trade</span>
            </div>
          </div>

          {/* Interactive grid — client component */}
          <MentorGrid followedIds={followedIds} verifiedOnly />
        </section>

        {/* ════════════════════════════════════════
            COMING SOON — DRAFT MENTORS PIPELINE
        ════════════════════════════════════════ */}
        {draftCards.length > 0 && (
          <section
            className="relative overflow-hidden py-12 md:py-14"
            aria-labelledby="coming-soon-heading"
            style={{
              background: 'linear-gradient(180deg, var(--bg) 0%, rgba(11,17,33,0.8) 50%, var(--bg) 100%)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {/* Subtle bg texture */}
            <div
              className="pointer-events-none absolute inset-0 bg-grid opacity-30"
              aria-hidden="true"
            />

            <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-mono"
                      style={{
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.2)',
                        color: 'var(--gold)',
                      }}
                    >
                      Coming Soon
                    </span>
                  </div>
                  <h2
                    id="coming-soon-heading"
                    className="text-xl md:text-2xl font-bold text-text"
                    style={{ letterSpacing: '-0.025em' }}
                  >
                    Mentor Pipeline
                  </h2>
                  <p className="text-sm text-dim mt-1 max-w-lg leading-relaxed">
                    AI-extracted draft playbooks — real strategies, not yet verified by the mentor.
                    Follow now to be notified when they go live.
                  </p>
                </div>

                {/* Outreach angle */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-dim"
                  style={{
                    background: 'rgba(251,191,36,0.04)',
                    border: '1px solid rgba(251,191,36,0.12)',
                  }}
                >
                  <span style={{ color: 'var(--gold)' }}>💬</span>
                  <span>Vote on requests to accelerate outreach</span>
                </div>
              </div>

              {/* Draft cards grid — SSR, staggered via CSS vars */}
              <ul
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0"
                aria-label="Draft mentor pipeline"
              >
                {draftCards.map((mentor, i) => (
                  <li
                    key={mentor.id}
                    className="animate-fade-up"
                    style={{
                      animationDelay: `${i * 60}ms`,
                      animationFillMode: 'both',
                      opacity: 0,
                    }}
                  >
                    <MentorCard mentor={mentor} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            REQUEST A MENTOR — CTA BANNER
        ════════════════════════════════════════ */}
        <section
          className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16"
          aria-labelledby="request-heading"
        >
          <div
            className="relative overflow-hidden rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,176,0.06) 0%, rgba(11,17,33,0.95) 60%)',
              border: '1px solid rgba(0,229,176,0.18)',
              boxShadow: '0 0 60px rgba(0,229,176,0.07), 0 8px 48px rgba(0,0,0,0.4)',
            }}
          >
            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-15 blur-3xl"
              style={{ background: 'var(--accent)' }}
              aria-hidden="true"
            />

            {/* Icon block */}
            <div
              className="relative flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
              style={{
                background: 'rgba(0,229,176,0.1)',
                border: '1px solid rgba(0,229,176,0.25)',
                boxShadow: '0 0 24px rgba(0,229,176,0.15)',
              }}
              aria-hidden="true"
            >
              🏆
            </div>

            {/* Copy */}
            <div className="relative flex-1 text-center md:text-left">
              <h2
                id="request-heading"
                className="text-xl md:text-2xl font-bold text-text mb-2"
                style={{ letterSpacing: '-0.025em' }}
              >
                Don&apos;t see your mentor?
              </h2>
              <p className="text-sm text-dim leading-relaxed max-w-lg">
                Request any trading mentor — we&apos;ll AI-extract their playbook and reach out
                to get them verified. Votes determine the outreach queue.
                The more votes, the stronger our pitch: <span className="text-text font-medium">&ldquo;347 traders voted for your strategy.&rdquo;</span>
              </p>
            </div>

            {/* CTA */}
            <div className="relative flex-shrink-0 flex flex-col items-center gap-2">
              <Link
                href="/requests"
                className="btn-primary flex items-center gap-2 py-3 px-6 rounded-xl text-sm font-bold whitespace-nowrap"
                style={{ boxShadow: '0 0 24px rgba(0,229,176,0.2)' }}
              >
                Request a Mentor
                <ChevronRight size={15} aria-hidden="true" />
              </Link>
              <span className="text-2xs text-muted font-mono">Free · No sign-up required</span>
            </div>
          </div>
        </section>

        {/* ── Disclaimer ──────────────────────────────────────────────────── */}
        <footer
          className="text-center py-6 px-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs text-muted font-mono">
            Not financial advice. Trading carries substantial risk of loss.
            Past performance is not indicative of future results.
          </p>
        </footer>

      </div>
    </>
  )
}
