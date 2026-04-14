// app/api/alerts/[id]/tap/route.ts
//
// POST /api/alerts/:id/tap
//   Called by the service worker (sw.js) when the trader taps a notification.
//   Marks the alert_log entry as tapped with a timestamp.
//   No auth required — the alertId is the only identifier (UUID, unguessable).
//   Fire-and-forget from the SW; failures are silently ignored.

import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, context: RouteContext) {
  const { id: alertId } = await context.params

  // Basic UUID format check — don't expose DB errors for invalid IDs
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(alertId)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    await db.alertLog.updateMany({
      where: {
        id:     alertId,
        tapped: false,     // idempotent — skip if already tapped
      },
      data: {
        tapped:    true,
        tapped_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true })

  } catch {
    // Non-critical — SW fire-and-forget; never block the notification open
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
