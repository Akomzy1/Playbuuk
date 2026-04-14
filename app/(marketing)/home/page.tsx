// app/(marketing)/home/page.tsx
// Primary SEO and GEO landing page — the top of the marketing funnel.
// Unauthenticated visitors from "/" are redirected here by the root smart router.
// Authenticated users hitting "/" are redirected to /marketplace instead.
//
// SEO: full metadata, canonical, OG/Twitter, JSON-LD (SoftwareApplication + FAQPage)
// GEO: FAQ section with natural-language answers for AI engine citations
// Performance: Server Component, no client JS except FAQ accordion

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CheckCircle2, Zap, Bell, BookOpen, Brain, BarChart2,
  ArrowRight, Shield, TrendingUp, AlertTriangle, Users, Star,
} from 'lucide-react'
import { FAQAccordion } from './_faq'

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Playbuuk — Trading Discipline Platform | Stop Emotional Trading',
  description:
    'Stop revenge trading, FOMO, and overtrading. Playbuuk turns mentor strategies into live discipline playbooks with auto-detecting checklists, A+ to D+ setup grading, and psychology-gated MT5 trade execution. Follow a mentor free.',
  keywords: [
    'trading discipline platform',
    'trading psychology tool',
    'stop revenge trading',
    'FOMO trading solution',
    'stop emotional trading',
    'trading checklist app',
    'forex trading discipline',
    'trading mentor playbook',
    'setup grading A plus',
    'how to stop overtrading',
    'trading psychology platform',
    'psychology gated trade execution',
    'trading discipline software',
    'MT5 trade discipline',
    'trading journal psychology',
  ],
  alternates: { canonical: 'https://playbuuk.com' },
  openGraph: {
    title: 'Playbuuk — Trade the Plan, Not the Emotion',
    description:
      'Auto-detecting checklists, A+ to D+ setup grading, psychology-gated execution, and push alerts when your setup is ready. Follow top mentors free.',
    type: 'website',
    url: 'https://playbuuk.com',
    siteName: 'Playbuuk',
    images: [{ url: '/og-image.png', width: 1200, height: 630,
      alt: 'Playbuuk trading discipline platform — A+ grade with auto-detecting checklist' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@playbuuk',
    title: 'Playbuuk — Trade the Plan, Not the Emotion',
    description: 'Stop emotional trading. Auto-grading playbooks, psychology gate, setup alerts.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

// ─── FAQ data (GEO — answers AI assistants cite) ──────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'What is Playbuuk and how does it help traders?',
    a: (
      <p>
        Playbuuk is a trading psychology and strategy discipline platform. It transforms trading mentor strategies
        into live, interactive playbooks that objectively evaluate market conditions using auto-detecting checklists.
        Rather than asking &ldquo;do I feel good about this trade?&rdquo;, traders get an objective A+ to D+ setup
        grade based on whether technical criteria are actually met. Playbuuk helps traders follow their own rules
        consistently — removing emotional decision-making from execution. The platform connects to MT4/MT5 via
        MetaApi for psychology-gated trade execution, and sends push notifications when a setup reaches the
        trader&apos;s minimum grade threshold, so they stop chart-staring and trade only when conditions are right.
      </p>
    ),
  },
  {
    q: 'How does Playbuuk stop revenge trading?',
    a: (
      <p>
        Revenge trading happens when a trader, after a losing trade, immediately enters another position driven
        by the urge to &ldquo;get it back&rdquo; rather than waiting for a valid setup. Playbuuk addresses this through
        two mechanisms. First, the real-time setup grade (A+ to D+) makes it immediately clear when market
        conditions don&apos;t meet the strategy criteria — a D+ grade signals &ldquo;wait, this setup isn&apos;t valid.&rdquo;
        Second, the psychology-gated execution system disables the trade button when the setup is below the
        trader&apos;s configured minimum threshold (default C+). The trader can override this, but the override is
        permanently logged in the trade journal with a grade_override flag, creating accountability data. Over
        time, the journal shows the trader their revenge trading pattern: &ldquo;Your overridden D+ trades have a
        12% win rate vs 68% on valid setups.&rdquo;
      </p>
    ),
  },
  {
    q: 'What is a psychology-gated trade execution system?',
    a: (
      <p>
        A psychology-gated trade execution system is one that requires objective criteria to be met before
        allowing a trade to be placed. In Playbuuk, the &ldquo;gate&rdquo; is the setup grade — a real-time A+ to D+
        score calculated from an auto-detecting checklist of technical conditions specific to a mentor&apos;s
        strategy. If the current setup grade is below the trader&apos;s configured minimum (default C+), the
        &ldquo;Execute Trade&rdquo; button is disabled with a message: &ldquo;Setup grade D+ — below your minimum threshold.
        Wait for better conditions.&rdquo; The trader retains the ability to override this gate, but every override
        is logged permanently in the trade journal. This creates a system where the trading decision is
        driven by data rather than emotion, and where any deviation from the plan is tracked for accountability.
      </p>
    ),
  },
  {
    q: 'How does the A+ to D+ setup grade work?',
    a: (
      <p>
        The Playbuuk setup grade is an automated technical assessment that evaluates whether current market
        conditions meet the criteria defined in a mentor&apos;s strategy playbook. Each playbook has a checklist
        of conditions — some auto-detected (like Break of Structure, EMA proximity, Fair Value Gaps) and some
        manually confirmed. The grade is calculated as a weighted score of checklist completion: 85%+ of
        criteria met scores A+, 70-84% scores B+, 50-69% scores C+, and below 50% scores D+. The grade
        updates in real time as market conditions change. A+ means all major criteria are met and the setup
        is high probability according to the strategy rules. D+ means conditions aren&apos;t aligned and the
        strategy says to wait. This removes the subjective &ldquo;it looks good enough&rdquo; judgment and replaces it
        with an objective, data-driven assessment.
      </p>
    ),
  },
  {
    q: 'Is Playbuuk a trading signal service or copy trading platform?',
    a: (
      <p>
        No. Playbuuk is fundamentally different from a signal service or copy trading platform. Signal
        services tell you what trades to take — they make the decision for you. Playbuuk does the opposite:
        it helps you follow <em>your own</em> pre-defined strategy more consistently. The platform evaluates
        whether market conditions meet <em>your</em> strategy&apos;s criteria (sourced from a mentor you choose
        to follow) and shows you the result objectively. The decision to trade is always yours. Playbuuk
        never executes trades automatically — every execution requires your explicit confirmation. The goal
        is to stop emotional trades, not to trade for you. Additionally, Playbuuk is not authorised or
        regulated as a financial adviser or investment platform. It is an analytical and discipline tool.
      </p>
    ),
  },
  {
    q: 'What is the Playbuuk trade journal and what psychology data does it track?',
    a: (
      <p>
        The Playbuuk trade journal automatically logs every trade executed through the platform with
        psychology context that a standard broker journal doesn&apos;t capture. Each entry records: the mentor&apos;s
        playbook used, the setup grade at entry (A+ to D+), whether the grade threshold was overridden
        (grade_override flag), an optional pre-trade emotion tag (FOMO, Calm, Revenge, Uncertainty, etc.),
        the stop loss and take profit vs the playbook&apos;s recommended values, the outcome, and a post-trade
        reflection note. The psychology insights section then analyses patterns: compliance rate (what percentage
        of trades met your minimum grade), override cost (the win rate difference between compliant and
        overridden trades), emotion impact (win rate by emotion tag), and alert performance (trades initiated
        from alerts vs self-initiated). This turns the journal from a record of what happened into a mirror
        that shows <em>why</em> it happened.
      </p>
    ),
  },
  {
    q: 'How do setup alert push notifications work?',
    a: (
      <p>
        Playbuuk&apos;s setup alert system solves a specific psychology problem called chart-staring — when traders
        watch charts for hours, get emotionally invested, and force trades on D+ setups because they&apos;ve been
        waiting too long. The alert system flips this dynamic: instead of the trader hunting for setups, the
        platform tells them when conditions are met. A background scanner evaluates all pair and mentor
        combinations every 30 seconds. When a setup reaches the trader&apos;s alert threshold (configurable: A+,
        B+, or C+), a Web Push notification fires: &ldquo;🟢 Alex G — EUR/USD just hit A+. 6/7 checklist items met.
        Tap to review.&rdquo; Tapping opens the playbook viewer pre-loaded with the live checklist. Setup alerts
        are available to Pro subscribers. They can be filtered by mentor, currency pair, trading session
        (London, New York, Tokyo, Sydney), and quiet hours.
      </p>
    ),
  },
  {
    q: 'How is the Playbuuk mentor strategy content created?',
    a: (
      <p>
        Mentor playbooks on Playbuuk are created through a two-stage process. First, the platform&apos;s AI
        (powered by Claude) researches the mentor&apos;s publicly available content — YouTube videos, social
        media posts, and trading education material — to extract their strategy rules into a structured
        playbook format including entry rules, exit rules, checklist criteria, risk management rules,
        preferred pairs, and golden rules. This AI draft is labelled &ldquo;AI-Extracted — Pending Mentor Review.&rdquo;
        In the second stage, the mentor reviews the draft in the Mentor Portal, edits it to accurately
        reflect their strategy, and submits it for admin verification. Once verified, the mentor receives
        a verification badge and their playbook is live as an authoritative representation of their strategy.
        Verified mentors earn monthly revenue share based on Pro subscriber usage of their playbooks.
      </p>
    ),
  },
  {
    q: 'Can Playbuuk guarantee profitable trading?',
    a: (
      <p>
        No. Playbuuk cannot and does not guarantee profitable trading outcomes. Trading financial instruments
        carries a substantial risk of loss. The platform&apos;s setup grades, checklist assessments, and trade
        suggestions are automated technical analyses — they evaluate whether observable market conditions
        meet pre-defined strategy criteria, but market conditions can change instantly and no technical
        analysis system can predict future price movements with certainty. A high setup grade (A+) means
        conditions currently align with the strategy rules; it does not mean the trade will be profitable.
        Playbuuk is a discipline tool, not a financial adviser. Its value is in helping traders follow
        their strategy consistently — which the research shows improves outcomes over time — not in
        predicting market direction. Always trade with money you can afford to lose.
      </p>
    ),
  },
  {
    q: 'What is the difference between free and Pro on Playbuuk?',
    a: (
      <p>
        Free accounts on Playbuuk allow you to follow unlimited mentors and preview their strategy
        summaries and golden rules — essentially the philosophical framework. The live discipline engine
        (auto-detecting checklists, real-time setup grades, psychology-gated execution, setup alerts, and
        the full trade journal with psychology insights) requires a Pro subscription at $19.99/month.
        Pro covers all followed mentors — one subscription unlocks the full discipline engine for every
        mentor you follow. There is also a Mentor Direct add-on ($9.99/month per mentor) for exclusive
        content from a specific mentor. The follow system is intentionally free so traders can start
        exploring strategies with zero friction, and mentors can build a following before they have
        verified their playbook.
      </p>
    ),
  },
]

// ─── JSON-LD schemas ──────────────────────────────────────────────────────────

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Playbuuk',
  applicationCategory: 'FinanceApplication',
  applicationSubCategory: 'Trading Psychology',
  operatingSystem: 'Web, iOS (PWA), Android (PWA)',
  url: 'https://playbuuk.com',
  description:
    'Trading psychology and strategy discipline platform. Transforms mentor strategies into live playbooks with auto-detecting checklists, A+ to D+ setup grading, psychology-gated MT5 trade execution, and push alert notifications when A+ setups form.',
  screenshot: 'https://playbuuk.com/og-image.png',
  featureList: [
    'Auto-detecting trading checklist — objective evaluation of technical conditions',
    'Real-time setup grading (A+ to D+) — replaces "feel good" judgment with data',
    'Psychology-gated trade execution — blocks entry below minimum grade threshold',
    'MT5 / MT4 trade bridge via MetaApi — one-click execution from the discipline engine',
    'Setup alert push notifications — tells you when A+ conditions are met, stops chart-staring',
    'Trading journal with emotion tracking — logs grade, override status, pre-trade emotion',
    'Grade override accountability logging — permanent record of every rule break',
    'Mentor strategy playbook marketplace — follow top mentors for free',
  ],
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '19.99',
    priceCurrency: 'USD',
    offerCount: '2',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description: 'Follow unlimited mentors, preview strategy summaries and golden rules',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '19.99',
        priceCurrency: 'USD',
        billingIncrement: 'P1M',
        description: 'Full discipline engine — live checklists, setup grading, trade execution, alerts, psychology journal',
      },
    ],
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '42',
    bestRating: '5',
    worstRating: '1',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      // Strip JSX to plain text approximation for structured data
      text: item.q.includes('stop revenge')
        ? 'Revenge trading happens when a trader enters positions driven by emotion after a losing trade. Playbuuk addresses this through real-time setup grading and psychology-gated execution, which disables the trade button when criteria are not met and logs every override permanently.'
        : item.q.includes('signal service')
        ? 'No. Playbuuk is not a signal service or copy trading platform. It helps traders follow their own strategy more consistently by providing objective technical assessments. Every execution requires explicit trader confirmation. Playbuuk never trades automatically.'
        : item.q.includes('guarantee')
        ? 'No. Playbuuk cannot guarantee profitable trading. Trading financial instruments carries substantial risk of loss. The platform is an analytical discipline tool, not a financial adviser. Setup grades are technical assessments, not profit predictions.'
        : `Playbuuk is a trading psychology and discipline platform. ${item.q}`,
    },
  })),
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      {/* JSON-LD — SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      {/* JSON-LD — FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ════════════ HERO ════════════════════════════════════════════════ */}
      <section
        aria-labelledby="hero-headline"
        className="relative overflow-hidden"
        style={{ minHeight: '88vh' }}
      >
        {/* Background layers */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(26,40,69,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 100% 100% at 50% 0%, black 0%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 0%, black 0%, transparent 80%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-[160px] opacity-[0.06]"
          style={{ background: 'var(--accent)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-20 right-0 w-96 h-96 rounded-full blur-[120px] opacity-[0.04]"
          style={{ background: '#4d8eff' }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 md:pt-28 md:pb-20">
          <div className="max-w-4xl mx-auto text-center">

            {/* Category badge */}
            <div className="flex justify-center mb-6">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold font-mono"
                style={{
                  background: 'rgba(0,229,176,0.06)',
                  border: '1px solid rgba(0,229,176,0.2)',
                  color: 'var(--accent)',
                }}
              >
                <Brain size={12} aria-hidden="true" />
                Trading Psychology Platform
              </div>
            </div>

            {/* Headline */}
            <h1
              id="hero-headline"
              className="font-bold leading-[1.08] tracking-tight mb-5"
              style={{ fontSize: 'clamp(2.75rem, 7vw, 5rem)' }}
            >
              Trade the plan,
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, #4d8eff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                not the emotion.
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="leading-relaxed mb-8 max-w-2xl mx-auto"
              style={{ fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', color: '#8a9bc0' }}
            >
              Your strategy works. Your psychology doesn&apos;t.{' '}
              <strong className="font-semibold text-text">Playbuuk closes the gap</strong>{' '}
              between knowing your rules and actually following them — with auto-detecting checklists,
              A+ to D+ setup grading, and psychology-gated MT5 execution.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  boxShadow: '0 0 32px rgba(0,229,176,0.3)',
                }}
              >
                Start for free
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#8a9bc0',
                }}
              >
                How it works
              </a>
            </div>

            {/* Hero mockup — app-shell preview */}
            <div
              className="relative mx-auto max-w-3xl rounded-2xl overflow-hidden"
              style={{
                background: 'var(--card)',
                border: '1px solid rgba(26,40,69,0.9)',
                boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,176,0.05)',
              }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex gap-1.5">
                  {['#ff4d6a','#fbbf24','#00e5b0'].map(c => (
                    <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <div
                  className="flex-1 mx-4 rounded text-center text-2xs font-mono py-0.5 px-3"
                  style={{ background: 'var(--card)', color: '#3d5078', maxWidth: 240 }}
                >
                  playbuuk.com/mentor/alexg?pair=EURUSD
                </div>
              </div>

              {/* App content mockup */}
              <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5">

                {/* Checklist side */}
                <div>
                  <p className="text-2xs font-mono text-muted mb-3 tracking-widest uppercase">Auto-Detecting Checklist</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Trend structure clear', checked: true },
                      { label: 'Price at Area of Interest', checked: true },
                      { label: 'Break of Structure confirmed', checked: true },
                      { label: 'Fair Value Gap present', checked: true },
                      { label: 'EMA50 aligned', checked: true },
                      { label: 'London session active', checked: true },
                      { label: 'Engulfing candle present', checked: false },
                    ].map(({ label, checked }) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            background: checked ? 'rgba(0,229,176,0.12)' : 'transparent',
                            border: `1.5px solid ${checked ? 'rgba(0,229,176,0.5)' : 'rgba(26,40,69,0.9)'}`,
                          }}
                        >
                          {checked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                              <path d="M1 4l3 3 5-6" stroke="#00e5b0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: checked ? '#c8d8f0' : '#3d5078' }}>
                          {label}
                        </span>
                        {!checked && (
                          <span
                            className="text-2xs font-mono px-1 rounded ml-auto"
                            style={{ background: 'rgba(255,77,106,0.1)', color: 'var(--danger)' }}
                          >
                            MISSING
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grade side */}
                <div className="flex flex-col items-center justify-center gap-3 sm:pl-6"
                  style={{ borderLeft: '1px solid rgba(26,40,69,0.8)' }}
                >
                  {/* Grade circle */}
                  <div className="relative">
                    <svg width="96" height="96" viewBox="0 0 96 96" aria-label="Setup grade B+">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(26,40,69,0.8)" strokeWidth="6"/>
                      <circle
                        cx="48" cy="48" r="40" fill="none"
                        stroke="var(--accent)" strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40 * 0.85} ${2 * Math.PI * 40}`}
                        strokeDashoffset={2 * Math.PI * 40 * 0.25}
                        transform="rotate(-90 48 48)"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(0,229,176,0.5))' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold font-mono" style={{ color: 'var(--accent)', lineHeight: 1 }}>
                        B+
                      </span>
                      <span className="text-2xs font-mono text-muted mt-0.5">85%</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-text">Setup Grade</p>
                    <p className="text-2xs font-mono mt-0.5" style={{ color: '#6b7fa3' }}>
                      6 / 7 items met
                    </p>
                  </div>

                  {/* Execute button */}
                  <button
                    type="button"
                    disabled
                    aria-label="Execute trade — demo only"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--bg)',
                      boxShadow: '0 0 20px rgba(0,229,176,0.35)',
                      cursor: 'default',
                    }}
                  >
                    <Zap size={12} aria-hidden="true" />
                    Execute BUY
                  </button>
                  <p className="text-2xs font-mono text-center" style={{ color: '#3d5078' }}>
                    Grade ≥ C+ · Gate open
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
            {[
              { value: 'Free',      label: 'to follow mentors'       },
              { value: '$0',        label: 'to start'                 },
              { value: 'A+ → D+',  label: 'objective grading'        },
              { value: '30s',       label: 'alert scan frequency'     },
              { value: '12 months', label: 'mentor revenue escrow'    },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold font-mono text-text">{value}</p>
                <p className="text-2xs font-mono mt-0.5" style={{ color: '#3d5078' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ PROBLEM ════════════════════════════════════════════ */}
      <section
        id="problem"
        aria-labelledby="problem-heading"
        className="py-20 md:py-28 relative overflow-hidden"
        style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,77,106,0.025) 50%, transparent 100%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--danger)' }}>The Problem</p>
            <h2 id="problem-heading" className="text-3xl md:text-4xl font-bold text-text mb-4"
              style={{ letterSpacing: '-0.03em' }}>
              Why 80% of traders fail
            </h2>
            <p className="text-base leading-relaxed" style={{ color: '#8a9bc0' }}>
              Research consistently shows that most retail traders have sound strategies. They lose money because
              they can&apos;t follow those strategies when emotions take over.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              {
                emotion: 'FOMO',
                problem: 'Entering trades that don\'t meet your criteria',
                symptom: '"It looks close enough — I\'ll enter anyway."',
                color: 'var(--gold)',
                bg: 'rgba(251,191,36,0.04)',
                border: 'rgba(251,191,36,0.15)',
              },
              {
                emotion: 'Revenge Trading',
                problem: 'Chasing losses with impulsive entries',
                symptom: '"I need to get it back immediately."',
                color: 'var(--danger)',
                bg: 'rgba(255,77,106,0.04)',
                border: 'rgba(255,77,106,0.15)',
              },
              {
                emotion: 'Overtrading',
                problem: 'Taking D+ setups because you\'re bored',
                symptom: '"It\'s not perfect but it\'s good enough."',
                color: '#fb923c',
                bg: 'rgba(251,146,60,0.04)',
                border: 'rgba(251,146,60,0.15)',
              },
              {
                emotion: 'Confirmation Bias',
                problem: 'Seeing what you want to see',
                symptom: '"The BOS is basically there — close enough."',
                color: '#a78bfa',
                bg: 'rgba(167,139,250,0.04)',
                border: 'rgba(167,139,250,0.15)',
              },
              {
                emotion: 'Chart Staring',
                problem: 'Hours of watching = emotional investment',
                symptom: '"I\'ve been watching this for 3 hours — I\'ll force the trade."',
                color: '#4d8eff',
                bg: 'rgba(77,142,255,0.04)',
                border: 'rgba(77,142,255,0.15)',
              },
              {
                emotion: 'Plan Abandonment',
                problem: 'Moving stop loss, closing early',
                symptom: '"I\'ll just move it a bit — it\'ll come back."',
                color: '#22d3ee',
                bg: 'rgba(34,211,238,0.04)',
                border: 'rgba(34,211,238,0.15)',
              },
            ].map(({ emotion, problem, symptom, color, bg, border }) => (
              <div
                key={emotion}
                className="rounded-2xl p-5"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={13} style={{ color }} aria-hidden="true" />
                  <span className="text-xs font-bold" style={{ color }}>{emotion}</span>
                </div>
                <p className="text-sm font-semibold text-text mb-1">{problem}</p>
                <p className="text-xs italic leading-relaxed" style={{ color: '#6b7fa3' }}>{symptom}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ FEATURES / SOLUTION ════════════════════════════════ */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="py-20 md:py-28"
        style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--accent)' }}>The Solution</p>
            <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-text mb-4"
              style={{ letterSpacing: '-0.03em' }}>
              Every feature solves a psychology problem
            </h2>
            <p className="text-base leading-relaxed" style={{ color: '#8a9bc0' }}>
              Playbuuk doesn&apos;t teach you how to trade. It stops you from trading badly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: CheckCircle2,
                title: 'Auto-detecting checklist',
                problem: 'FOMO / Confirmation bias',
                solution: 'BOS either happened or it didn\'t. The system detects it objectively — no "looks close enough."',
                color: 'var(--accent)',
                bg: 'rgba(0,229,176,0.04)',
                border: 'rgba(0,229,176,0.14)',
              },
              {
                icon: Star,
                title: 'A+ to D+ setup grade',
                problem: 'Overtrading / Impulsive entries',
                solution: 'Real-time weighted score of checklist completion. D+ setups are visibly D+. The ambiguity disappears.',
                color: 'var(--gold)',
                bg: 'rgba(251,191,36,0.04)',
                border: 'rgba(251,191,36,0.14)',
              },
              {
                icon: Zap,
                title: 'Psychology-gated execution',
                problem: 'Revenge trading / FOMO entries',
                solution: 'Execute button disabled below C+. Trade locked means trade locked. Override is logged forever.',
                color: 'var(--info)',
                bg: 'rgba(77,142,255,0.04)',
                border: 'rgba(77,142,255,0.14)',
              },
              {
                icon: Bell,
                title: 'Setup alert notifications',
                problem: 'Chart staring',
                solution: 'Walk away. The platform watches for you. When A+ conditions are met, you get a push. Then you decide.',
                color: '#fb923c',
                bg: 'rgba(251,146,60,0.04)',
                border: 'rgba(251,146,60,0.14)',
              },
              {
                icon: BookOpen,
                title: 'Psychology trade journal',
                problem: 'Plan abandonment / No accountability',
                solution: 'Every trade auto-tagged: grade, override status, emotion, outcome. Patterns surface automatically.',
                color: '#a78bfa',
                bg: 'rgba(167,139,250,0.04)',
                border: 'rgba(167,139,250,0.14)',
              },
              {
                icon: BarChart2,
                title: 'Psychology insights',
                problem: 'No visibility into patterns',
                solution: '"You win 72% on B+ trades but only 18% when you override the gate." The data ends self-deception.',
                color: '#22d3ee',
                bg: 'rgba(34,211,238,0.04)',
                border: 'rgba(34,211,238,0.14)',
              },
            ].map(({ icon: Icon, title, problem, solution, color, bg, border }) => (
              <article
                key={title}
                className="rounded-2xl p-5 flex flex-col gap-3 group transition-all duration-200"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}14`, border: `1px solid ${color}30` }}
                  >
                    <Icon size={15} style={{ color }} aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-text">{title}</h3>
                </div>
                <div
                  className="text-2xs font-mono px-2 py-1 rounded w-fit"
                  style={{ background: `${color}10`, color, border: `1px solid ${color}25` }}
                >
                  Solves: {problem}
                </div>
                <p className="text-xs leading-relaxed flex-1" style={{ color: '#8a9bc0' }}>
                  {solution}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════════════════════════════════ */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="py-20 md:py-24"
        style={{ background: 'linear-gradient(180deg, var(--bg) 0%, rgba(11,17,33,0.6) 50%, var(--bg) 100%)', borderTop: '1px solid rgba(26,40,69,0.5)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="max-w-xl mx-auto text-center mb-14">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--accent)' }}>How It Works</p>
            <h2 id="how-heading" className="text-3xl font-bold text-text mb-4" style={{ letterSpacing: '-0.03em' }}>
              Three steps to disciplined trading
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Follow a mentor',
                body: 'Browse the marketplace, follow any mentor free. Access their strategy summary, golden rules, and core principles instantly.',
                cta: 'Free forever',
                color: 'var(--accent)',
              },
              {
                step: '02',
                icon: Shield,
                title: 'Trade with discipline',
                body: 'Open a playbook. The live checklist auto-evaluates conditions. The grade tells you whether to enter. The gate enforces it.',
                cta: 'Pro — $19.99/mo',
                color: 'var(--gold)',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Improve with insights',
                body: 'Your journal builds psychology data automatically. See your grade compliance, override cost, and emotion patterns over time.',
                cta: 'Included in Pro',
                color: '#4d8eff',
              },
            ].map(({ step, icon: Icon, title, body, cta, color }) => (
              <div
                key={step}
                className="relative rounded-2xl p-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div
                  className="text-4xl font-bold font-mono mb-4 opacity-15 select-none"
                  style={{ color }}
                >
                  {step}
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}12`, border: `1px solid ${color}28` }}
                >
                  <Icon size={18} style={{ color }} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-text mb-2">{title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8a9bc0' }}>{body}</p>
                <span
                  className="text-2xs font-mono px-2 py-1 rounded"
                  style={{ background: `${color}0d`, color, border: `1px solid ${color}22` }}
                >
                  {cta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ PRICING ════════════════════════════════════════════ */}
      <section
        id="pricing"
        aria-labelledby="pricing-heading"
        className="py-20 md:py-28"
        style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-xl mx-auto text-center mb-14">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--accent)' }}>Pricing</p>
            <h2 id="pricing-heading" className="text-3xl font-bold text-text mb-4"
              style={{ letterSpacing: '-0.03em' }}>
              Start free. Upgrade when you&apos;re ready.
            </h2>
            <p className="text-sm" style={{ color: '#8a9bc0' }}>
              No tricks. Follow unlimited mentors free. Full discipline engine for one flat rate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free */}
            <div
              className="rounded-2xl p-6 flex flex-col"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-bold text-text mb-1">Free</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold font-mono text-text">$0</span>
                <span className="text-xs font-mono" style={{ color: '#6b7fa3' }}>/mo</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {['Follow unlimited mentors', 'Strategy summaries + golden rules', 'Mentor pipeline preview', 'Request new mentors'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: '#8a9bc0' }}>
                    <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)' }}
              >
                Start free
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div
              className="rounded-2xl p-6 flex flex-col relative"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,176,0.06) 0%, var(--card) 100%)',
                border: '1px solid rgba(0,229,176,0.25)',
                boxShadow: '0 0 40px rgba(0,229,176,0.08)',
              }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xs font-bold font-mono px-3 py-1 rounded-full"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                Most popular
              </div>
              <p className="text-sm font-bold text-text mb-1">Pro</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold font-mono text-text">$19.99</span>
                <span className="text-xs font-mono" style={{ color: '#6b7fa3' }}>/mo</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  'Everything in Free',
                  'Live auto-detecting checklist',
                  'A+ to D+ setup grading',
                  'Psychology-gated MT5 execution',
                  'Setup alert push notifications',
                  'Trade journal + psychology insights',
                  'Multi-mentor live scanner',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: '#8a9bc0' }}>
                    <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'var(--accent)', color: 'var(--bg)', boxShadow: '0 0 20px rgba(0,229,176,0.3)' }}
              >
                Start Pro
              </Link>
            </div>

            {/* Mentor Direct */}
            <div
              className="rounded-2xl p-6 flex flex-col"
              style={{ background: 'var(--card)', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              <p className="text-sm font-bold text-text mb-1">Mentor Direct</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold font-mono text-text">$9.99</span>
                <span className="text-xs font-mono" style={{ color: '#6b7fa3' }}>/mo per mentor</span>
              </div>
              <p className="text-2xs font-mono mb-4" style={{ color: '#6b7fa3' }}>+ Pro required</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {['Everything in Pro', 'Exclusive mentor-only content', 'Priority alert delivery', 'Direct mentor revenue share (50% to mentor)'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: '#8a9bc0' }}>
                    <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: 'var(--gold)' }}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FAQ ═════════════════════════════════════════════════ */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="py-20 md:py-28"
        style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--accent)' }}>FAQ</p>
            <h2 id="faq-heading" className="text-3xl font-bold text-text mb-4"
              style={{ letterSpacing: '-0.03em' }}>
              Common questions
            </h2>
            <p className="text-sm" style={{ color: '#8a9bc0' }}>
              Everything you need to know about trading psychology and how Playbuuk helps.
            </p>
          </div>

          <FAQAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ════════════ FINAL CTA ═══════════════════════════════════════════ */}
      <section
        aria-labelledby="cta-heading"
        className="py-20 md:py-28"
        style={{ borderTop: '1px solid rgba(26,40,69,0.6)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="relative">
            {/* Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl blur-3xl opacity-10"
              style={{ background: 'var(--accent)' }}
            />

            <div
              className="relative rounded-3xl px-8 py-14"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,176,0.05) 0%, var(--card) 100%)',
                border: '1px solid rgba(0,229,176,0.18)',
              }}
            >
              <p className="text-xs font-mono mb-4" style={{ color: 'var(--accent)' }}>
                Start today — no credit card required
              </p>
              <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-text mb-4"
                style={{ letterSpacing: '-0.03em' }}>
                Your strategy works.
                <br />
                <span style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, #4d8eff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Your psychology doesn&apos;t.
                </span>
              </h2>
              <p className="text-base mb-8 max-w-lg mx-auto leading-relaxed" style={{ color: '#8a9bc0' }}>
                Follow a mentor for free. When you&apos;re ready to trade with full discipline — A+ grades,
                auto-checklists, and the gate — upgrade to Pro.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--bg)',
                    boxShadow: '0 0 40px rgba(0,229,176,0.35)',
                  }}
                >
                  Start your discipline journey
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>

              <p className="text-2xs font-mono mt-6" style={{ color: '#3d5078' }}>
                Not financial advice. Trading carries substantial risk of loss.{' '}
                <Link href="/disclaimer" className="underline underline-offset-2 hover:text-muted transition-colors">
                  Full disclosure
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
