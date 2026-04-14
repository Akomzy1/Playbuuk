// app/api/journal/route.ts
//
// GET  /api/journal — list user's trade journal entries (paginated + filtered)
// POST /api/journal — create a manual trade entry
//
// GET query params:
//   page, limit, mentor_id, pair, grade, outcome, emotion, override, alert_initiated
//   date_from (ISO), date_to (ISO)
//
// POST body: { pair, direction, playbook_id?, entry_price?, stop_loss?,
//              take_profit?, lot_size?, risk_r?, setup_grade?,
//              pre_trade_emotion?, notes? }

import { NextResponse, type NextRequest } from 'next/server'
import { type Prisma }     from '@prisma/client'
import { z }               from 'zod'
import { createClient }    from '@/lib/supabase/server'
import { db }              from '@/lib/db'

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  const page       = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
  const limit      = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const skip       = (page - 1) * limit

  const mentor_id       = searchParams.get('mentor_id')        ?? undefined
  const pair            = searchParams.get('pair')             ?? undefined
  const grade           = searchParams.get('grade')            ?? undefined
  const outcome         = searchParams.get('outcome')          ?? undefined
  const emotion         = searchParams.get('emotion')          ?? undefined
  const override        = searchParams.get('override')         ?? undefined
  const alert_initiated = searchParams.get('alert_initiated')  ?? undefined
  const date_from       = searchParams.get('date_from')        ?? undefined
  const date_to         = searchParams.get('date_to')          ?? undefined

  // Build where clause
  const where: Prisma.TradeJournalWhereInput = { user_id: user.id }

  if (pair)    where.pair         = { contains: pair.toUpperCase() }
  if (grade)   where.setup_grade  = grade
  if (outcome) where.outcome      = outcome as Prisma.EnumTradeOutcomeFilter
  if (emotion) where.pre_trade_emotion = emotion
  if (override        !== undefined) where.grade_override   = override === 'true'
  if (alert_initiated !== undefined) where.alert_initiated  = alert_initiated === 'true'

  if (date_from || date_to) {
    where.created_at = {
      ...(date_from ? { gte: new Date(date_from) } : {}),
      ...(date_to   ? { lte: new Date(date_to)   } : {}),
    }
  }

  // Filter by mentor's playbook ids
  if (mentor_id) {
    const playbookIds = (await db.playbook.findMany({
      where:  { mentor_id },
      select: { id: true },
    })).map(p => p.id)

    if (playbookIds.length === 0) {
      return NextResponse.json({ entries: [], total: 0, page, pages: 0 })
    }
    where.playbook_id = { in: playbookIds }
  }

  const [entries, total] = await Promise.all([
    db.tradeJournal.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        playbook: {
          select: {
            id: true,
            strategy_name: true,
            mentor: {
              select: { id: true, display_name: true, handle: true, avatar_emoji: true },
            },
          },
        },
      },
    }),
    db.tradeJournal.count({
      where,
    }),
  ])

  const serialised = entries.map(e => ({
    id:                e.id,
    pair:              e.pair,
    direction:         e.direction,
    risk_r:            e.risk_r    ? Number(e.risk_r)     : null,
    setup_grade:       e.setup_grade,
    entry_price:       e.entry_price  ? Number(e.entry_price)  : null,
    stop_loss:         e.stop_loss    ? Number(e.stop_loss)    : null,
    take_profit:       e.take_profit  ? Number(e.take_profit)  : null,
    lot_size:          e.lot_size     ? Number(e.lot_size)     : null,
    outcome:           e.outcome,
    pnl_r:             e.pnl_r     ? Number(e.pnl_r)      : null,
    mt5_ticket:        e.mt5_ticket,
    execution_source:  e.execution_source,
    grade_override:    e.grade_override,
    pre_trade_emotion: e.pre_trade_emotion,
    post_trade_note:   e.post_trade_note,
    notes:             e.notes,
    alert_initiated:   e.alert_initiated,
    created_at:        e.created_at.toISOString(),
    playbook: e.playbook ? {
      id:            e.playbook.id,
      strategy_name: e.playbook.strategy_name,
      mentor: {
        id:           e.playbook.mentor.id,
        display_name: e.playbook.mentor.display_name,
        handle:       e.playbook.mentor.handle,
        avatar_emoji: e.playbook.mentor.avatar_emoji,
      },
    } : null,
  }))

  return NextResponse.json({
    entries: serialised,
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

// ─── POST ──────────────────────────────────────────────────────────────────────

const PostSchema = z.object({
  pair:               z.string().min(1).max(20).toUpperCase(),
  direction:          z.enum(['long', 'short']),
  playbook_id:        z.string().uuid().optional(),
  entry_price:        z.number().positive().optional(),
  stop_loss:          z.number().positive().optional(),
  take_profit:        z.number().positive().optional(),
  lot_size:           z.number().positive().optional(),
  risk_r:             z.number().optional(),
  setup_grade:        z.enum(['A+', 'B+', 'C+', 'D+']).optional(),
  pre_trade_emotion:  z.enum(['FOMO', 'Revenge', 'Boredom', 'Conviction', 'Calm']).optional(),
  notes:              z.string().max(5000).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 })
  }

  const {
    pair, direction, playbook_id,
    entry_price, stop_loss, take_profit, lot_size, risk_r,
    setup_grade, pre_trade_emotion, notes,
  } = parsed.data

  // Verify playbook belongs to a mentor the user follows (if provided)
  if (playbook_id) {
    const playbook = await db.playbook.findUnique({
      where:  { id: playbook_id },
      select: { mentor_id: true },
    })
    if (!playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
    }
    const follows = await db.mentorFollow.findFirst({
      where: { user_id: user.id, mentor_id: playbook.mentor_id },
    })
    if (!follows) {
      return NextResponse.json({ error: 'You do not follow this mentor' }, { status: 403 })
    }
  }

  try {
    const entry = await db.tradeJournal.create({
      data: {
        user_id:           user.id,
        playbook_id:       playbook_id ?? null,
        pair,
        direction,
        entry_price:       entry_price  ?? null,
        stop_loss:         stop_loss    ?? null,
        take_profit:       take_profit  ?? null,
        lot_size:          lot_size     ?? null,
        risk_r:            risk_r       ?? null,
        setup_grade:       setup_grade  ?? null,
        pre_trade_emotion: pre_trade_emotion ?? null,
        notes:             notes        ?? null,
        execution_source:  'manual',
        outcome:           'pending',
      },
      select: { id: true, created_at: true },
    })

    // Log usage event if playbook linked
    if (playbook_id) {
      await db.playbookUsage.create({
        data: {
          user_id:    user.id,
          playbook_id,
          event_type: 'trade_logged',
        },
      }).catch(() => {/* non-critical */})
    }

    return NextResponse.json({ entry }, { status: 201 })

  } catch (err) {
    console.error('[journal] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
