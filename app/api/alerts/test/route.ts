// app/api/alerts/test/route.ts
//
// POST /api/alerts/test
//   Sends a test push notification to the authenticated user's registered device.
//   Requires the user to have a push_subscription stored in alert_preferences.
//
// NOTE: requires `npm install web-push` + `npm install -D @types/web-push`
//   Then set in .env.local:
//     NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated>
//     VAPID_PRIVATE_KEY=<generated>
//     VAPID_SUBJECT=mailto:support@playbuuk.com
//   Generate keys: npx web-push generate-vapid-keys

import { NextResponse, type NextRequest } from 'next/server'
import { Prisma }        from '@prisma/client'
import { createClient }  from '@/lib/supabase/server'
import { db }            from '@/lib/db'
import webpush           from 'web-push'

// ─── VAPID initialisation ─────────────────────────────────────────────────────

const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:support@playbuuk.com'

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest) {
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      { error: 'VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.' },
      { status: 500 },
    )
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Load stored push subscription
  const prefs = await db.alertPreferences.findUnique({
    where:  { user_id: user.id },
    select: { push_subscription: true, push_enabled: true },
  })

  if (!prefs?.push_subscription) {
    return NextResponse.json(
      { error: 'No push subscription found. Enable notifications first.' },
      { status: 400 },
    )
  }

  if (!prefs.push_enabled) {
    return NextResponse.json(
      { error: 'Push notifications are disabled in your preferences.' },
      { status: 400 },
    )
  }

  // Build the subscription object expected by web-push
  const sub = prefs.push_subscription as {
    endpoint: string
    keys:     { p256dh: string; auth: string }
  }

  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json(
      { error: 'Stored push subscription is malformed. Re-enable notifications.' },
      { status: 400 },
    )
  }

  const payload = JSON.stringify({
    title:   '🟢 Playbuuk Test Alert',
    body:    'Setup alerts are working. You\'ll be notified when A+ conditions are met.',
    icon:    '/icon-192.png',
    tag:     'playbuuk-test',
    url:     '/',
    alertId: null,
  })

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth:   sub.keys.auth,
        },
      },
      payload,
      {
        TTL:     60,    // 60 seconds — discard if not delivered within 1 minute
        urgency: 'normal',
      },
    )

    return NextResponse.json({ success: true, message: 'Test notification sent.' })

  } catch (err: unknown) {
    // 410 Gone = subscription expired/unsubscribed — clear it from DB
    if (
      err instanceof Error &&
      'statusCode' in err &&
      (err as { statusCode: number }).statusCode === 410
    ) {
      await db.alertPreferences.update({
        where: { user_id: user.id },
        data:  { push_subscription: Prisma.DbNull },
      })
      return NextResponse.json(
        { error: 'Push subscription expired. Please re-enable notifications.' },
        { status: 410 },
      )
    }

    console.error('[alerts/test] send error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
