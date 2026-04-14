// app/(marketing)/guides/stop-revenge-trading/page.tsx
// SEO/GEO guide: "How to Stop Revenge Trading"
// Target queries: "how to stop revenge trading", "revenge trading psychology",
//                 "revenge trading forex", "why do i revenge trade"

import type { Metadata } from 'next'
import Link from 'next/link'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'How to Stop Revenge Trading: A Complete Guide | Playbuuk',
  description:
    'Revenge trading destroys more trading accounts than bad strategies. Learn what causes it, how to recognise the warning signs, and the proven psychological techniques to stop it permanently.',
  keywords: [
    'how to stop revenge trading',
    'revenge trading',
    'revenge trading forex',
    'revenge trading psychology',
    'stop revenge trading',
    'trading psychology',
    'emotional trading',
    'trading discipline',
  ],
  alternates: { canonical: '/guides/stop-revenge-trading' },
  openGraph: {
    title: 'How to Stop Revenge Trading: A Complete Guide',
    description:
      'Revenge trading destroys more accounts than bad strategies. Learn the psychology behind it and how to stop it permanently.',
    type: 'article',
    url: '/guides/stop-revenge-trading',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
}

// ─── Structured data ──────────────────────────────────────────────────────────

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Stop Revenge Trading: A Complete Guide',
  description:
    'A comprehensive guide to understanding revenge trading psychology, recognising the warning signs, and implementing strategies to stop revenge trading permanently.',
  author: { '@type': 'Organization', name: 'Playbuuk', url: 'https://playbuuk.com' },
  publisher: {
    '@type': 'Organization',
    name: 'Playbuuk',
    logo: { '@type': 'ImageObject', url: 'https://playbuuk.com/logo.png' },
  },
  datePublished: '2026-04-14',
  dateModified: '2026-04-14',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://playbuuk.com/guides/stop-revenge-trading' },
  articleSection: 'Trading Psychology',
  keywords: 'revenge trading, trading psychology, emotional trading, trading discipline',
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is revenge trading?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Revenge trading is the act of entering a new trade immediately after a loss with the primary motivation of recovering that loss quickly — rather than because a valid setup exists. It is driven by emotion, specifically anger, frustration, or desperation, rather than strategy.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why do traders revenge trade?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Revenge trading is triggered by loss aversion — the psychological pain of losing is roughly twice as powerful as the pleasure of an equivalent gain. When traders lose, their brain enters a threat-response state that overrides rational thinking and pushes them to act immediately to eliminate the pain of the loss.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I know if I am revenge trading?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Key signs include: entering a trade within minutes of a loss with no clear setup, increasing your position size after a losing trade, trading pairs or instruments outside your usual strategy, feeling angry or desperate when you press the buy/sell button, and ignoring your checklist or entry criteria.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can revenge trading be cured permanently?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Revenge trading cannot be "cured" in the way a disease is cured, but it can be systematically prevented through structural guardrails — daily loss limits, mandatory cool-down periods after losses, objective entry criteria enforced by a checklist, and journalling to identify your personal emotional triggers.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best way to stop revenge trading?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The most effective approach combines three layers: (1) structural rules that physically prevent you from entering bad trades — a hard daily loss limit and a mandatory 30-minute pause after any loss; (2) an objective entry checklist that requires a minimum grade before execution; and (3) a trade journal that tracks revenge-trade patterns so you can identify and address your personal triggers.',
      },
    },
  ],
}

// ─── Components ───────────────────────────────────────────────────────────────

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-2xl font-bold text-text mt-12 mb-4"
      style={{ letterSpacing: '-0.025em' }}
    >
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-lg font-bold text-text mt-8 mb-3"
      style={{ letterSpacing: '-0.015em' }}
    >
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-relaxed mb-4" style={{ color: '#8a9bc0' }}>{children}</p>
}

function Callout({ emoji, title, children }: { emoji: string; title?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl px-5 py-4 my-6"
      style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.2)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{emoji}</span>
        <div>
          {title && (
            <p className="text-sm font-bold text-text mb-1">{title}</p>
          )}
          <div className="text-sm leading-relaxed" style={{ color: '#8a9bc0' }}>{children}</div>
        </div>
      </div>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl px-5 py-4 my-6"
      style={{ background: 'rgba(255,77,106,0.05)', border: '1px solid rgba(255,77,106,0.2)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <div className="text-sm leading-relaxed" style={{ color: '#c0a0a8' }}>{children}</div>
      </div>
    </div>
  )
}

function NumberedList({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-4 my-6">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <span
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
            style={{
              background: 'rgba(0,229,176,0.1)',
              border: '1px solid rgba(0,229,176,0.25)',
              color: 'var(--accent)',
            }}
          >
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 my-4 pl-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm" style={{ color: '#8a9bc0' }}>
          <span className="flex-shrink-0 font-mono font-bold mt-0.5" style={{ color: 'var(--accent)' }}>→</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

function CtaBanner() {
  return (
    <div
      className="rounded-2xl px-6 py-6 my-10"
      style={{
        background: 'linear-gradient(135deg, rgba(0,229,176,0.08) 0%, rgba(77,142,255,0.06) 100%)',
        border: '1px solid rgba(0,229,176,0.25)',
      }}
    >
      <p className="text-xs font-mono mb-2" style={{ color: 'var(--accent)' }}>PLAYBUUK</p>
      <h3 className="text-lg font-bold text-text mb-2" style={{ letterSpacing: '-0.02em' }}>
        Stop revenge trading with structural guardrails
      </h3>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: '#8a9bc0' }}>
        Playbuuk enforces your entry criteria before every trade. The checklist evaluates your setup
        objectively — no grade, no execution. You can&apos;t revenge trade your way past a D+ score.
      </p>
      <Link
        href="/signup"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
        style={{ background: 'var(--accent)', color: 'var(--bg)' }}
      >
        Start free — no credit card required
      </Link>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div
      className="py-5"
      style={{ borderBottom: '1px solid rgba(26,40,69,0.6)' }}
    >
      <h3 className="text-base font-bold text-text mb-2" style={{ letterSpacing: '-0.01em' }}>{q}</h3>
      <div className="text-sm leading-relaxed" style={{ color: '#8a9bc0' }}>{a}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StopRevengeTradingPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <article className="max-w-3xl mx-auto px-6 py-12">

        {/* ── Breadcrumb ────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-2 text-xs font-mono mb-8" aria-label="Breadcrumb">
          <Link href="/home" className="transition-colors" style={{ color: 'var(--muted)' }}>Home</Link>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--dim)' }}>Guides</span>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--accent)' }}>Stop Revenge Trading</span>
        </nav>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg"
              style={{
                background: 'rgba(255,77,106,0.1)',
                border: '1px solid rgba(255,77,106,0.25)',
                color: '#ff4d6a',
              }}
            >
              Trading Psychology
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>12 min read</span>
          </div>
          <h1
            className="text-4xl font-bold text-text mb-4"
            style={{ letterSpacing: '-0.035em', lineHeight: '1.15' }}
          >
            How to Stop Revenge Trading: A Complete Guide
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: '#6b7fa3' }}>
            Revenge trading destroys more accounts than bad strategies ever will. Here&apos;s the
            psychology behind why you do it — and the proven structural techniques to make it
            physically impossible.
          </p>
        </header>

        {/* ── Table of contents ─────────────────────────────────────────── */}
        <nav
          className="rounded-2xl p-5 mb-10"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          aria-label="Table of contents"
        >
          <p className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--accent)' }}>IN THIS GUIDE</p>
          <ol className="space-y-1.5 text-sm" style={{ color: '#6b7fa3' }}>
            {[
              ['#what-is', 'What is revenge trading?'],
              ['#why', 'Why your brain makes you do it'],
              ['#signs', 'The 7 warning signs you\'re revenge trading right now'],
              ['#cost', 'The real cost of revenge trading'],
              ['#how-to-stop', 'How to stop revenge trading: 6 proven methods'],
              ['#structural', 'The structural approach: remove the decision'],
              ['#journal', 'How journalling breaks the cycle'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <li key={href}>
                <a
                  href={href as string}
                  className="transition-colors hover:text-text"
                  style={{ color: '#6b7fa3' }}
                >
                  {label as string}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── Body ─────────────────────────────────────────────────────── */}

        <H2 id="what-is">What is revenge trading?</H2>
        <P>
          Revenge trading is the act of entering a new trade immediately after a loss — not because a
          valid, strategy-aligned setup has formed, but because you want to get your money back. It is
          an emotionally-driven impulse that masquerades as a trading decision.
        </P>
        <P>
          The name is deliberately combative. You are not trading — you are fighting the market. You
          are trying to &quot;win back&quot; what was taken from you. And markets, as any experienced trader
          knows, are indifferent to your emotional state. They will not give you your money back
          because you are angry.
        </P>
        <P>
          What makes revenge trading so insidious is how rational it feels in the moment. You are not
          thinking &quot;I am about to make an impulsive emotional decision.&quot; You are thinking &quot;that last
          trade was just bad luck — this next one is clearly a valid setup.&quot; The emotional override
          is happening below your conscious awareness, influencing how you perceive and evaluate
          market data.
        </P>

        <Callout emoji="📊" title="The numbers">
          Studies on trader behaviour consistently show that losses trigger position-size increases and
          reduced time between trades. A 2020 analysis of retail forex traders found that following a
          losing trade, traders were 40% more likely to enter a new position within 10 minutes — and
          those trades had a statistically lower win rate than their average.
        </Callout>

        <H2 id="why">Why your brain makes you do it</H2>
        <P>
          To understand why revenge trading happens, you need to understand two foundational concepts
          from behavioural economics: <strong className="text-text">loss aversion</strong> and the
          {' '}<strong className="text-text">threat response</strong>.
        </P>

        <H3>Loss aversion</H3>
        <P>
          Kahneman and Tversky&apos;s Prospect Theory, for which Kahneman won the Nobel Prize in Economics,
          established that the psychological pain of a loss is approximately twice as powerful as the
          pleasure of an equivalent gain. Losing £100 hurts about twice as much as winning £100 feels
          good.
        </P>
        <P>
          This asymmetry is not a character flaw. It is evolution. For most of human history, loss —
          of food, shelter, status — carried existential consequences. The brain evolved to weight
          losses heavily because that was adaptive. Trading a financial account is not an
          evolutionarily ancient problem. Your brain does not know the difference between losing a
          meal and losing a trade.
        </P>

        <H3>The threat response</H3>
        <P>
          When you experience a loss, your amygdala — the brain&apos;s threat-detection system — activates.
          This triggers a cascade of physiological responses: cortisol and adrenaline increase, heart
          rate elevates, and importantly, blood flow shifts away from the prefrontal cortex (rational
          decision-making) toward the limbic system (survival and impulse).
        </P>
        <P>
          In a physical threat scenario, this is useful. In a trading scenario, it is catastrophic. Your
          executive function — the part that evaluates setups logically, checks criteria, considers
          risk — is literally impaired when you are in this state. You are biologically less capable
          of making good trading decisions immediately after a loss.
        </P>
        <P>
          This is not a metaphor. This is neuroscience. The revenge trade is not a failure of
          willpower — it is a predictable physiological response to loss. Understanding this should
          reframe how you approach the problem. You cannot &quot;try harder&quot; your way out of a
          biological response. You need structural solutions.
        </P>

        <H2 id="signs">The 7 warning signs you&apos;re revenge trading right now</H2>
        <P>
          Recognition is the first step. Most traders do not realise they are revenge trading while
          they are doing it. These are the behavioural signatures to watch for:
        </P>

        <NumberedList items={[
          {
            title: 'The speed test: under 10 minutes',
            body: 'You entered your new trade within 10 minutes of closing the previous losing trade. There is no objective reason a fresh, strategy-aligned setup would form that quickly after a loss. Speed is the most reliable indicator of emotional origin.',
          },
          {
            title: 'Size escalation',
            body: 'You increased your position size. This is the clearest financial signature of revenge trading. Doubling down after a loss to "recover faster" is not risk management — it is gambling psychology.',
          },
          {
            title: 'Checklist bypass',
            body: 'You ignored or rushed through your entry criteria. You said "close enough" to criteria that would normally disqualify the trade. The rationalisations feel compelling in the moment: "the trend is obvious", "I\'ll just get in early."',
          },
          {
            title: 'Wrong instrument or timeframe',
            body: 'You are trading a pair you do not normally trade, or on a timeframe shorter than your strategy calls for. This often happens when your primary pairs are not offering setups and you go hunting.',
          },
          {
            title: 'The emotional label',
            body: 'You can feel the frustration, anger, or desperation before you press the button. There is a tightness in your chest or a hot, urgent quality to the impulse. Normal trade entries feel calm and mechanical.',
          },
          {
            title: 'The recovery mindset',
            body: 'Your primary thought is about the previous loss — "I need to get this back" — rather than about the current setup quality. You are thinking backwards (about what you lost) instead of forwards (about this specific trade\'s probability).',
          },
          {
            title: 'Target compression',
            body: 'You reduced your take-profit target to make the recovery feel faster. "Just get back to flat" is a revenge trading mindset. Your TP should be set by your strategy\'s R:R, not by the size of your last loss.',
          },
        ]} />

        <Warning>
          If you recognise 3 or more of these signs right now, stop trading. Close your platform.
          Take at least 30 minutes away from screens before you assess whether to re-enter.
          Your ability to evaluate setups is currently impaired.
        </Warning>

        <H2 id="cost">The real cost of revenge trading</H2>
        <P>
          Traders often underestimate the total cost of revenge trading because they only account for
          the money lost on the revenge trade itself. The actual cost is significantly larger across
          three dimensions:
        </P>

        <H3>1. Compounding losses</H3>
        <P>
          A losing day that ends at -1R after a single disciplined loss is recoverable. The same day
          that ends at -4R because of three subsequent revenge trades is a much deeper hole. Getting
          back from a -4R day requires four separate winning trades at 1:1, or one trade at 4:1. The
          mathematical recovery requirement grows non-linearly as losses compound.
        </P>

        <H3>2. Psychological capital depletion</H3>
        <P>
          Every revenge trade depletes what trading psychologists call psychological capital — your
          mental capacity for disciplined execution. A bad revenge-trading session does not just end
          when you close your platform. You carry the shame, self-criticism, and damaged confidence
          into the next session. This creates a feedback loop: revenge trading → confidence
          destruction → worse decision-making → more revenge trading.
        </P>

        <H3>3. Strategy data contamination</H3>
        <P>
          When you review your trading statistics at the end of the month, the revenge trades are
          included in your numbers. Your strategy win rate, average R:R, and drawdown figures are
          all polluted by emotionally-driven outlier trades that are not representative of your
          strategy. You cannot accurately assess whether your strategy works when your data includes
          trades that were not strategy-based.
        </P>

        <H2 id="how-to-stop">How to stop revenge trading: 6 proven methods</H2>
        <P>
          There is no single technique that works for every trader. What works is layered defence
          — multiple overlapping systems so that even if one fails, others catch the impulse.
        </P>

        <NumberedList items={[
          {
            title: 'Implement a hard daily loss limit',
            body: 'Set a maximum daily loss of 2-3% of account equity. When this limit is hit, your trading session ends automatically — no exceptions, no renegotiating with yourself. Pre-commit to this rule in writing. Many brokers and trading platforms allow you to set automatic stop-outs. Use them.',
          },
          {
            title: 'Mandatory 30-minute rule after any loss',
            body: 'After any losing trade — not just a revenge-trading trigger — require yourself to step away from the screen for a minimum of 30 minutes before evaluating the next trade. This window allows your threat response to de-activate and your prefrontal cortex to come back online. Set a timer. Non-negotiable.',
          },
          {
            title: 'Pre-trade checklist with minimum score',
            body: 'Before any entry, your setup must pass an objective checklist. Every criterion is either met or not — there is no "sort of met." Only trades that score above your minimum threshold may be executed. This removes the subjective "this looks good enough" judgment that revenge trading exploits.',
          },
          {
            title: 'Session intention setting',
            body: 'Before each session, write down: your maximum loss for the session, the specific setups you will accept, and which pairs you will monitor. This pre-commitment anchors your behaviour to a rational plan made before emotions are engaged.',
          },
          {
            title: 'Post-loss journalling protocol',
            body: 'Immediately after a loss (before you look at any chart), write: what the trade was, whether you followed your plan, your emotional state right now, and whether you are giving yourself permission to continue trading this session. The act of writing forces metacognition — thinking about your thinking — and breaks the automatic impulse cycle.',
          },
          {
            title: 'Physical state reset',
            body: 'Cold water on your face, a short walk, five minutes of box breathing (4 counts in, 4 hold, 4 out, 4 hold) — these are not soft suggestions. They are evidence-based techniques for activating the parasympathetic nervous system and disabling the amygdala threat response. You are physically resetting your brain\'s operating mode.',
          },
        ]} />

        <H2 id="structural">The structural approach: remove the decision</H2>
        <P>
          The highest-leverage approach to stopping revenge trading is structural, not willpower-based.
          Instead of trying to resist the impulse in the moment — which requires functioning executive
          function you may not have after a loss — you design systems that make revenge trading
          physically impossible.
        </P>
        <P>
          This is the same approach used by architects of commitment devices — binding pre-commitments
          made when rational that constrain future irrational behaviour. Ulysses had himself tied to
          the mast before he encountered the sirens, not while he was hearing them.
        </P>

        <BulletList items={[
          'Broker-level daily stop-outs that automatically end your session',
          'Platform rules that require a minimum time between trades',
          'Objective entry scoring systems that require a passing grade before execution is enabled',
          'Trading partners or accountability coaches who review trades in real time',
          'Separate trading and "watching" modes — you cannot accidentally enter a trade while reviewing charts',
        ]} />

        <Callout emoji="🎯" title="The Playbuuk approach">
          Playbuuk was built specifically to solve the structural side of revenge trading. Every trade
          must pass an auto-evaluating checklist before execution is enabled. If your setup scores
          below your minimum grade threshold, the execute button is locked — not greyed out or
          discouraged, but physically blocked. You cannot execute a revenge trade on a D+ setup.{' '}
          <Link href="/signup" className="font-semibold underline underline-offset-2" style={{ color: 'var(--accent)' }}>
            See how it works →
          </Link>
        </Callout>

        <P>
          The psychological benefit of structural solutions extends beyond preventing individual
          revenge trades. When you know that the system will catch bad entries, you experience less
          anxiety during drawdowns. The cognitive load of self-policing your emotional state is lifted.
          You can observe the market more dispassionately because you are not simultaneously fighting
          your own impulses.
        </P>

        <H2 id="journal">How journalling breaks the cycle</H2>
        <P>
          The trade journal is the most underused tool in a trader&apos;s psychological arsenal. Most
          traders use journals to track P&L — which is useful but incomplete. The psychological
          journal tracks the variables that actually predict future performance: setup grade at entry,
          emotional state pre-trade, whether criteria were met, and crucially, whether the trade was
          strategy-based or emotionally-driven.
        </P>
        <P>
          When you review 3 months of journal data and see that every trade tagged &quot;entered after
          loss&quot; has a 23% win rate versus your strategy&apos;s baseline 58%, you have evidence. Not
          a feeling, not a suspicion — data. That data changes your relationship to the revenge
          impulse. Instead of experiencing it as a reasonable desire to recover, you experience it
          as a known losing pattern with a 23% hit rate.
        </P>
        <P>
          Over time, the journal becomes predictive. You learn that you are most vulnerable on Fridays,
          after news events, after consecutive losses of more than 2R, during the New York afternoon
          session. This personal pattern data is more valuable than any generic advice about trading
          psychology, because it is specifically about you.
        </P>

        <CtaBanner />

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section id="faq" aria-labelledby="faq-heading">
          <H2 id="faq-heading">Frequently asked questions</H2>

          <FaqItem
            q="What is revenge trading?"
            a="Revenge trading is entering a new trade immediately after a loss with the primary motivation of recovering that loss quickly — rather than because a valid, strategy-aligned setup exists. It is driven by emotion, not strategy."
          />
          <FaqItem
            q="Why do traders revenge trade?"
            a="Loss aversion — the psychological fact that losses hurt roughly twice as much as equivalent gains feel good — combined with a biological threat response that impairs rational decision-making after a loss. The brain wants the pain to stop, and trading again feels like a path to that outcome."
          />
          <FaqItem
            q="How do I know if I am revenge trading?"
            a={
              <p>Key signs: entering a trade within minutes of a loss, increasing position size after a loss, ignoring your checklist, trading outside your usual pairs, feeling angry or desperate at entry, or thinking primarily about recovering the previous loss rather than the current setup quality.</p>
            }
          />
          <FaqItem
            q="Can I stop revenge trading with willpower alone?"
            a="Willpower is unreliable because the impulse to revenge trade arrives when your prefrontal cortex — the willpower centre — is biologically impaired by the threat response. Structural solutions (hard loss limits, mandatory cool-down periods, objective entry systems) are far more effective than relying on in-the-moment self-control."
          />
          <FaqItem
            q="What is a daily loss limit and how do I set one?"
            a="A daily loss limit is a pre-committed maximum loss amount beyond which you stop trading for the day — no exceptions. A typical starting point is 2% of account equity. Set it as a broker-level automatic stop-out if possible, so the decision is removed from the emotional moment entirely."
          />
          <FaqItem
            q="How long should I wait after a losing trade before trading again?"
            a="A minimum of 30 minutes. This window allows the amygdala threat response to de-activate. Many experienced traders use a 1-hour rule, or require a completely new session (the next trading day) after a loss that hits more than half their daily limit."
          />
        </section>

        {/* ── Related guides ────────────────────────────────────────────── */}
        <section className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-mono font-bold mb-4" style={{ color: 'var(--dim)' }}>RELATED GUIDES</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { href: '/guides/trading-fomo', label: 'FOMO in Trading', desc: 'Why it happens and how to beat it' },
              { href: '/guides/overtrading', label: 'How to Stop Overtrading', desc: 'Recognise, prevent, recover' },
              { href: '/guides/trading-discipline', label: 'Trading Discipline', desc: 'The complete guide' },
            ].map(g => (
              <Link
                key={g.href}
                href={g.href}
                className="block p-4 rounded-xl transition-all hover:brightness-110"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-sm font-bold text-text mb-1">{g.label}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{g.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Disclaimer ────────────────────────────────────────────────── */}
        <footer className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-muted font-mono text-center">
            Not financial advice. Trading carries substantial risk of loss.{' '}
            <Link href="/disclaimer" className="underline underline-offset-2" style={{ color: 'var(--muted)' }}>
              Full risk disclosure
            </Link>
          </p>
        </footer>

      </article>
    </>
  )
}
