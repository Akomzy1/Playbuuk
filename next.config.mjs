/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google OAuth avatars
      },
    ],
  },

  // ── Security headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control',    value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // Allow service worker scope for PWA
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=UTF-8' },
        ],
      },
    ];
  },

  // ── Redirects ─────────────────────────────────────────────────────────────
  // Note on auth routes:
  //   app/(auth)/login/page.tsx  → serves /login  (route group is transparent)
  //   app/(auth)/signup/page.tsx → serves /signup
  // No redirects needed — the pages are already at these URLs.
  //
  // Note on /home:
  //   app/(marketing)/home/page.tsx → serves /home (the public landing page)
  //   app/page.tsx smart-routes: auth → /marketplace, non-auth → /home
  // No redirect for /home — it IS the destination.
  async redirects() {
    return [
      // Legacy: if anyone bookmarked /marketplace pre-auth it stays working
      // (no redirect needed — page exists at that path)
    ];
  },

  // ── Build config ──────────────────────────────────────────────────────────
  compress: true,
  poweredByHeader: false,

  // ── Webpack — ignore metaapi browser warnings ─────────────────────────────
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
