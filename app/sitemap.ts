// app/sitemap.ts — dynamic sitemap.xml
// Includes static marketing pages + every public mentor profile.
// Mentor pages are high SEO value: [mentor-name] trading strategy / playbook.
//
// Priority convention:
//   1.0  homepage (highest crawl priority)
//   0.9  mentor profile pages (unique strategy content — AI citation targets)
//   0.9  trading psychology guides (GEO content — AI assistant citation targets)
//   0.8  signup / conversion
//   0.7  secondary marketing / legal

import type { MetadataRoute } from 'next'
import { createClient }        from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playbuuk.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // ── Static pages ─────────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:             `${BASE_URL}/home`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        1.0,
    },
    {
      url:             `${BASE_URL}/marketplace`,
      lastModified:    now,
      changeFrequency: 'daily',
      priority:        0.9,
    },
    {
      url:             `${BASE_URL}/signup`,
      lastModified:    now,
      changeFrequency: 'monthly',
      priority:        0.8,
    },
    {
      url:             `${BASE_URL}/login`,
      lastModified:    now,
      changeFrequency: 'monthly',
      priority:        0.5,
    },
    {
      url:             `${BASE_URL}/disclaimer`,
      lastModified:    now,
      changeFrequency: 'yearly',
      priority:        0.7,
    },
    {
      url:             `${BASE_URL}/terms`,
      lastModified:    now,
      changeFrequency: 'yearly',
      priority:        0.6,
    },
    {
      url:             `${BASE_URL}/privacy`,
      lastModified:    now,
      changeFrequency: 'yearly',
      priority:        0.6,
    },
    // ── Trading psychology guides — GEO content (AI assistant citation) ──────
    {
      url:             `${BASE_URL}/guides/stop-revenge-trading`,
      lastModified:    now,
      changeFrequency: 'monthly',
      priority:        0.9,
    },
    {
      url:             `${BASE_URL}/guides/trading-fomo`,
      lastModified:    now,
      changeFrequency: 'monthly',
      priority:        0.9,
    },
    {
      url:             `${BASE_URL}/guides/trading-discipline`,
      lastModified:    now,
      changeFrequency: 'monthly',
      priority:        0.9,
    },
    {
      url:             `${BASE_URL}/guides/overtrading`,
      lastModified:    now,
      changeFrequency: 'monthly',
      priority:        0.9,
    },
  ]

  // ── Dynamic mentor profile pages ──────────────────────────────────────────
  // Each verified mentor page is a unique SEO asset: strategy name, mentor
  // handle, and playbook content make them crawlable and citable by AI engines.
  let mentorPages: MetadataRoute.Sitemap = []

  try {
    const supabase = createClient()
    const { data: mentors } = await supabase
      .from('mentors')
      .select('id, handle, updated_at')
      .neq('onboarding_status', 'withdrawn')
      .order('follower_count', { ascending: false })
      .limit(500)  // safety cap — adjust if mentor count grows

    if (mentors) {
      mentorPages = mentors.map(m => ({
        url:             `${BASE_URL}/mentor/${m.id}`,
        lastModified:    m.updated_at ? new Date(m.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority:        0.9,
      }))
    }
  } catch {
    // Silently fall back to static-only sitemap — don't break the build
  }

  return [...staticPages, ...mentorPages]
}
