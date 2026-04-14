// lib/metaapi/client.ts
// MetaApi SDK singleton — reuse across API route calls.
//
// MetaApi connections are expensive to initialise. This module holds a single
// instance at the module level and returns it on every call, creating it once
// on first use. Safe for Vercel serverless functions: each worker process gets
// its own module scope, so there is at most one instance per worker.
//
// Server-side ONLY. Never import from client components.

import MetaApi from 'metaapi.cloud-sdk'

let _api: MetaApi | null = null

// ─── getMetaApi ───────────────────────────────────────────────────────────────
// Returns the shared MetaApi instance, creating it on first call.
// Throws if METAAPI_TOKEN is not set.

export function getMetaApi(): MetaApi {
  if (_api) return _api

  const token = process.env.METAAPI_TOKEN
  if (!token) {
    throw new Error('METAAPI_TOKEN environment variable is not set')
  }

  const domain = process.env.METAAPI_DOMAIN ?? 'agiliumtrade.agiliumtrade.ai'

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  _api = new MetaApi(token, { domain } as object) as MetaApi

  return _api
}
