// app/api/mentor/analytics/route.ts
//
// GET /api/mentor/analytics
// Returns usage analytics for the authenticated mentor's playbook:
//   - usage_by_month: 6-month rolling breakdown by event type
//   - top_followers: top 10 engaged followers (anonymised)
//   - totals: lifetime counts per event type

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

export async function GET(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve mentor record for this user
  const mentor = await db.mentor.findUnique({
    where:  { user_id: user.id },
    select: { id: true },
  })
  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  // Fetch the mentor's playbook IDs
  const playbooks = await db.playbook.findMany({
    where:  { mentor_id: mentor.id },
    select: { id: true },
  })
  const playbookIds = playbooks.map(p => p.id)

  if (playbookIds.length === 0) {
    return NextResponse.json({
      usage_by_month: [],
      top_followers:  [],
      totals: { checklist_open: 0, time_spent: 0, trade_logged: 0, trade_executed: 0 },
    })
  }

  // Fetch all usage events for these playbooks
  const events = await db.playbookUsage.findMany({
    where: {
      playbook_id: { in: playbookIds },
      created_at:  { gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      user_id:        true,
      event_type:     true,
      duration_seconds: true,
      created_at:     true,
    },
    orderBy: { created_at: 'asc' },
  })

  // ── Usage by month ─────────────────────────────────────────────────────────
  const monthMap = new Map<string, {
    label: string
    checklistOpens: number
    timeSpent: number
    tradesLogged: number
    tradesExecuted: number
  }>()

  for (const e of events) {
    const d     = new Date(e.created_at)
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    if (!monthMap.has(key)) {
      monthMap.set(key, { label, checklistOpens: 0, timeSpent: 0, tradesLogged: 0, tradesExecuted: 0 })
    }
    const m = monthMap.get(key)!
    if (e.event_type === 'checklist_open') m.checklistOpens++
    if (e.event_type === 'time_spent')     m.timeSpent += Math.round((e.duration_seconds ?? 0) / 60)
    if (e.event_type === 'trade_logged')   m.tradesLogged++
    if (e.event_type === 'trade_executed') m.tradesExecuted++
  }

  const usage_by_month = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }))

  // ── Top followers ──────────────────────────────────────────────────────────
  const followerMap = new Map<string, { points: number; lastActive: Date; isPro: boolean }>()

  for (const e of events) {
    const uid = e.user_id
    if (!followerMap.has(uid)) {
      followerMap.set(uid, { points: 0, lastActive: new Date(e.created_at), isPro: false })
    }
    const f = followerMap.get(uid)!
    // Points: checklist_open=1, time_spent=1/5min, trade_logged=2, trade_executed=3
    if (e.event_type === 'checklist_open') f.points += 1
    if (e.event_type === 'time_spent')     f.points += Math.floor((e.duration_seconds ?? 0) / 300)
    if (e.event_type === 'trade_logged')   f.points += 2
    if (e.event_type === 'trade_executed') f.points += 3
    if (new Date(e.created_at) > f.lastActive) f.lastActive = new Date(e.created_at)
  }

  // Check Pro status for top followers
  const topUserIds = Array.from(followerMap.entries())
    .sort(([, a], [, b]) => b.points - a.points)
    .slice(0, 10)
    .map(([uid]) => uid)

  const profiles = await db.profile.findMany({
    where:  { id: { in: topUserIds } },
    select: { id: true, tier: true },
  })
  const tierMap = new Map(profiles.map(p => [p.id, p.tier]))

  function fmtLastActive(d: Date) {
    const diffMs = Date.now() - d.getTime()
    const diffH  = diffMs / 3_600_000
    if (diffH < 1)   return `${Math.round(diffMs / 60_000)}m ago`
    if (diffH < 24)  return `${Math.round(diffH)}h ago`
    if (diffH < 48)  return 'Yesterday'
    return `${Math.floor(diffH / 24)}d ago`
  }

  const top_followers = topUserIds.map((uid, i) => {
    const f = followerMap.get(uid)!
    return {
      anonymousId:     `Trader #${String(uid.slice(-4).toUpperCase().replace(/[^0-9]/g, '').padStart(4, '0'))}`,
      totalPoints:     f.points,
      lastActiveLabel: fmtLastActive(f.lastActive),
      isPro:           (tierMap.get(uid) ?? 'free') !== 'free',
      rank:            i + 1,
    }
  })

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totals = events.reduce(
    (acc, e) => {
      acc[e.event_type as keyof typeof acc] = (acc[e.event_type as keyof typeof acc] ?? 0) + 1
      return acc
    },
    { checklist_open: 0, time_spent: 0, trade_logged: 0, trade_executed: 0 },
  )

  return NextResponse.json({ usage_by_month, top_followers, totals })
}
