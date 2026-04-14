// app/(marketing)/privacy/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Playbuuk',
  description:
    'Playbuuk Privacy Policy. What trading and usage data we collect, what we never store (MT5 passwords), GDPR rights, data retention, and third-party services.',
  keywords: ['playbuuk privacy policy', 'trading app GDPR', 'trading data privacy'],
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy — Playbuuk',
    description: 'What data Playbuuk collects, what we never store, and your GDPR rights.',
    url: '/privacy',
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

function P({ children }: { children: React.ReactNode }) { return <p>{children}</p> }
function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-1.5 pl-4" style={{ listStyleType: 'disc' }}>{children}</ul>
}
function Li({ children }: { children: React.ReactNode }) { return <li>{children}</li> }
function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-text">{children}</strong>
}

function DataTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="rounded-xl overflow-hidden mt-2 mb-4" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
            {['Data type', 'Purpose', 'Retention'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([type, purpose, retention], i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(26,40,69,0.5)' : 'none',
              }}
            >
              <td className="px-4 py-2.5 text-text">{type}</td>
              <td className="px-4 py-2.5" style={{ color: '#8a9bc0' }}>{purpose}</td>
              <td className="px-4 py-2.5 text-dim">{retention}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-mono mb-3" style={{ color: 'var(--accent)' }}>Legal</p>
        <h1 className="text-3xl font-bold text-text mb-3" style={{ letterSpacing: '-0.03em' }}>
          Privacy Policy
        </h1>
        <p className="text-sm" style={{ color: '#6b7fa3' }}>
          Last updated: <span className="font-mono">14 April 2026</span>
          {' '}· Applies to all Playbuuk users globally, with specific provisions for EEA/UK users under GDPR / UK GDPR.
        </p>
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
            ['#controller',       '1. Data Controller'],
            ['#what-we-collect',  '2. What We Collect'],
            ['#never-stored',     '3. What We Never Store'],
            ['#legal-basis',      '4. Legal Basis for Processing (GDPR)'],
            ['#retention',        '5. Data Retention'],
            ['#third-parties',    '6. Third-Party Services'],
            ['#international',    '7. International Transfers'],
            ['#cookies',          '8. Cookies & Local Storage'],
            ['#your-rights',      '9. Your Rights'],
            ['#children',         '10. Children\'s Privacy'],
            ['#contact',          '11. Contact & DPO'],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href as string} className="hover:text-text transition-colors underline underline-offset-2">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="controller" title="1. Data Controller">
        <P>
          The data controller responsible for your personal data is:
        </P>
        <div
          className="rounded-xl px-5 py-4 font-mono text-xs mt-2"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: '#8a9bc0' }}
        >
          <p className="font-semibold text-text">AkomzyAi Consulting</p>
          <p className="mt-1">Email: <a href="mailto:privacy@playbuuk.com" className="text-accent hover:text-text transition-colors">privacy@playbuuk.com</a></p>
          <p>Platform: <a href="https://playbuuk.com" className="text-accent hover:text-text transition-colors">playbuuk.com</a></p>
        </div>
      </Section>

      <Section id="what-we-collect" title="2. What We Collect">
        <P>
          We collect only data that is necessary to provide the Service. Here is a complete breakdown:
        </P>

        <DataTable rows={[
          ['Account data', 'Email address, display name, authentication credentials (hashed by Supabase Auth)', 'Duration of account'],
          ['Profile data', 'User role, subscription tier, avatar URL', 'Duration of account'],
          ['Usage events', 'Playbook opens, time spent, trade logged/executed events (used for mentor revenue share)', '24 months'],
          ['Trade journal entries', 'Pair, direction, grade, lot size, SL/TP, outcome, pre-trade emotion tag, post-trade notes, grade override flag', 'Duration of account'],
          ['Alert preferences', 'Threshold, mentor list, pair list, session filters, quiet hours', 'Duration of account'],
          ['Alert log', 'Which alerts were sent, opened, resulted in trades (for psychology analytics)', '12 months'],
          ['Push subscription', 'Web Push endpoint and VAPID keys for your browser (for alert delivery)', 'Until revoked or browser expires'],
          ['Trading account metadata', 'MetaApi account ID, broker name, platform type (MT4/MT5), account type (demo/live)', 'Until account removed'],
          ['Session data', 'IP address, browser user-agent, country (via Supabase Auth)', '30 days'],
        ]} />

        <P>
          <Strong>Usage events are anonymised for aggregate analytics.</Strong> We analyse patterns
          at the cohort level (e.g., &ldquo;Pro users average 4.2 checklist opens per session&rdquo;) —
          individual usage data is only used for mentor revenue share calculations and your own
          psychology insights.
        </P>
        <P>
          <Strong>Emotion tags</Strong> (e.g., &ldquo;FOMO&rdquo;, &ldquo;Calm&rdquo;, &ldquo;Revenge&rdquo;) that you attach to journal
          entries are treated as sensitive data. They are never shared with mentors, used in
          aggregate analytics, or disclosed to third parties.
        </P>
      </Section>

      <Section id="never-stored" title="3. What We Never Store">
        <div
          className="rounded-xl px-5 py-4"
          style={{ background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.15)' }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--accent)' }}>
            We explicitly never store the following:
          </p>
          <ul className="space-y-2">
            {[
              ['MT4/MT5 passwords', 'Your broker login credentials pass through MetaApi\'s servers only. We store only the MetaApi account identifier (a UUID) — never your password or PIN.'],
              ['Payment card data', 'All payment processing is handled by Stripe. We store only your Stripe customer ID. We never see your full card number, CVV, or expiry date.'],
              ['Real-time P&L', 'We do not continuously poll or store your live account balance or open P&L. Balance data is only fetched when you view the accounts page and is not persisted.'],
              ['Broker server credentials', 'Server names and account numbers used to connect to MetaApi are passed once during connection setup and are not stored in our database.'],
              ['Biometric or government ID data', 'We do not require or process identity documents.'],
            ].map(([item, desc]) => (
              <li key={item as string} className="flex gap-3 text-xs">
                <span className="flex-shrink-0 mt-0.5 font-mono font-bold" style={{ color: 'var(--accent)' }}>✓</span>
                <span>
                  <strong className="font-semibold text-text">{item}</strong>
                  {' — '}
                  <span style={{ color: '#8a9bc0' }}>{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="legal-basis" title="4. Legal Basis for Processing (GDPR / UK GDPR)">
        <P>
          If you are in the European Economic Area or United Kingdom, we process your personal data
          on the following legal bases:
        </P>
        <Ul>
          <Li><Strong>Contract (Art. 6(1)(b) GDPR):</Strong> Account data, subscription data, trade journal data, and usage events are necessary to provide the Service you have subscribed to.</Li>
          <Li><Strong>Legitimate interests (Art. 6(1)(f) GDPR):</Strong> Session data and aggregated platform analytics, where such processing does not override your fundamental rights and freedoms.</Li>
          <Li><Strong>Consent (Art. 6(1)(a) GDPR):</Strong> Push notification subscriptions. You may withdraw consent at any time by disabling notifications in Settings → Alert Preferences.</Li>
        </Ul>
        <P>
          Emotion tags in trade journal entries may be considered sensitive personal data relating to
          mental state. We process this data only on the basis of your explicit consent, expressed
          through the voluntary act of adding an emotion tag to a journal entry.
        </P>
      </Section>

      <Section id="retention" title="5. Data Retention">
        <P>
          We retain your data for as long as your account is active or as necessary to provide the
          Service. Specific retention periods:
        </P>
        <Ul>
          <Li><Strong>Active account:</Strong> All data retained for the duration of account activity.</Li>
          <Li><Strong>Deleted account:</Strong> Personal identifiers anonymised within 30 days. Trade journal entries (stripped of personal identifiers) may be retained for aggregate analytics for up to 12 months.</Li>
          <Li><Strong>Usage events:</Strong> Retained for 24 months for mentor revenue share calculations and psychology analytics.</Li>
          <Li><Strong>Alert logs:</Strong> Retained for 12 months for psychology analytics (alert → trade conversion rate).</Li>
          <Li><Strong>Session / IP logs:</Strong> 30 days.</Li>
          <Li><Strong>Mentor escrow records:</Strong> Retained for 7 years after the relevant payout period for legal and audit compliance.</Li>
        </Ul>
        <P>
          You may request deletion of your account and data at any time. See Section 9 for how to
          exercise this right.
        </P>
      </Section>

      <Section id="third-parties" title="6. Third-Party Services">
        <P>
          We use the following third-party services that may process your data:
        </P>
        <DataTable rows={[
          ['Supabase (supabase.com)', 'Database, authentication, and realtime infrastructure', 'EU region (Frankfurt). DPA in place.'],
          ['Stripe (stripe.com)', 'Subscription billing and mentor payouts', 'Global. PCI-DSS compliant. DPA in place.'],
          ['MetaApi (metaapi.cloud)', 'MT4/MT5 trading account bridge', 'Global. Review MetaApi\'s privacy policy before connecting.'],
          ['Vercel (vercel.com)', 'Hosting and edge delivery', 'Global CDN. DPA in place.'],
          ['Anthropic (anthropic.com)', 'AI strategy extraction (admin use only)', 'US. Mentor strategy data only — no user data sent.'],
        ]} />
        <P>
          We do not sell your personal data to any third party. We do not use your data for
          behavioural advertising.
        </P>
      </Section>

      <Section id="international" title="7. International Transfers">
        <P>
          Some of our third-party processors operate outside the EEA/UK. Where personal data is
          transferred internationally, we ensure appropriate safeguards are in place, including
          Standard Contractual Clauses (SCCs) approved by the European Commission or equivalent
          UK adequacy measures.
        </P>
      </Section>

      <Section id="cookies" title="8. Cookies & Local Storage">
        <P>
          Playbuuk uses the following browser storage:
        </P>
        <Ul>
          <Li><Strong>Supabase session cookies:</Strong> HttpOnly, Secure, SameSite=Lax. Required for authentication. Cannot be disabled without losing access to the platform.</Li>
          <Li><Strong>sessionStorage (disclaimer-dismissed):</Strong> Records whether you have dismissed the risk disclaimer banner. Cleared on browser session end.</Li>
          <Li><Strong>Service Worker cache:</Strong> Stores static assets and playbook API responses for offline access. No personal data is cached.</Li>
          <Li><Strong>IndexedDB (offline journal queue):</Strong> Temporarily stores journal entries created offline for replay when connectivity is restored. Cleared after successful sync.</Li>
        </Ul>
        <P>
          We do not use tracking cookies, advertising cookies, or third-party analytics cookies.
        </P>
      </Section>

      <Section id="your-rights" title="9. Your Rights">
        <P>
          Under GDPR / UK GDPR, you have the following rights regarding your personal data:
        </P>
        <Ul>
          <Li><Strong>Access (Art. 15):</Strong> Request a copy of all personal data we hold about you.</Li>
          <Li><Strong>Rectification (Art. 16):</Strong> Request correction of inaccurate data.</Li>
          <Li><Strong>Erasure (Art. 17):</Strong> Request deletion of your account and personal data (&ldquo;right to be forgotten&rdquo;), subject to legal retention obligations.</Li>
          <Li><Strong>Portability (Art. 20):</Strong> Receive your trade journal data in a machine-readable format (JSON/CSV).</Li>
          <Li><Strong>Restriction (Art. 18):</Strong> Request that we restrict processing while a complaint is investigated.</Li>
          <Li><Strong>Objection (Art. 21):</Strong> Object to processing based on legitimate interests.</Li>
          <Li><Strong>Withdraw consent:</Strong> For push notifications, disable at any time in Settings → Alert Preferences.</Li>
        </Ul>
        <P>
          To exercise any of these rights, email{' '}
          <a href="mailto:privacy@playbuuk.com" className="text-accent hover:text-text transition-colors">
            privacy@playbuuk.com
          </a>
          . We will respond within 30 days (as required by GDPR Article 12). If you believe your
          rights have been violated, you may also lodge a complaint with the relevant supervisory
          authority (in the UK: the{' '}
          <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer"
            className="text-accent hover:text-text transition-colors">
            ICO
          </a>
          ; in the EU: your national DPA).
        </P>
      </Section>

      <Section id="children" title="10. Children's Privacy">
        <P>
          The Service is not directed at individuals under 18 years of age. We do not knowingly
          collect personal data from children. If you believe a minor has created an account,
          contact us at{' '}
          <a href="mailto:privacy@playbuuk.com" className="text-accent hover:text-text transition-colors">
            privacy@playbuuk.com
          </a>{' '}
          and we will promptly delete the account.
        </P>
      </Section>

      <Section id="contact" title="11. Contact & DPO">
        <P>
          For all privacy-related enquiries:
        </P>
        <div
          className="rounded-xl px-5 py-4 font-mono text-xs"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: '#8a9bc0' }}
        >
          <p>Privacy &amp; Data Protection: <a href="mailto:privacy@playbuuk.com" className="text-accent hover:text-text transition-colors">privacy@playbuuk.com</a></p>
          <p className="mt-1">Response time: within 30 days (GDPR Art. 12)</p>
        </div>
        <P>
          We may update this Privacy Policy periodically. Material changes will be communicated
          by email or in-app notification. See also our{' '}
          <Link href="/terms" className="text-accent hover:text-text transition-colors">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/disclaimer" className="text-accent hover:text-text transition-colors">Risk Disclosure</Link>.
        </P>
      </Section>

    </div>
  )
}
