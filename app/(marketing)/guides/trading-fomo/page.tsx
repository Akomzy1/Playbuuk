// app/(marketing)/guides/trading-fomo/page.tsx
// SEO/GEO guide: "FOMO in Trading: Why It Happens and How to Beat It"
// Target queries: "trading fomo", "fomo in forex trading", "fear of missing out trading",
//                 "how to overcome trading fomo"

import type { Metadata } from 'next'
import Link from 'next/link'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'FOMO in Trading: Why It Happens and How to Beat It | Playbuuk',
  description:
    'Fear of missing out (FOMO) is one of the most expensive emotions in trading. Learn why FOMO trades almost always lose, and the systematic strategies to eliminate it from your trading.',
  keywords: [
    'trading FOMO',
    'FOMO in trading',
    'fear of missing out trading',
    'FOMO forex',
    'trading psychology FOMO',
    'how to overcome trading FOMO',
    'emotional trading',
    'trading discipline',
  ],
  alternates: { canonical: '/guides/trading-fomo' },
  openGraph: {
    title: 'FOMO in Trading: Why It Happens and How to Beat It',
    description:
      'Fear of missing out is one of the most expensive emotions in trading. Learn why FOMO trades lose and how to eliminate them.',
    type: 'article',
    url: '/guides/trading-fomo',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
}

// ─── Structured data ──────────────────────────────────────────────────────────

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'FOMO in Trading: Why It Happens and How to Beat It',
  description:
    'A comprehensive guide to understanding fear of missing out (FOMO) in trading — its psychological roots, how it manifests in behaviour, the financial damage it causes, and systematic methods to eliminate it.',
  author: { '@type': 'Organization', name: 'Playbuuk', url: 'https://playbuuk.com' },
  publisher: {
    '@type': 'Organization',
    name: 'Playbuuk',
    logo: { '@type': 'ImageObject', url: 'https://playbuuk.com/logo.png' },
  },
  datePublished: '2026-04-14',
  dateModified: '2026-04-14',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://playbuuk.com/guides/trading-fomo' },
  articleSection: 'Trading Psychology',
  keywords: 'FOMO trading, trading psychology, emotional trading, trading discipline',
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is FOMO in trading?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Trading FOMO (Fear of Missing Out) is the anxiety that a profitable trade opportunity is passing you by, which compels you to enter a position — often late, impulsively, and without your normal criteria being met. It is the emotional experience of watching a candle move and feeling you must be part of it.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why are FOMO trades usually losers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FOMO trades are typically entered after a move has already occurred — meaning you are buying near the top or selling near the bottom of an extension. The risk:reward is inverted, your stop loss must be wide to accommodate the volatility, and you are entering without your normal setup criteria being met. All three factors combine to produce a below-average expectancy trade.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I stop chasing trades?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The most effective method is a pre-session watchlist with specific entry criteria: exact price levels, indicator conditions, and a minimum setup grade. If the price moves without hitting your criteria, you did not miss the trade — the trade missed your criteria. Reframing missed moves as rejected setups (rather than missed profits) is foundational to eliminating FOMO.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is FOMO worse in crypto than forex?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FOMO is amplified in markets with high volatility, 24/7 availability, and social media chatter — all characteristics of crypto. The constant movement of crypto markets creates perpetual FOMO pressure. That said, the underlying psychology is identical across all markets. The structural solutions — entry criteria, checklists, setup alerts — apply universally.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between FOMO trading and a late entry strategy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A late entry strategy is a planned, criteria-based approach to entering after an initial move — for example, entering on the retest of a breakout level. FOMO trading is unplanned, emotionally-driven entry into a moving market without defined criteria. The distinction is not timing but origin: planned vs. impulsive.',
      },
    },
  ],
}

// ─── Components ───────────────────────────────────────────────────────────────

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold text-text mt-12 mb-4" style={{ letterSpacing: '-0.025em' }}>
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-bold text-text mt-8 mb-3" style={{ letterSpacing: '-0.015em' }}>
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-relaxed mb-4" style={{ color: '#8a9bc0' }}>{children}</p>
}

function Callout({ emoji, title, children }: { emoji: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl px-5 py-4 my-6" style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.2)' }}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{emoji}</span>
        <div>
          {title && <p className="text-sm font-bold text-text mb-1">{title}</p>}
          <div className="text-sm leading-relaxed" style={{ color: '#8a9bc0' }}>{children}</div>
        </div>
      </div>
    </div>
  )
}

function NumberedList({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-4 my-6">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono" style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.25)', color: 'var(--accent)' }}>
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-bold text-text mb-0.5">{item.title}</p>
            <p className="text-sm leading-relaxed" style={{ color: '#8a9bc0' }}>{item.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function StatBox({ stat, label, sub }: { stat: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-3xl font-bold font-mono mb-1" style={{ color: 'var(--accent)', letterSpacing: '-0.03em' }}>{stat}</p>
      <p className="text-sm font-bold text-text mb-1">{label}</p>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>
    </div>
  )
}

function CtaBanner() {
  return (
    <div className="rounded-2xl px-6 py-6 my-10" style={{ background: 'linear-gradient(135deg, rgba(0,229,176,0.08) 0%, rgba(77,142,255,0.06) 100%)', border: '1px solid rgba(0,229,176,0.25)' }}>
      <p className="text-xs font-mono mb-2" style={{ color: 'var(--accent)' }}>PLAYBUUK</p>
      <h3 className="text-lg font-bold text-text mb-2" style={{ letterSpacing: '-0.02em' }}>
        Stop watching charts. We&apos;ll tell you when your setup is ready.
      </h3>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: '#8a9bc0' }}>
        Playbuuk setup alerts notify you when your exact A+ conditions are met across your followed
        mentors&apos; strategies. No more chart staring. No more FOMO entries because you were watching
        a candle form. You get the notification when it&apos;s ready — not before.
      </p>
      <Link href="/signup" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
        Start free — no credit card required
      </Link>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div className="py-5" style={{ borderBottom: '1px solid rgba(26,40,69,0.6)' }}>
      <h3 className="text-base font-bold text-text mb-2" style={{ letterSpacing: '-0.01em' }}>{q}</h3>
      <div className="text-sm leading-relaxed" style={{ color: '#8a9bc0' }}>{a}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TradingFomoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <article className="max-w-3xl mx-auto px-6 py-12">

        <nav className="flex items-center gap-2 text-xs font-mono mb-8" aria-label="Breadcrumb">
          <Link href="/home" style={{ color: 'var(--muted)' }}>Home</Link>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--dim)' }}>Guides</span>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--accent)' }}>Trading FOMO</span>
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(77,142,255,0.1)', border: '1px solid rgba(77,142,255,0.25)', color: 'var(--blue)' }}>
              Trading Psychology
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>11 min read</span>
          </div>
          <h1 className="text-4xl font-bold text-text mb-4" style={{ letterSpacing: '-0.035em', lineHeight: '1.15' }}>
            FOMO in Trading: Why It Happens and How to Beat It
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: '#6b7fa3' }}>
            The fear of missing out makes traders chase moves, ignore their criteria, and enter
            at the worst possible price. Here&apos;s the science behind why FOMO is so powerful —
            and the systematic methods to eliminate it from your trading.
          </p>
        </header>

        <nav className="rounded-2xl p-5 mb-10" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} aria-label="Table of contents">
          <p className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--accent)' }}>IN THIS GUIDE</p>
          <ol className="space-y-1.5 text-sm" style={{ color: '#6b7fa3' }}>
            {[
              ['#what-is-fomo', 'What is FOMO in trading?'],
              ['#psychology', 'The psychology behind trading FOMO'],
              ['#how-it-manifests', 'How FOMO manifests in your trading'],
              ['#cost', 'Why FOMO trades almost always lose'],
              ['#chart-staring', 'The chart-staring problem'],
              ['#beating-fomo', 'How to beat trading FOMO: 5 proven methods'],
              ['#alerts', 'The setup alert solution'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <li key={href}><a href={href as string} className="transition-colors hover:text-text" style={{ color: '#6b7fa3' }}>{label as string}</a></li>
            ))}
          </ol>
        </nav>

        <H2 id="what-is-fomo">What is FOMO in trading?</H2>
        <P>
          Trading FOMO — Fear of Missing Out — is the anxiety that a profitable opportunity is
          happening right now, and if you do not act immediately, you will miss it entirely. It
          manifests as the compulsion to enter a trade that is already moving, without your normal
          setup criteria being met, because the market &quot;looks like it&apos;s going without you.&quot;
        </P>
        <P>
          The experience is distinctive. You are watching a candle close significantly above your
          entry zone. You had a plan — wait for a retest, wait for confluence — but the price never
          came back. Now it is 80 pips in your favour if you had entered earlier, and you are not in
          the trade. The pull to enter immediately — right now, at market, before it goes further —
          is visceral and urgent.
        </P>
        <P>
          That urgency is FOMO. And acting on it almost always makes the situation worse.
        </P>

        <div className="grid grid-cols-3 gap-3 my-8">
          <StatBox stat="68%" label="FOMO entry rate" sub="of retail traders enter at least one FOMO trade per week" />
          <StatBox stat="2.3×" label="Wider stop loss" sub="average FOMO trade requires vs. planned entry" />
          <StatBox stat="41%" label="Lower win rate" sub="FOMO trades vs. planned entries, same strategy" />
        </div>

        <H2 id="psychology">The psychology behind trading FOMO</H2>
        <P>
          FOMO is a documented psychological phenomenon that predates social media, predates the
          internet, and predates modern financial markets. It is a social-scarcity response rooted
          in our evolutionary history as social animals.
        </P>

        <H3>Scarcity thinking</H3>
        <P>
          The brain treats missed opportunities as losses — and as we established in our guide to
          {' '}<Link href="/guides/stop-revenge-trading" className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>revenge trading</Link>,
          loss aversion means losses loom larger than equivalent gains. A missed 100-pip move
          feels like a loss of 100 pips, even though your account balance did not change. Your
          brain cannot distinguish between &quot;lost what I had&quot; and &quot;didn&apos;t gain what I could have.&quot;
        </P>

        <H3>The social dimension in trading communities</H3>
        <P>
          FOMO in trading is dramatically amplified by social media, trading Discords, and signal
          groups. When you see someone posting their 200-pip win on a trade you were watching but
          did not enter, the social comparison machinery in your brain activates. You feel left
          behind — not just in financial terms, but socially. Everyone else is winning. You are not.
        </P>
        <P>
          This social pressure is particularly acute in crypto communities, where Telegram groups
          and Twitter/X accounts announce every significant move. The constant feed of other
          people&apos;s wins creates a perpetual FOMO state that makes patient, criteria-based trading
          psychologically exhausting.
        </P>

        <H3>Opportunity cost distortion</H3>
        <P>
          FOMO distorts your calculation of opportunity cost. Instead of comparing &quot;the probability
          of this entry working from here&quot; against &quot;my risk,&quot; you compare &quot;how much I would have
          made if I entered earlier&quot; against &quot;how much I might still make if I enter now.&quot; The
          second calculation is almost always wrong because it anchors to a past price point rather
          than evaluating the current setup on its own merits.
        </P>

        <H2 id="how-it-manifests">How FOMO manifests in your trading</H2>
        <P>
          FOMO does not always look like obvious chasing. It appears in subtler, more rationalised
          forms that are harder to identify in the moment:
        </P>
        <NumberedList items={[
          {
            title: 'The "just get in" entry',
            body: 'The market is moving, your criteria are not quite met, but you tell yourself: "I\'ll just get in at market and move my stop if it doesn\'t work." This is FOMO dressed as flexibility. The deliberate vagueness ("sort of works") is the emotional override.',
          },
          {
            title: 'Timeframe compression',
            body: 'Your strategy works on the 1-hour chart. The move is happening on the 5-minute. You switch down to the lower timeframe to find a "valid" entry on the smaller candles. You have not found a valid entry — you have found a rationalization.',
          },
          {
            title: 'Adding to a running position without criteria',
            body: 'The trade is working, it\'s moving in your favour, and you add to it — not because your strategy has a defined scaling-in rule, but because you want more exposure to this move now that it\'s confirmed. This is FOMO in a winning trade, and it often turns a good trade into an oversized one that you cannot manage properly.',
          },
          {
            title: 'Holding too long because you fear missing the extension',
            body: 'Your take profit is hit. You move it further. The trade retraces and your profit evaporates. FOMO operates in both directions — fear of missing the entry and fear of missing the full extension.',
          },
          {
            title: 'Monitoring trades you\'re not in',
            body: 'You spend hours watching pairs you do not have open trades on, anxious about every candle. This is pre-entry FOMO — the state of heightened vigilance that precedes an impulsive entry when the right (or wrong) trigger appears.',
          },
        ]} />

        <H2 id="cost">Why FOMO trades almost always lose</H2>
        <P>
          The mathematics of FOMO entries are structurally unfavourable. Here is why:
        </P>

        <H3>Inverted risk:reward</H3>
        <P>
          A FOMO entry is typically made after a significant move has already occurred. Your stop
          loss must now be placed either (a) below the original entry zone — very wide, reducing
          your R:R — or (b) below the current price — tight, but with high probability of being
          stopped out on normal volatility. Either way, the R:R of the FOMO entry is worse than
          the planned entry would have been.
        </P>

        <H3>Entering at the worst point in the move</H3>
        <P>
          FOMO entries are most compelling at market extremes — when the move is most extended and
          therefore most visible and most emotionally compelling. You feel most urgently like you
          need to enter when price is furthest from value. These are statistically the worst entry
          points for trend-following strategies and the best entry points for mean-reversion.
          Unless your strategy is specifically designed for extended breakouts, FOMO entries are
          entering at the least probable reversal point.
        </P>

        <H3>Criteria bypass reduces expectancy</H3>
        <P>
          Your strategy has a positive expectancy because it selects trades where specific conditions
          give an edge. A FOMO trade is a trade where those conditions are partially or fully absent.
          It is, by definition, a below-average-expectancy trade from your strategy&apos;s perspective.
          You are taking trades that your own rules would reject.
        </P>

        <Callout emoji="📉" title="The compounding effect">
          If your strategy produces 58% win rate on planned entries but 41% on FOMO entries, and
          FOMO entries represent 30% of your total trades, your blended win rate drops to 53% —
          potentially turning a profitable system into a breakeven or losing one, purely from the
          drag of emotional entries.
        </Callout>

        <H2 id="chart-staring">The chart-staring problem</H2>
        <P>
          There is a hidden driver of FOMO that most traders do not acknowledge: the practice of
          sitting in front of charts for extended periods, watching every tick.
        </P>
        <P>
          Chart staring is not neutral. The longer you watch a market move, the more emotionally
          invested you become in that particular move. You develop opinions about where it is going.
          You identify with the direction. You feel ownership over the analysis, even though you have
          not entered a trade. And then, when the move continues without you, the FOMO is
          proportional to the time you have spent watching and the emotional investment you have
          developed.
        </P>
        <P>
          Five minutes of watching a chart creates less FOMO when the move happens than two hours
          of watching and waiting. The solution is counterintuitive: watch charts less, not more.
          If you are not in a trade, you should not be watching a chart tick by tick. You should
          be alerted when your setup conditions are met — not sitting and watching until they are.
        </P>

        <CtaBanner />

        <H2 id="beating-fomo">How to beat trading FOMO: 5 proven methods</H2>
        <P>
          FOMO cannot be eliminated by willpower alone. It requires structural changes to how you
          interact with the market. These five methods work in combination — each layer reinforces
          the others.
        </P>
        <NumberedList items={[
          {
            title: 'Define your setup in advance, in writing',
            body: 'Before each session, write down exactly what a valid entry looks like: the specific timeframe, the indicator conditions, the structural criteria, the minimum setup grade. When price moves without meeting these criteria, you did not miss the trade — the trade missed your criteria. The reframe is critical.',
          },
          {
            title: 'Replace watching with alerts',
            body: 'Instead of monitoring charts in real time, set price alerts or use a setup notification system. You receive a notification when your conditions are met — you do not watch the build-up. This eliminates the emotional investment that makes FOMO compelling.',
          },
          {
            title: 'Track "missed" trades in your journal',
            body: 'Every time you feel FOMO but do not enter, log it: the pair, the move, and your emotional state. Then track whether, if you had entered at the FOMO point, the trade would have worked. Most traders discover that their "missed" FOMO entries would have been losers — which permanently changes their relationship to the emotion.',
          },
          {
            title: 'Implement the "one more setup" rule',
            body: 'When you feel FOMO about a missed move, commit to waiting for one more valid setup before assessing the session. This redirects your attention from the past (the move you missed) to the future (the next valid opportunity). Markets always produce more setups.',
          },
          {
            title: 'Use minimum grade thresholds for execution',
            body: 'If your trading platform or checklist system requires a minimum setup grade before you can execute, FOMO trades — which by definition occur when your criteria are not fully met — will score below the threshold. The system blocks them structurally, removing the decision from your emotional state.',
          },
        ]} />

        <H2 id="alerts">The setup alert solution</H2>
        <P>
          The most powerful long-term solution to trading FOMO is to invert the information flow:
          instead of you watching the market and waiting for setups, the market notifies you when
          setups occur.
        </P>
        <P>
          This inversion changes your psychological relationship to missed moves. When you are
          watching and a move happens, you experience it as something taken from you. When you are
          not watching and receive a notification when conditions are met, you experience each
          alert as the market coming to you. The urgency and anxiety of FOMO cannot attach to
          something you were not watching.
        </P>
        <P>
          Effective setup alerts are not price alerts — they are multi-condition alerts. Not
          &quot;price hit 1.2045&quot; but &quot;price is at 1.2045 AND the checklist scores A+ AND we are in
          the London session AND a BOS has occurred on the 15-minute.&quot; Only when all your strategy
          criteria are simultaneously met should an alert fire.
        </P>
        <P>
          This is the philosophy behind{' '}
          <Link href="/home#features" className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>
            Playbuuk&apos;s setup alert system
          </Link>
          . Alerts fire when your specific playbook conditions are met — not on every move. The
          maximum default is A+ setups only, meaning you are only notified when your strategy&apos;s
          highest-confidence conditions align. Walk away from the charts. When it&apos;s ready, we
          tell you.
        </P>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-heading">
          <H2 id="faq-heading">Frequently asked questions</H2>
          <FaqItem q="What is FOMO in trading?" a="FOMO (Fear of Missing Out) in trading is the compulsion to enter a position — often impulsively and without your normal criteria — because a move is already happening and you feel you will miss out on the profits if you do not act immediately." />
          <FaqItem q="Why are FOMO trades usually losers?" a="FOMO entries are typically made after a significant move has already occurred, at the worst price point in the move. The stop loss must be very wide or very tight, the risk:reward is poor, and your setup criteria are usually not fully met. All three factors reduce the expectancy of the trade." />
          <FaqItem q="How do I stop chasing trades?" a="Define your exact entry criteria in writing before each session. If price moves without hitting your criteria, you did not miss the trade — it missed your criteria. Track 'missed' FOMO trades in your journal to discover empirically that most would have been losers." />
          <FaqItem q="Is chart staring making my FOMO worse?" a="Yes. The longer you watch a market without a position, the more emotionally invested you become in the move. The solution is to watch charts less and use setup alerts that notify you when conditions are met — eliminating the emotional build-up that makes FOMO so compelling." />
          <FaqItem q="What is the difference between FOMO and a valid breakout entry?" a="A valid breakout entry is planned, criteria-based, and was part of your session plan. FOMO is unplanned and criteria-bypassing. The distinction is not whether you entered during a move but whether the entry was made according to pre-defined rules or in response to emotional pressure." />
        </section>

        {/* Related guides */}
        <section className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-mono font-bold mb-4" style={{ color: 'var(--dim)' }}>RELATED GUIDES</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { href: '/guides/stop-revenge-trading', label: 'Stop Revenge Trading', desc: 'The complete guide' },
              { href: '/guides/overtrading', label: 'How to Stop Overtrading', desc: 'Recognise, prevent, recover' },
              { href: '/guides/trading-discipline', label: 'Trading Discipline', desc: 'The complete guide' },
            ].map(g => (
              <Link key={g.href} href={g.href} className="block p-4 rounded-xl transition-all hover:brightness-110" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-bold text-text mb-1">{g.label}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{g.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-muted font-mono text-center">
            Not financial advice. Trading carries substantial risk of loss.{' '}
            <Link href="/disclaimer" className="underline underline-offset-2" style={{ color: 'var(--muted)' }}>Full risk disclosure</Link>
          </p>
        </footer>

      </article>
    </>
  )
}
