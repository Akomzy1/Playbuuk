import type { Metadata, Viewport } from 'next'
import { Outfit, IBM_Plex_Mono } from 'next/font/google'
import { ServiceWorkerRegistration } from '@/components/pwa/sw-register'
import './globals.css'

// ─────────────────────────────────────────────────────────────────────────────
// Fonts — self-hosted via next/font (no external requests, no FOUT)
// Variable names match the CSS custom properties in globals.css:
//   --font-display → Outfit (all UI text)
//   --font-mono    → IBM Plex Mono (prices, grades, data, timestamps)
// ─────────────────────────────────────────────────────────────────────────────

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',   // wires into body { font-family: var(--font-display) }
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-mono',      // wires into .mono, data values, grade display
  display: 'swap',
  preload: true,
  fallback: ['ui-monospace', 'monospace'],
  adjustFontFallback: true,
})

// ─────────────────────────────────────────────────────────────────────────────
// Structured data — injected once at root for every page.
// Organization tells search engines / AI engines who Playbuuk is.
// SoftwareApplication drives rich results and GEO citations.
// ─────────────────────────────────────────────────────────────────────────────

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Playbuuk',
  url: 'https://playbuuk.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://playbuuk.com/logo.png',
    width: 512,
    height: 512,
  },
  description:
    'Playbuuk is a trading psychology and strategy discipline platform that transforms mentor strategies into live, interactive playbooks with auto-detecting checklists, psychology-gated trade execution, and setup alert notifications.',
  foundingDate: '2024',
  sameAs: [
    'https://twitter.com/playbuuk',
    'https://instagram.com/playbuuk',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@playbuuk.com',
    availableLanguage: 'English',
  },
} as const

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
    'Auto-detecting trading checklist',
    'Real-time setup grading (A+ to D+)',
    'Psychology-gated trade execution',
    'MT5 / MT4 trade bridge via MetaApi',
    'Setup alert push notifications',
    'Trading journal with emotion tracking',
    'Grade override accountability logging',
    'Mentor strategy playbook marketplace',
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
        description: 'Follow mentors, preview playbooks and golden rules',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '19.99',
        priceCurrency: 'USD',
        billingIncrement: 'P1M',
        description:
          'Full discipline engine — live checklist, setup grading, trade execution, alerts, psychology journal',
      },
    ],
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Root metadata — every page inherits these defaults and can override them
// with their own generateMetadata(). The template ensures consistent branding.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://playbuuk.com',
  ),

  title: {
    // Pages that don't define their own title get this default
    default: 'Playbuuk — Trade the Plan, Not the Emotion',
    // Pages that define a title get: "Page Title — Playbuuk"
    template: '%s — Playbuuk',
  },

  description:
    'Stop trading on emotion. Playbuuk turns mentor strategies into live, auto-grading playbooks. Psychology-gated execution, setup alerts, and a trade journal that shows you exactly where discipline breaks down.',

  keywords: [
    'trading psychology',
    'trading discipline',
    'stop revenge trading',
    'FOMO trading solution',
    'trading checklist app',
    'forex trading discipline',
    'trading mentor playbook',
    'setup grade trading',
    'trade the plan not the emotion',
    'trading psychology platform',
    'how to stop emotional trading',
    'trading journal psychology',
  ],

  authors: [{ name: 'Playbuuk', url: 'https://playbuuk.com' }],
  creator: 'Playbuuk',
  publisher: 'Playbuuk',

  // Canonical URL — override per-page with alternates.canonical
  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    siteName: 'Playbuuk',
    title: 'Playbuuk — Trade the Plan, Not the Emotion',
    description:
      'The discipline platform that stops emotional trading. Auto-grading checklists, psychology-gated execution, setup alerts.',
    url: 'https://playbuuk.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Playbuuk — Trading Discipline Platform. Setup grade A+ displayed with auto-detecting checklist.',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@playbuuk',
    creator: '@playbuuk',
    title: 'Playbuuk — Trade the Plan, Not the Emotion',
    description:
      'The discipline platform that stops emotional trading. Auto-grading checklists, psychology-gated execution, setup alerts.',
    images: [
      {
        url: '/og-image.png',
        alt: 'Playbuuk — Trading Discipline Platform',
      },
    ],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  // Apple PWA meta tags (standalone mode, status bar, splash)
  appleWebApp: {
    capable: true,
    title: 'Playbuuk',
    statusBarStyle: 'black-translucent',
  },

  // Links to manifest and app icons
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  // Verified ownership placeholders — fill in once accounts are created
  verification: {
    google: 'GOOGLE_SEARCH_CONSOLE_VERIFICATION_TOKEN',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // Matches --bg — prevents white flash on mobile before CSS loads
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#050810' }],
  colorScheme: 'dark',
}

// ─────────────────────────────────────────────────────────────────────────────
// Root layout
// ─────────────────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // Apply next/font CSS variable classes — makes --font-display and --font-mono
      // available as CSS custom properties throughout the entire document tree
      className={`${outfit.variable} ${ibmPlexMono.variable}`}
      // Inline bg matches --bg (#050810) — eliminates white flash on cold load
      // even before the CSS file parses. Critical for dark-theme-first products.
      style={{ backgroundColor: '#050810', colorScheme: 'dark' }}
      suppressHydrationWarning
    >
      <head>
        {/* ── JSON-LD structured data ── */}
        {/* Organization — establishes Playbuuk as a named entity for AI engines */}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled server-side JSON
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        {/* SoftwareApplication — enables rich results and GEO citations */}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled server-side JSON
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationSchema),
          }}
        />

        {/* ── DNS prefetch for third-party origins ── */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* ── Preconnect for Supabase realtime (set once project URL is known) ── */}
        {/* <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} /> */}
      </head>

      <body
        // antialiased — sub-pixel font rendering, critical for dark background legibility
        // min-h-screen — prevents short pages leaving bg-exposed gaps
        // bg-bg / text-text — Tailwind aliases for our CSS variables
        // font-display — wires to Outfit via the Tailwind fontFamily extension
        // overflow-x-hidden — prevents horizontal scroll from any escaped content
        className="antialiased min-h-screen bg-bg text-text font-display overflow-x-hidden"
      >
        {children}

        {/* SW registration — client-side only, renders nothing to DOM */}
        <ServiceWorkerRegistration />

        {/*
          ── Analytics placeholder ──────────────────────────────────────────────
          Uncomment when ready to deploy. Using Vercel Analytics + Speed Insights
          for real CWV field data from actual users.

          import { Analytics } from '@vercel/analytics/react'
          import { SpeedInsights } from '@vercel/speed-insights/next'

          <Analytics />
          <SpeedInsights />
        */}
      </body>
    </html>
  )
}
