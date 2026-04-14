// public/sw.js — Playbuuk PWA Service Worker
//
// Cache strategies:
//   STATIC_CACHE   — app shell + icons (cache-first, versioned)
//   RUNTIME_CACHE  — playbook pages (network-first, cached for offline)
//   FONT_CACHE     — Google Fonts (cache-first, 30-day TTL)
//
// Offline:
//   • Navigation falls back to cached page → /offline if nothing cached
//   • POST /api/journal entries queued in IndexedDB when offline
//   • Background Sync replays queue on reconnect (falls back to online event)
//
// Push / notification handling:
//   • Payload: { title, body, icon, tag, url, alertId }
//   • Tap → navigate to playbook URL, mark alert tapped via /api/alerts/:id/tap

'use strict'

const CACHE_VERSION  = 'v2'
const STATIC_CACHE   = `playbuuk-static-${CACHE_VERSION}`
const RUNTIME_CACHE  = `playbuuk-runtime-${CACHE_VERSION}`
const FONT_CACHE     = `playbuuk-fonts-${CACHE_VERSION}`
const ALL_CACHES     = [STATIC_CACHE, RUNTIME_CACHE, FONT_CACHE]

// Assets precached during install (the "app shell").
// These must be available instantly offline.
const PRECACHE_URLS = [
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/badge-72.png',
]

// IDB database name + store for offline journal queue
const IDB_NAME       = 'playbuuk-offline'
const IDB_VERSION    = 1
const JOURNAL_STORE  = 'journal-queue'
const SYNC_TAG       = 'journal-sync'

// Max cached runtime pages (LRU eviction beyond this)
const RUNTIME_CACHE_MAX = 50

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Open (or create) the offline IDB. */
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(JOURNAL_STORE)) {
        db.createObjectStore(JOURNAL_STORE, { autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

/** Queue a serialised journal POST body for later replay. */
async function queueJournalEntry(body) {
  const db = await openIDB()
  await new Promise((res, rej) => {
    const tx    = db.transaction(JOURNAL_STORE, 'readwrite')
    const store = tx.objectStore(JOURNAL_STORE)
    const req   = store.add({ body, queuedAt: Date.now() })
    req.onsuccess = res
    req.onerror   = () => rej(req.error)
  })
}

/** Return all queued entries as [{ key, body }]. */
async function getAllQueued() {
  const db      = await openIDB()
  return new Promise((res, rej) => {
    const tx      = db.transaction(JOURNAL_STORE, 'readonly')
    const store   = tx.objectStore(JOURNAL_STORE)
    const results = []
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result
      if (cursor) {
        results.push({ key: cursor.key, body: cursor.value.body })
        cursor.continue()
      } else {
        res(results)
      }
    }
    tx.onerror = () => rej(tx.error)
  })
}

/** Delete a successfully replayed entry. */
async function deleteQueued(key) {
  const db = await openIDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction(JOURNAL_STORE, 'readwrite')
    const req = tx.objectStore(JOURNAL_STORE).delete(key)
    req.onsuccess = res
    req.onerror   = () => rej(req.error)
  })
}

/** Evict oldest entries from a cache when it exceeds maxEntries. */
async function evictOldest(cacheName, maxEntries) {
  const cache   = await caches.open(cacheName)
  const keys    = await cache.keys()
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map(k => cache.delete(k)))
  }
}

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      // ignoreSearch: don't fail if query strings differ
      cache.addAll(PRECACHE_URLS.map(url =>
        new Request(url, { cache: 'reload' })
      ))
    ).catch(err => {
      // Non-fatal — some icons may not exist yet during development
      console.warn('[sw] Precache partial failure:', err)
    })
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Delete caches from previous SW versions
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => !ALL_CACHES.includes(k))
            .map(k => caches.delete(k))
        )
      ),
    ])
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event
  const url         = new URL(request.url)

  // Only handle same-origin or Google Fonts
  const isGoogleFonts = url.hostname === 'fonts.googleapis.com' ||
                        url.hostname === 'fonts.gstatic.com'
  if (url.origin !== self.location.origin && !isGoogleFonts) return

  // ── 1. Journal POST → intercept offline ─────────────────────────────────────
  if (request.method === 'POST' && url.pathname === '/api/journal') {
    event.respondWith(handleJournalPost(request))
    return
  }

  // ── 2. Mutations — never cache ───────────────────────────────────────────────
  if (request.method !== 'GET') return

  // ── 3. Next.js static chunks → cache-first (immutable hashed URLs) ──────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // ── 4. Icons + static images → cache-first ──────────────────────────────────
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/badge') ||
    url.pathname === '/og-image.png' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // ── 5. Google Fonts → cache-first (self-host workaround) ────────────────────
  if (isGoogleFonts) {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }

  // ── 6. Playbook API reads → stale-while-revalidate ──────────────────────────
  //    Traders can review mentor playbooks offline. We cache the JSON response
  //    so the checklist and golden rules are available without a connection.
  if (
    url.pathname.startsWith('/api/playbooks') ||
    url.pathname.startsWith('/api/mentors')
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
    return
  }

  // ── 7. API routes (auth, trade, admin) → network-only ───────────────────────
  if (url.pathname.startsWith('/api/')) return

  // ── 8. Page navigations → network-first, offline fallback ───────────────────
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }
})

// ─── Cache strategy implementations ──────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { ignoreSearch: false })
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone())
      evictOldest(cacheName, RUNTIME_CACHE_MAX)
    }
    return response
  }).catch(() => null)

  return cached ?? (await fetchPromise) ?? new Response(
    JSON.stringify({ error: 'Offline' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  )
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    // Cache successful navigations for offline replay
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
      evictOldest(RUNTIME_CACHE, RUNTIME_CACHE_MAX)
    }
    return response
  } catch {
    // Network failed — try the cache first
    const cached = await caches.match(request)
    if (cached) return cached
    // Nothing cached for this URL — serve the offline page
    const offline = await caches.match('/offline')
    return offline ?? new Response('Offline', { status: 503 })
  }
}

// ─── Offline journal queue ─────────────────────────────────────────────────────

async function handleJournalPost(request) {
  try {
    // Try the network first
    const response = await fetch(request.clone())
    return response
  } catch {
    // Offline — queue the entry body and return a synthetic 202 so the UI
    // knows the entry was accepted (it will sync automatically on reconnect).
    try {
      const body = await request.text()
      await queueJournalEntry(body)

      // Register Background Sync if supported
      if ('sync' in self.registration) {
        await self.registration.sync.register(SYNC_TAG)
      }
    } catch (queueErr) {
      console.error('[sw] Failed to queue journal entry:', queueErr)
    }

    return new Response(
      JSON.stringify({
        queued:  true,
        message: 'Entry saved offline — will sync when you reconnect.',
      }),
      {
        status:  202,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayJournalQueue())
  }
})

// Fallback for browsers without Background Sync — replay on reconnect message
self.addEventListener('message', event => {
  if (event.data?.type === 'REPLAY_JOURNAL_QUEUE') {
    event.waitUntil(replayJournalQueue())
  }
  // Allow page to trigger SW update check
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

async function replayJournalQueue() {
  const entries = await getAllQueued()
  if (entries.length === 0) return

  const results = await Promise.allSettled(
    entries.map(async ({ key, body }) => {
      const response = await fetch('/api/journal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (response.ok) {
        await deleteQueued(key)
      } else {
        throw new Error(`Journal sync failed: ${response.status}`)
      }
    })
  )

  const synced = results.filter(r => r.status === 'fulfilled').length
  if (synced > 0) {
    // Notify open clients so they can refresh the journal list
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach(client =>
      client.postMessage({ type: 'JOURNAL_SYNCED', count: synced })
    )
  }
}

// ─── Push ─────────────────────────────────────────────────────────────────────
// Payload structure sent from /api/alerts/test and the scanner:
// {
//   title:    "🟢 Alex G — EUR/USD hit A+",
//   body:     "6/7 checklist items met on the 15min chart. Tap to review.",
//   icon:     "/icons/icon-192.png",
//   tag:      "alert-<mentorId>-<pair>",  // replaces prior notification for same setup
//   url:      "/mentor/<id>?pair=EURUSD&alertId=<uuid>",
//   alertId:  "<uuid>",
// }

self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title:   'Playbuuk Alert',
      body:    event.data.text(),
      url:     '/',
      alertId: null,
    }
  }

  const { title, body, icon, tag, url, alertId } = payload

  const options = {
    body:               body   ?? 'Setup conditions met. Tap to review.',
    icon:               icon   ?? '/icons/icon-192.png',
    badge:                        '/badge-72.png',
    tag:                tag    ?? 'playbuuk-alert',
    data:               { url: url ?? '/', alertId: alertId ?? null },
    requireInteraction: false,
    vibrate:            [200, 100, 200],
    actions: [
      { action: 'view',    title: 'View Setup' },
      { action: 'dismiss', title: 'Dismiss'    },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title ?? 'Playbuuk Alert', options)
  )
})

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const { url, alertId } = event.notification.data ?? {}
  const targetUrl = url || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c =>
          new URL(c.url).origin === self.location.origin
        )
        if (existing) {
          existing.navigate(targetUrl)
          return existing.focus()
        }
        return self.clients.openWindow(targetUrl)
      })
      .then(() => {
        if (alertId) {
          return fetch(`/api/alerts/${alertId}/tap`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => {/* non-critical */})
        }
      })
  )
})
