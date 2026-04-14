// lib/metaapi/client.ts
// MetaApi SDK singleton — reuse across API route calls.
//
// MetaApi connections are expensive to initialise. This module holds a single
// instance at the module level and returns it on every call, creating it once
// on first use. Safe for Vercel serverless functions: each worker process gets
// its own module scope, so there is at most one instance per worker.
//
// NOTE: Dynamic import is required because metaapi.cloud-sdk accesses `window`
// at module evaluation time, which fails during Next.js SSR/build.
//
// Server-side ONLY. Never import from client components.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _api: any = null

// ─── getMetaApi ───────────────────────────────────────────────────────────────
// Returns the shared MetaApi instance, creating it on first call.
// Throws if METAAPI_TOKEN is not set.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMetaApi(): Promise<any> {
  if (_api) return _api

  const token = process.env.METAAPI_TOKEN
  if (!token) {
    throw new Error('METAAPI_TOKEN environment variable is not set')
  }

  const domain = process.env.METAAPI_DOMAIN ?? 'agiliumtrade.agiliumtrade.ai'

  // Dynamic import prevents window-access at module evaluation time
  const { default: MetaApi } = await import('metaapi.cloud-sdk')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  _api = new MetaApi(token, { domain })

  return _api
}
