// app/(marketing)/guides/overtrading/page.tsx
// SEO/GEO guide: "How to Stop Overtrading: Recognise, Prevent, Recover"
// Target queries: "how to stop overtrading", "overtrading forex", "signs of overtrading",
//                 "overtrading trading psychology", "why do traders overtrade"

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How to Stop Overtrading: Recognise, Prevent, Recover | Playbuuk',
  description:
    'Overtrading is one of the most common — and most expensive — mistakes in retail trading. Learn the different types of overtrading, why it happens, how to recognise it in yourself, and the proven methods to stop.',
  keywords: [
    'how to stop overtrading',
    'overtrading',
    'overtrading forex',
    'signs of overtrading',
    'overtrading psychology',
    'too many trades',
    'trading frequency',
    'trading discipline',
  ],
  alternates: { canonical: '/guides/overtrading' },
  openGraph: {
    title: 'How to Stop Overtrading: Recognise, Prevent, Recover',
    description: 'Learn the different types of overtrading, why it happens, and the proven methods to stop.',
    type: 'article',
    url: '/guides/overtrading',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
}

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Stop Overtrading: Recognise, Prevent, Recover',
  description: 'A comprehensive guide to understanding overtrading — its different forms, psychological causes, financial impact, and proven methods to stop and recover.',
  author: { '@type': 'Organization', name: 'Playbuuk', url: 'https://playbuuk.com' },
  publisher: { '@type': 'Organization', name: 'Playbuuk', logo: { '@type': 'ImageObject', url: 'https://playbuuk.com/logo.png' } },
  datePublished: '2026-04-14',
  dateModified: '2026-04-14',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://playbuuk.com/guides/overtrading' },
  articleSection: 'Trading Psychology',
  keywords: 'overtrading, trading psychology, trading discipline, stop overtrading',
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is overtrading?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Overtrading means trading more frequently than your strategy requires — entering setups that do not meet your criteria, trading during sessions your strategy is not designed for, or taking so many positions simultaneously that you cannot manage them properly. It can also refer to trading with position sizes too large for your account, which is overtrading in a risk sense.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are the signs of overtrading?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Key signs of overtrading include: trading every day regardless of conditions, feeling uncomfortable when you are not in a trade, taking setups that clearly do not meet your criteria, having more than your normal maximum number of concurrent open trades, trading through news events outside your plan, and feeling the need to "make something happen" rather than wait for the market.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why do traders overtrade?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Overtrading is driven by several psychological factors: the need for stimulation (trading is exciting and addictive), the inability to tolerate inactivity, the belief that more trading equals more opportunity, the need to recover losses (which leads to entering marginal setups), and confirmation bias that makes below-criteria setups look valid when you want to trade.',
      },
    },
    {
      '@type': 'Question',
      name: 'How many trades per day is normal?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The correct number of trades per day depends entirely on your strategy. A scalper might take 20+ trades per day by design. A swing trader might take 2-3 per week. "Normal" is whatever frequency your strategy produces when you are trading only valid setups. If your frequency is driven by the desire to trade rather than the presence of setups, it is overtrading regardless of the number.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does overtrading always mean too many trades?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Overtrading can mean too many trades (frequency overtrading), too large position sizes (size overtrading), too many simultaneous open positions (exposure overtrading), or trading in conditions outside your strategy\'s design (scope overtrading). All four types share the characteristic of taking on more than your strategy and risk management rules specify.',
      },
    },
  ],
}

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-2xl font-bold text-text mt-12 mb-4" style={{ letterSpacing: '-0.025em' }}>{children}</h2>
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold text-text mt-8 mb-3" style={{ letterSpacing: '-0.015em' }}>{children}</h3>
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
          <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono" style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.25)', color: 'var(--accent)' }}>{i + 1}</span>
          <div>
            <p className="text-sm font-bold text-text mb-0.5">{item.title}</p>
            <p className="text-sm leading-relaxed" style={{ color: '#8a9bc0' }}>{item.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function TypeCard({ type, definition, example, fix }: { type: string; definition: string; example: string; fix: string }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-mono font-bold mb-2" style={{ color: 'var(--accent)' }}>{type}</p>
      <p className="text-sm font-bold text-text mb-2">{definition}</p>
      <div className="space-y-2 text-xs" style={{ color: '#8a9bc0' }}>
        <p><span className="font-semibold text-text">Example:</span> {example}</p>
        <p><span className="font-semibold text-text">Fix:</span> {fix}</p>
      </div>
    </div>
  )
}

function CtaBanner() {
  return (
    <div className="rounded-2xl px-6 py-6 my-10" style={{ background: 'linear-gradient(135deg, rgba(0,229,176,0.08) 0%, rgba(77,142,255,0.06) 100%)', border: '1px solid rgba(0,229,176,0.25)' }}>
      <p className="text-xs font-mono mb-2" style={{ color: 'var(--accent)' }}>PLAYBUUK</p>
      <h3 className="text-lg font-bold text-text mb-2" style={{ letterSpacing: '-0.02em' }}>
        The setup grade that stops you taking C-grade setups
      </h3>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: '#8a9bc0' }}>
        Playbuuk evaluates every potential trade against your strategy criteria and shows a clear
        A+ to D+ grade. When your setup is D+, the grade tells you: not this one. Wait.
        The psychology-gated execution gate enforces your minimum threshold automatically.
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

export default function OvertradingPage() {
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
          <span style={{ color: 'var(--accent)' }}>Stop Overtrading</span>
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.25)', color: 'var(--accent)' }}>
              Trading Psychology
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>13 min read</span>
          </div>
          <h1 className="text-4xl font-bold text-text mb-4" style={{ letterSpacing: '-0.035em', lineHeight: '1.15' }}>
            How to Stop Overtrading: Recognise, Prevent, Recover
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: '#6b7fa3' }}>
            Overtrading is not just about trading too much — it is about taking any trade your
            strategy would not approve. Here is how to identify the four types of overtrading,
            why your brain drives you toward it, and how to permanently stop.
          </p>
        </header>

        <nav className="rounded-2xl p-5 mb-10" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} aria-label="Table of contents">
          <p className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--accent)' }}>IN THIS GUIDE</p>
          <ol className="space-y-1.5 text-sm" style={{ color: '#6b7fa3' }}>
            {[
              ['#what-is', 'What is overtrading? (4 types)'],
              ['#signs', 'Signs you are overtrading right now'],
              ['#why', 'The psychology of overtrading'],
              ['#cost', 'What overtrading costs you'],
              ['#prevent', 'How to prevent overtrading: 6 proven methods'],
              ['#grade', 'The setup grade as an overtrading filter'],
              ['#recover', 'How to recover from an overtrading session'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <li key={href}><a href={href as string} className="hover:text-text transition-colors" style={{ color: '#6b7fa3' }}>{label as string}</a></li>
            ))}
          </ol>
        </nav>

        <H2 id="what-is">What is overtrading? The four types</H2>
        <P>
          &quot;Overtrading&quot; is often used to mean simply &quot;trading too often.&quot; That is one type of
          overtrading but not the only one. A complete understanding covers four distinct patterns,
          each with different causes and different solutions:
        </P>

        <div className="grid sm:grid-cols-2 gap-4 my-6">
          <TypeCard
            type="FREQUENCY OVERTRADING"
            definition="Entering more trades than your strategy produces valid setups for"
            example="Your system generates 3-5 setups per week but you are taking 15-20 trades"
            fix="Maximum daily trade limit; setup grade minimum before entry is enabled"
          />
          <TypeCard
            type="SIZE OVERTRADING"
            definition="Taking larger positions than your risk management rules specify"
            example="Your rule is 1% risk per trade but after a win you took 3% on the next one"
            fix="Fixed percentage position sizing calculated before each trade; broker lot size cap"
          />
          <TypeCard
            type="EXPOSURE OVERTRADING"
            definition="Holding too many simultaneous positions, creating correlated risk"
            example="Open 5 trades on EURUSD, GBPUSD, AUDUSD simultaneously — all USD-correlated"
            fix="Maximum open positions rule; portfolio correlation check before entry"
          />
          <TypeCard
            type="SCOPE OVERTRADING"
            definition="Trading in sessions, instruments, or market conditions outside your strategy's design"
            example="Your strategy is designed for London session but you start trading Asian session out of boredom"
            fix="Session filter; watchlist restricted to strategy's instruments only"
          />
        </div>

        <P>
          Most traders experience frequency overtrading most often, but all four types produce the
          same outcome: results that diverge from your strategy&apos;s theoretical expectancy. When
          your live results are consistently worse than your backtested performance, overtrading
          in one of these four forms is usually the explanation.
        </P>

        <H2 id="signs">Signs you are overtrading right now</H2>
        <P>
          Overtrading is difficult to recognise in the moment because each individual trade
          feels justified. The problem is cumulative — you only see it clearly in aggregate.
          These are the real-time signals to watch for:
        </P>
        <NumberedList items={[
          {
            title: 'You feel uncomfortable when you have no open trades',
            body: 'If sitting in cash creates anxiety — a feeling that you are missing out or not participating — that discomfort is a psychological driver of overtrading. Healthy trading means being comfortable waiting. If waiting feels wrong, the compulsion to trade is active.',
          },
          {
            title: 'You are trading every market session regardless of conditions',
            body: 'Trading every day is not bad in itself — but if your reason for trading Monday is "it\'s Monday" rather than "there are valid setups today," you are frequency overtrading. Quality strategies are not uniformly distributed across time.',
          },
          {
            title: 'Your setup grades are declining over the session',
            body: 'You started the day with an A+ entry. Your second trade was B+. Your third was C. Your fourth was "D+ but I thought it might work." This declining quality curve is the signature of overtrading — the first trade met criteria; subsequent trades were entered because you wanted to trade, not because setups appeared.',
          },
          {
            title: 'Your position size increased after a win',
            body: 'Size overtrading often follows winning streaks. The overconfidence of a run of profitable trades leads to "the next one will work too" reasoning and position size inflation beyond your rules.',
          },
          {
            title: 'You are taking trades on instruments you do not normally trade',
            body: 'Scope overtrading often presents as searching for setups: when your usual pairs are not offering valid entries, you start scrolling through other instruments looking for something that "looks good." The searching behaviour is the tell.',
          },
          {
            title: 'Your trade count this session is materially above your average',
            body: 'Simple arithmetic: if your historical average is 2 trades per session and today you\'ve taken 7 by midday, you are almost certainly overtrading. The excess trades are unlikely to be strategy-aligned.',
          },
        ]} />

        <H2 id="why">The psychology of overtrading</H2>
        <P>
          Overtrading is not random. It is driven by identifiable psychological mechanisms that
          are predictable and, importantly, addressable:
        </P>

        <H3>Action bias</H3>
        <P>
          Action bias — the preference for doing something over doing nothing — is one of the
          most documented phenomena in behavioural science. In trading, this manifests as the
          compelling urge to be &quot;in the market&quot; rather than waiting. Doing nothing feels like
          failing to act, even when waiting is the strategically correct choice.
        </P>
        <P>
          Action bias is amplified by the trading environment: charts are always moving, platforms
          are designed for engagement, and social media celebrates active traders. The cultural
          narrative of trading rewards activity, not patience.
        </P>

        <H3>Boredom and stimulation-seeking</H3>
        <P>
          Trading is stimulating. The dopamine response to trade entries, price movement, and
          outcomes is real and measurable. For some traders, the stimulation itself becomes a
          driver of trade frequency — they are not seeking profits but seeking the experience
          of trading. This is the closest trading psychology gets to gambling psychology, and
          it requires honest self-examination.
        </P>

        <H3>Loss recovery compulsion</H3>
        <P>
          After a losing trade or session, the compulsion to &quot;make it back&quot; is powerful. This
          compulsion drives traders to take marginal setups they would normally pass on — which
          we covered in detail in our guide to{' '}
          <Link href="/guides/stop-revenge-trading" className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>
            revenge trading
          </Link>
          . Loss recovery compulsion is the most dangerous driver of frequency overtrading because
          the emotional urgency is highest when the rational capacity to evaluate setups is lowest.
        </P>

        <H3>Confirmation bias</H3>
        <P>
          When you want to trade, you find setups. The same chart that would not justify entry
          when you are in a calm, non-trading mindset looks compelling when you are actively
          searching for a reason to enter. You will focus on the confirming evidence (the
          indicator pointing in your direction) and discount the disconfirming evidence (the
          structure that says otherwise). This is confirmation bias, and it is one of the
          most difficult biases to overcome because it operates below conscious awareness.
        </P>

        <Callout emoji="🔬" title="The research on discretionary traders">
          Studies on discretionary trader behaviour consistently find that setup quality declines
          as session length increases. The first trade of a session has the highest probability
          of meeting full strategy criteria. By the fifth trade, average criteria compliance has
          dropped significantly — not because setups deteriorated, but because the trader&apos;s
          evaluation standards loosened as the desire to trade accumulated.
        </Callout>

        <H2 id="cost">What overtrading costs you</H2>
        <P>
          The financial cost of overtrading is significant but not always immediately visible,
          because overtraded sessions often contain some winning trades. The hidden costs operate
          across three dimensions:
        </P>

        <H3>Transaction costs compound</H3>
        <P>
          Every trade incurs a spread, commission, or both. These costs are small individually
          but compound against you when you take twice as many trades as your strategy requires.
          A forex trader paying 1.2 pip spread per round trip who doubles their trade frequency
          from 60 to 120 trades per month doubles their transaction cost drag — potentially
          turning a marginally profitable strategy into a losing one purely from cost.
        </P>

        <H3>Expectancy dilution</H3>
        <P>
          Your strategy&apos;s positive expectancy exists because you select from the subset of
          market situations where your edge applies. When you overtrade, you are adding trades
          from outside that subset — trades where your edge is absent or negative. These trades
          dilute your blended expectancy. If 40% of your trades are below-criteria overtrading
          entries with negative expectancy, your overall performance must be significantly
          above-expectancy on the valid trades just to break even.
        </P>

        <H3>Attention and decision quality</H3>
        <P>
          Decision quality degrades with the number of decisions made. Managing 6 simultaneous
          open trades consumes more cognitive bandwidth than managing 2. When exposure overtrading
          creates a portfolio of positions that all require monitoring and management, individual
          trade management quality falls — stops are not adjusted correctly, profits are not
          taken at plan, and risk accumulates.
        </P>

        <H2 id="prevent">How to prevent overtrading: 6 proven methods</H2>
        <NumberedList items={[
          {
            title: 'Set a maximum trades-per-session limit',
            body: 'Determine your strategy\'s natural frequency based on historical valid setups and set a hard maximum slightly above that number. When you hit the limit, trading ends for the session. This prevents the declining-quality-curve pattern where early valid trades are followed by progressively marginal ones.',
          },
          {
            title: 'Require a minimum setup grade before entry',
            body: 'If you use an objective grading system (A+ to D+), set a minimum grade of B+ or C+ for execution. Below that threshold, the trade does not get entered regardless of how it feels. The grade acts as an objective filter that your emotional brain cannot override.',
          },
          {
            title: 'Restrict your watchlist to strategy instruments only',
            body: 'Remove from your platform any instrument you do not trade in your strategy. If you are a EURUSD/GBPUSD trader, you should not see NZDCAD on your screen. Removing scope temptations prevents scope overtrading at the environment level.',
          },
          {
            title: 'Pre-session planning with specific setup identification',
            body: 'Before each session, write down exactly which pairs you are watching, at which levels you would consider an entry, and what conditions must be present. If price does not come to your levels or meet your conditions, you do not trade. You evaluate what happened after the session — not in real time when emotion is engaged.',
          },
          {
            title: 'Implement a 30-minute no-entry window after any loss',
            body: 'The most dangerous overtrading window is immediately after a loss. Enforce a mandatory 30-minute pause. During this time you may watch charts but not enter trades. This breaks the loss-recovery compulsion cycle that drives the worst overtrading.',
          },
          {
            title: 'Journal your overtrading metrics separately',
            body: 'Track not just your win rate and P&L but your below-criteria trade rate: what percentage of your trades failed to meet your full entry criteria? Watching this number — and knowing you will review it at week\'s end — creates the Hawthorne effect: the measurement itself improves the behaviour.',
          },
        ]} />

        <CtaBanner />

        <H2 id="grade">The setup grade as an overtrading filter</H2>
        <P>
          One of the most powerful structural interventions against overtrading is an objective
          setup grading system that evaluates every potential entry before you can act on it.
        </P>
        <P>
          The grading concept is simple: before entering any trade, your checklist evaluates
          each entry criterion and produces a score. A+ means all criteria are met at high
          confidence. D+ means few criteria are met. Your execution gate — the minimum grade
          you will accept — filters out the overtraded entries automatically.
        </P>
        <P>
          Critically, the grade is evaluated against your strategy&apos;s criteria, not your feeling
          about the trade. A trade that &quot;feels like an A+ but is actually a D+&quot; scores D+.
          The emotional assessment and the objective assessment can diverge significantly —
          and the grade reveals that divergence in real time, before you act on the emotion.
        </P>
        <P>
          Over time, reviewing your grade distribution reveals your overtrading profile.
          If your win rate on A+ trades is 72% but you have an equal number of C+ and D+ trades
          that perform at 38%, eliminating those trades by enforcing a B+ minimum would transform
          your performance — without changing your strategy at all, just your trade selection.
        </P>

        <H2 id="recover">How to recover from an overtrading session</H2>
        <P>
          If you recognise that today&apos;s session has been an overtrading session, the most
          important step is to stop immediately. Do not attempt to trade your way out of the
          hole created by the overtrading — that is the revenge-trading impulse operating and
          it will make the situation worse.
        </P>
        <NumberedList items={[
          {
            title: 'Stop trading for the day',
            body: 'Close your platform. The session is over. There will be another session tomorrow with fresh conditions and a fresh psychological state.',
          },
          {
            title: 'Journal what happened without self-judgment',
            body: 'Record the session: which trades were valid, which were not, what the emotional state was at each entry, and what the trigger was for the overtrading behaviour. This analysis is data, not self-criticism.',
          },
          {
            title: 'Identify the specific trigger',
            body: 'Was the overtrading triggered by a loss, by boredom, by a missed move, by social media? Identifying the specific trigger allows you to design a guardrail for that specific situation before the next session.',
          },
          {
            title: 'Add one structural rule before next session',
            body: 'Based on what you learned, implement one additional guardrail: a maximum trade count, a minimum grade threshold, a no-entry window after loss. Systems are built iteratively — one overtrading session should produce one new rule.',
          },
        ]} />

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-heading">
          <H2 id="faq-heading">Frequently asked questions</H2>
          <FaqItem q="What is overtrading?" a="Overtrading means taking trades that your strategy would not approve — either too many trades (frequency), too large position sizes (size), too many simultaneous positions (exposure), or trading in conditions outside your strategy's design (scope)." />
          <FaqItem q="What are the signs of overtrading?" a="The most common signs: feeling uncomfortable when not in a trade, taking trades with declining setup quality through a session, trading every day regardless of conditions, increasing position size after wins, and taking trades on instruments outside your strategy's watchlist." />
          <FaqItem q="Why do traders overtrade?" a="Overtrading is driven by action bias (preference for doing over waiting), stimulation-seeking (trading is exciting), loss recovery compulsion after losses, and confirmation bias that makes below-criteria setups look valid when you want to trade." />
          <FaqItem q="How many trades per day is overtrading?" a="There is no universal number. The right number of trades per day is whatever number your strategy produces when you only trade valid setups. If you are trading more frequently than your strategy's historical valid setup frequency, you are overtrading." />
          <FaqItem q="Can overtrading be fixed?" a="Yes, through structural interventions: maximum trade limits, minimum setup grade thresholds, mandatory cool-down periods after losses, and watchlist restrictions. Overtrading is a system design problem, not a character flaw. The solution is designing a trading environment that makes overtrading difficult." />
        </section>

        <section className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-mono font-bold mb-4" style={{ color: 'var(--dim)' }}>RELATED GUIDES</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { href: '/guides/stop-revenge-trading', label: 'Stop Revenge Trading', desc: 'The complete guide' },
              { href: '/guides/trading-fomo', label: 'FOMO in Trading', desc: 'Why it happens and how to beat it' },
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
