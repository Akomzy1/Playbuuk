// lib/alerts/push.ts — Client-side Web Push registration utilities.
//
// Usage flow:
//   1. isPushSupported()       — feature detect
//   2. subscribeToPush()       — requests permission + subscribes + saves to server
//   3. unsubscribeFromPush()   — unsubscribes + clears from server
//
// The push_subscription JSON is saved via PUT /api/alerts/preferences so the
// server can use web-push to deliver notifications without any additional lookup.

const SW_PATH = '/sw.js'

// ─── Feature detection ────────────────────────────────────────────────────────

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager'  in window &&
    'Notification' in window
  )
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

// ─── Service Worker registration ─────────────────────────────────────────────

async function getOrRegisterSW(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_PATH)
    if (existing) return existing
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
  } catch (err) {
    console.error('[push] SW registration failed:', err)
    return null
  }
}

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isPushSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied')  return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

// ─── VAPID key helper ─────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64     = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(b64)
  const result  = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) result[i] = raw.charCodeAt(i)
  return result
}

// ─── Subscribe ────────────────────────────────────────────────────────────────

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const granted = await requestNotificationPermission()
  if (!granted) return null

  const reg = await getOrRegisterSW()
  if (!reg) return null

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
    return null
  }

  try {
    // Return existing sub if already subscribed
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      await saveSubscriptionToServer(existing)
      return existing
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    await saveSubscriptionToServer(subscription)
    return subscription

  } catch (err) {
    console.error('[push] subscribe error:', err)
    return null
  }
}

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
    if (!reg) return false

    const sub = await reg.pushManager.getSubscription()
    if (!sub) {
      await saveSubscriptionToServer(null)
      return true
    }

    const ok = await sub.unsubscribe()
    if (ok) await saveSubscriptionToServer(null)
    return ok

  } catch (err) {
    console.error('[push] unsubscribe error:', err)
    return false
  }
}

// ─── Get current subscription (for UI state) ─────────────────────────────────

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
    if (!reg) return null
    return reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

// ─── Server persistence ───────────────────────────────────────────────────────

async function saveSubscriptionToServer(sub: PushSubscription | null): Promise<void> {
  await fetch('/api/alerts/preferences', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ push_subscription: sub ? sub.toJSON() : null }),
  }).catch(err => console.error('[push] save subscription error:', err))
}
