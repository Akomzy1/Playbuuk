import type { MetadataRoute } from 'next'

// ─────────────────────────────────────────────────────────────────────────────
// Static sitemap — all public pages.
// Dynamic mentor pages will be added once the DB query is wired up.
// Priority convention:
//   1.0  → homepage (highest crawl priority)
//   0.9  → high-value marketing/conversion pages
//   0.8  → secondary marketing pages
//   0.7  → legal/support (crawlable but low priority)
// changeFrequency: 'weekly' for marketing, 'monthly' for legal
// ─────────────────────────────────────────────────────────────────────────────

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playbuuk.com'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  // ── Dynamic mentor pages ──────────────────────────────────────────────────
  // TODO: fetch public mentor profiles from Supabase and append here.
  // Pattern (once DB is wired):
  //
  //   const { data: mentors } = await createAdminClient()
  //     .from('profiles')
  //     .select('id, updated_at')
  //     .eq('role', 'mentor')
  //     .eq('is_active', true)
  //
  //   const mentorPages: MetadataRoute.Sitemap = (mentors ?? []).map((m) => ({
  //     url: `${baseUrl}/mentor/${m.id}`,
  //     lastModified: new Date(m.updated_at),
  //     changeFrequency: 'weekly',
  //     priority: 0.9,
  //   }))
  //
  //   return [...staticPages, ...mentorPages]

  return staticPages
}
