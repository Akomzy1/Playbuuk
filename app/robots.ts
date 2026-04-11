import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playbuuk.com'

  return {
    rules: [
      // Standard crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/portal/',
          '/api/',
          '/journal',
          '/accounts',
          '/requests',
          '/scanner',
        ],
      },
      // AI crawlers — explicitly allowed for GEO/AI engine citations
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      { userAgent: 'cohere-ai', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
