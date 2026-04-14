// app/(marketing)/terms/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Playbuuk',
  description:
    'Playbuuk Terms of Service. Platform usage terms, subscription billing, mentor revenue share and escrow policy, trade execution disclaimer, and governing law.',
  keywords: ['playbuuk terms of service', 'trading platform terms', 'mentor escrow terms'],
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service — Playbuuk',
    description: 'Platform usage terms, escrow policy, and trade execution disclaimer.',
    url: '/terms',
  },
}

// ─── Shared prose components ──────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10">
      <h2
        className="text-lg font-bold text-text mb-4 pb-2"
        style={{ borderBottom: '1px solid rgba(26,40,69,0.8)', letterSpacing: '-0.02em' }}
      >
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#8a9bc0' }}>
        {children}
      </div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-1.5 pl-4" style={{ listStyleType: 'disc', color: '#8a9bc0' }}>
      {children}
    </ul>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-text">{children}</strong>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-mono mb-3" style={{ color: 'var(--accent)' }}>
          Legal
        </p>
        <h1 className="text-3xl font-bold text-text mb-3" style={{ letterSpacing: '-0.03em' }}>
          Terms of Service
        </h1>
        <p className="text-sm" style={{ color: '#6b7fa3' }}>
          Last updated: <span className="font-mono">14 April 2026</span>
          {' '}· Effective immediately upon account creation.
        </p>

        {/* Risk callout */}
        <div
          className="mt-6 rounded-xl px-5 py-4"
          style={{
            background: 'rgba(255,77,106,0.05)',
            border: '1px solid rgba(255,77,106,0.2)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
            Risk Warning
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#8a9bc0' }}>
            Trading financial instruments involves a substantial risk of loss. Playbuuk is a
            strategy discipline and analytical tool — it does not constitute financial advice,
            investment advice, or a recommendation to trade. See our{' '}
            <Link href="/disclaimer" className="underline underline-offset-2 hover:text-text transition-colors">
              full Risk Disclosure
            </Link>
            .
          </p>
        </div>
      </div>

      {/* TOC */}
      <nav
        className="rounded-2xl p-5 mb-10 text-xs font-mono"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        aria-label="Table of contents"
      >
        <p className="text-2xs font-semibold text-muted mb-3 tracking-widest uppercase">Contents</p>
        <ol className="space-y-1.5 list-decimal list-inside" style={{ color: '#6b7fa3' }}>
          {[
            ['#acceptance',       '1. Acceptance of Terms'],
            ['#service',          '2. Description of Service'],
            ['#accounts',         '3. User Accounts'],
            ['#subscriptions',    '4. Subscriptions & Billing'],
            ['#escrow',           '5. Mentor Revenue Share & Escrow'],
            ['#trade-execution',  '6. Trade Execution'],
            ['#integration',      '7. Trading Account Integration'],
            ['#conduct',          '8. Prohibited Conduct'],
            ['#ip',               '9. Intellectual Property'],
            ['#liability',        '10. Disclaimers & Limitation of Liability'],
            ['#termination',      '11. Termination'],
            ['#governing-law',    '12. Governing Law'],
            ['#changes',          '13. Changes to These Terms'],
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href as string}
                className="hover:text-text transition-colors underline underline-offset-2"
              >
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Sections ── */}

      <Section id="acceptance" title="1. Acceptance of Terms">
        <P>
          By accessing or using the Playbuuk platform (&ldquo;Service&rdquo;, &ldquo;Platform&rdquo;), operated by
          AkomzyAi Consulting (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), you agree to be bound by these
          Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not use the Service.
        </P>
        <P>
          These Terms constitute a legally binding agreement between you and AkomzyAi Consulting. By
          creating an account or using any part of the Service, you represent that you are at least 18
          years old and have the legal capacity to enter into this agreement.
        </P>
      </Section>

      <Section id="service" title="2. Description of Service">
        <P>
          Playbuuk is a trading strategy discipline and psychology management platform. It provides:
        </P>
        <Ul>
          <Li>Interactive trading playbooks based on mentor strategies, featuring auto-detecting checklists and real-time setup grading (A+ through D+)</Li>
          <Li>A psychology-gated trade execution interface that requires setup grade confirmation before enabling trade execution</Li>
          <Li>A trade journal with psychology tracking (emotion tags, grade compliance analysis, override logging)</Li>
          <Li>Setup alert push notifications when market conditions meet configured thresholds</Li>
          <Li>A mentor marketplace where traders can follow strategy providers</Li>
          <Li>Revenue share infrastructure for mentor partners</Li>
        </Ul>
        <P>
          <Strong>Playbuuk is an analytical and discipline tool.</Strong> It does not provide financial
          advice, investment recommendations, or trading signals. All market assessments performed by
          the platform are automated technical analyses and do not constitute advice.
        </P>
      </Section>

      <Section id="accounts" title="3. User Accounts">
        <P>
          You must provide accurate information when creating an account. You are responsible for
          maintaining the confidentiality of your credentials and for all activity that occurs under
          your account.
        </P>
        <P>
          You must notify us immediately at <a href="mailto:support@playbuuk.com"
            className="text-accent hover:text-text transition-colors">support@playbuuk.com</a> if you
          suspect any unauthorised access to your account.
        </P>
        <P>
          We reserve the right to suspend or terminate accounts that violate these Terms, engage in
          fraudulent activity, or abuse the platform.
        </P>
      </Section>

      <Section id="subscriptions" title="4. Subscriptions & Billing">
        <P>
          <Strong>Free tier:</Strong> Allows following mentors and previewing playbook summaries and
          golden rules. No payment required.
        </P>
        <P>
          <Strong>Pro tier ($19.99/month):</Strong> Provides full access to the discipline engine
          including live checklists, setup grading, trade execution, setup alerts, and the full
          psychology journal.
        </P>
        <P>
          <Strong>Mentor Direct ($9.99/month per mentor):</Strong> Premium access to a specific
          mentor&apos;s content in addition to Pro features.
        </P>
        <P>
          Subscriptions are billed monthly via Stripe. You may cancel at any time; access continues
          until the end of the current billing period. No refunds are provided for partial months.
          Prices may change with 30 days&apos; written notice.
        </P>
      </Section>

      <Section id="escrow" title="5. Mentor Revenue Share & Escrow (§8.3)">
        <P>
          Mentors whose strategy playbooks are available on the platform participate in a usage-based
          revenue share programme:
        </P>
        <Ul>
          <Li>
            <Strong>Pro pool (40%):</Strong> 40% of Pro tier revenue is distributed to the mentor pool
            monthly, proportional to each mentor&apos;s usage points earned during that period.
            Usage points are calculated from: checklist opens (1pt), time spent (1pt per 5 minutes),
            trade log events (2pts), and trade executions (3pts).
          </Li>
          <Li>
            <Strong>Mentor Direct (50%):</Strong> 50% of each $9.99 Mentor Direct subscription is
            paid to the specific mentor.
          </Li>
          <Li>
            <Strong>Verified mentors:</Strong> Revenue is held in &ldquo;Pending&rdquo; status and transferred
            to the mentor&apos;s connected Stripe account following payout processing.
          </Li>
          <Li>
            <Strong>Unverified mentors:</Strong> Revenue accrues in escrow until the mentor creates an
            account, reviews and verifies their playbook, and connects a Stripe account.
          </Li>
        </Ul>
        <P>
          <Strong>Escrow expiry:</Strong> Unclaimed escrow balances expire <Strong>12 months</Strong> after
          the date of last accrual (calculated from <code className="font-mono text-xs px-1 py-0.5 rounded"
            style={{ background: 'rgba(0,229,176,0.06)', color: 'var(--accent)' }}>last_calculated_at</code>).
          If no funds accrued in the 12 months preceding the expiry check, the balance is forfeited
          and returned to platform revenue. We will make reasonable efforts to contact mentors with
          accruing balances approaching expiry.
        </P>
        <P>
          Revenue share amounts are calculated by the platform and are non-negotiable in respect of
          the calculation methodology. Disputes regarding payout calculations must be raised within
          60 days of the relevant payout period.
        </P>
      </Section>

      <Section id="trade-execution" title="6. Trade Execution">
        <P>
          <Strong>Playbuuk is not a broker and does not execute trades on your behalf.</Strong> The
          trade execution feature connects to your own MT4/MT5 account via MetaApi, a third-party API
          bridge. You retain full control of and responsibility for your trading account at all times.
        </P>
        <P>
          The psychology gate (minimum setup grade requirement) is a discipline tool. You may
          override the grade threshold at any time — however, all overrides are logged in your trade
          journal with a <code className="font-mono text-xs px-1 py-0.5 rounded"
            style={{ background: 'rgba(0,229,176,0.06)', color: 'var(--accent)' }}>grade_override = true</code> flag
          for accountability purposes. This logging cannot be disabled.
        </P>
        <Ul>
          <Li>All trades require your explicit confirmation before execution. Playbuuk never executes trades automatically.</Li>
          <Li>Stop loss, take profit, and lot size values pre-filled by the platform are for reference only. You are responsible for reviewing and confirming all parameters before execution.</Li>
          <Li>Playbuuk bears no responsibility for losses arising from trade executions initiated through the platform, including technical failures, API latency, slippage, or broker rejections.</Li>
          <Li>Demo accounts are clearly labelled. Ensure you understand whether you are trading on a live or demo account before executing any trade.</Li>
        </Ul>
      </Section>

      <Section id="integration" title="7. Trading Account Integration">
        <P>
          When you connect a trading account, you provide your broker credentials to MetaApi (a
          third-party service). <Strong>Playbuuk does not store your MT4/MT5 passwords.</Strong> We
          store only the MetaApi account identifier. You are responsible for reviewing MetaApi&apos;s
          terms of service and privacy policy.
        </P>
        <P>
          You are solely responsible for ensuring that connecting your trading account to third-party
          services complies with your broker&apos;s terms of service. Some brokers prohibit the use
          of third-party API connections.
        </P>
      </Section>

      <Section id="conduct" title="8. Prohibited Conduct">
        <P>You agree not to:</P>
        <Ul>
          <Li>Use the platform to provide financial advice or recommendations to others</Li>
          <Li>Reverse-engineer, scrape, or systematically extract mentor strategy data</Li>
          <Li>Create multiple accounts to abuse free tier limits or revenue share calculations</Li>
          <Li>Submit false mentor strategy content or fabricate trading results</Li>
          <Li>Interfere with or attempt to gain unauthorised access to any part of the platform or its infrastructure</Li>
          <Li>Use the platform for any illegal purpose, including market manipulation</Li>
        </Ul>
      </Section>

      <Section id="ip" title="9. Intellectual Property">
        <P>
          The Playbuuk platform, including its software, design, and original content, is owned by
          AkomzyAi Consulting and protected by copyright and intellectual property laws.
        </P>
        <P>
          Mentor strategy content available on the platform is owned by the respective mentors or
          sourced from publicly available information. AI-extracted playbooks are clearly labelled
          and subject to revision by the mentor prior to verification.
        </P>
        <P>
          Your trade journal data is your own. You may request an export of your data at any time
          by contacting us at <a href="mailto:support@playbuuk.com"
            className="text-accent hover:text-text transition-colors">support@playbuuk.com</a>.
        </P>
      </Section>

      <Section id="liability" title="10. Disclaimers & Limitation of Liability">
        <P>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
          WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY
          DEFECTS WILL BE CORRECTED.
        </P>
        <P>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, AKOMZYAI CONSULTING SHALL NOT BE LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT
          NOT LIMITED TO TRADING LOSSES, LOST PROFITS, OR LOSS OF DATA, ARISING FROM YOUR USE
          OF THE SERVICE.
        </P>
        <P>
          OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ANY CLAIM ARISING UNDER THESE TERMS SHALL
          NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING
          THE CLAIM OR (B) £100.
        </P>
        <P>
          Some jurisdictions do not allow the exclusion of certain warranties or limitations of
          liability. In such jurisdictions, our liability is limited to the maximum extent
          permitted by applicable law.
        </P>
      </Section>

      <Section id="termination" title="11. Termination">
        <P>
          You may terminate your account at any time by contacting support. Upon termination, your
          access to the Service will cease at the end of your current billing period.
        </P>
        <P>
          We may terminate or suspend your account immediately, without notice, if you breach these
          Terms. Following termination, provisions of these Terms that by their nature should
          survive will survive, including intellectual property, disclaimers, and limitation of
          liability.
        </P>
      </Section>

      <Section id="governing-law" title="12. Governing Law">
        <P>
          These Terms are governed by and construed in accordance with the laws of England and
          Wales. Any disputes arising under these Terms shall be subject to the exclusive
          jurisdiction of the courts of England and Wales.
        </P>
        <P>
          If you are a consumer in the European Union, you may also be entitled to certain
          consumer protections under the law of your country of residence.
        </P>
      </Section>

      <Section id="changes" title="13. Changes to These Terms">
        <P>
          We may update these Terms from time to time. We will notify registered users of material
          changes by email or via in-app notification at least 14 days before the changes take
          effect. Continued use of the Service after the effective date constitutes acceptance of
          the updated Terms.
        </P>
        <P>
          For questions about these Terms, contact us at{' '}
          <a href="mailto:legal@playbuuk.com"
            className="text-accent hover:text-text transition-colors">
            legal@playbuuk.com
          </a>.
        </P>
      </Section>

    </div>
  )
}
