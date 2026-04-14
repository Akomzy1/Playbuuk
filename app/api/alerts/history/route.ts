// app/api/alerts/history/route.ts
//
// GET /api/alerts/history
//   Returns paginated alert history for the authenticated user.
//   Includes mentor + playbook context, tap status, and trade conversion.
//
// Query params: page (default 1), limit (default 20, max 50)
// Response includes computed analytics: tap rate, conversion rate, alert win rate.

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page  = Math.max(1,  parseInt(searchParams.get('page')  ?? '1',  10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
  const skip  = (page - 1) * limit

  const [alerts, total] = await Promise.all([
    db.alertLog.findMany({
      where:   { user_id: user.id },
      orderBy: { sent_at: 'desc' },
      skip,
      take:    limit,
      select: {
        id:                true,
        pair:              true,
        grade:             true,
        checklist_score:   true,
        sent_at:           true,
        tapped:            true,
        tapped_at:         true,
        resulted_in_trade: true,
        trade_id:          true,
        mentor: {
          select: {
            id:           true,
            display_name: true,
            handle:       true,
            avatar_emoji: true,
          },
        },
        playbook: {
          select: {
            id:            true,
            strategy_name: true,
          },
        },
      },
    }),
    db.alertLog.count({ where: { user_id: user.id } }),
  ])

  // ── Aggregate analytics (all-time) ────────────────────────────────────────
  const [allAlerts, tappedCount, convertedCount] = await Promise.all([
    db.alertLog.count({ where: { user_id: user.id } }),
    db.alertLog.count({ where: { user_id: user.id, tapped: true } }),
    db.alertLog.count({ where: { user_id: user.id, resulted_in_trade: true } }),
  ])

  const tapRate        = allAlerts > 0 ? (tappedCount  / allAlerts) * 100 : null
  const conversionRate = allAlerts > 0 ? (convertedCount / allAlerts) * 100 : null

  const serialised = alerts.map(a => ({
    id:                a.id,
    pair:              a.pair,
    grade:             a.grade,
    checklist_score:   Number(a.checklist_score),
    sent_at:           a.sent_at.toISOString(),
    tapped:            a.tapped,
    tapped_at:         a.tapped_at?.toISOString() ?? null,
    resulted_in_trade: a.resulted_in_trade,
    trade_id:          a.trade_id,
    mentor: {
      id:           a.mentor.id,
      display_name: a.mentor.display_name,
      handle:       a.mentor.handle,
      avatar_emoji: a.mentor.avatar_emoji,
    },
    playbook: {
      id:            a.playbook.id,
      strategy_name: a.playbook.strategy_name,
    },
  }))

  return NextResponse.json({
    alerts: serialised,
    total,
    page,
    pages: Math.ceil(total / limit),
    analytics: {
      total_alerts:     allAlerts,
      tapped:           tappedCount,
      converted:        convertedCount,
      tap_rate:         tapRate,
      conversion_rate:  conversionRate,
    },
  })
}
