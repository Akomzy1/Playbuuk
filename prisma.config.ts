import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Prisma 7 — connection URLs live here instead of schema.prisma.
// DATABASE_URL = pooled (pgbouncer) — runtime queries
// DIRECT_URL   = direct — migrations only (bypasses pgbouncer)

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx --env-file=.env.local prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
