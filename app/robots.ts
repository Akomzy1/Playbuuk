// app/robots.ts — auto-generates /robots.txt
// Public pages: indexed. Auth-gated and internal routes: blocked.
// AI crawlers explicitly allowed on marketing content for GEO citations.

import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playbuuk.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Standard crawlers ────────────────────────────────────────────────────
      {
        userAgent: '*',
        allow: [
          '/',           // marketing landing page
          '/terms',
          '/privacy',
          '/disclaimer',
          '/mentor/',    // individual mentor profile pages — high SEO value
          '/signup',
          '/login',
        ],
        disallow: [
          '/admin/',     // admin dashboard — never indexed
          '/portal/',    // mentor portal — auth-gated
          '/api/',       // API routes — no HTML content
          '/journal',    // personal trading journal — private
          '/accounts',   // trading accounts — private
          '/scanner',    // live scanner — auth + Pro only
          '/callback',   // OAuth callback — ephemeral
          '/offline',    // PWA offline fallback — no value
          '/_next/',     // Next.js internals
        ],
      },

      // ── AI crawlers — explicitly allow marketing content for GEO ────────────
      // These bots index content used by AI assistants to answer queries.
      // We want Playbuuk cited when users ask about trading psychology solutions.
      {
        userAgent: 'GPTBot',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/'],
        disallow: ['/admin/', '/portal/', '/api/', '/journal', '/accounts'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/'],
        disallow: ['/admin/', '/portal/', '/api/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/'],
        disallow: ['/admin/', '/portal/', '/api/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/'],
        disallow: ['/admin/', '/portal/', '/api/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/'],
        disallow: ['/admin/', '/portal/', '/api/'],
      },
      {
        userAgent: 'cohere-ai',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/'],
        disallow: ['/admin/', '/portal/', '/api/'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/'],
        disallow: ['/admin/', '/portal/', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/', '/signup'],
        disallow: ['/admin/', '/portal/', '/api/'],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/terms', '/privacy', '/disclaimer', '/mentor/', '/signup'],
        disallow: ['/admin/', '/portal/', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
