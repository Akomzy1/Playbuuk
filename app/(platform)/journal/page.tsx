// app/(platform)/journal/page.tsx
// Trade journal with psychology insights.
// Server Component: fetches initial entries + followed playbooks.
// Passes to client shell for filters, form, infinite scroll.

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'
import { JournalShell } from '@/components/journal/journal-shell'
import type { JournalEntryData } from '@/components/journal/journal-entry'

// ─── SEO ──────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Trading Journal with Psychology Insights — Playbuuk',
  description: 'Track every trade with emotion tags, grade compliance, and override data. Playbuuk surfaces your psychology patterns: when you FOMO, when you override, when you trade best.',
  keywords:    ['trading journal', 'trading psychology insights', 'FOMO trading log', 'trade emotion tracker', 'grade override journal', 'forex trading diary'],
  openGraph: {
    title:       'Trading Journal with Psychology Insights — Playbuuk',
    description: 'Know your patterns. Stop your leaks. Trade the plan, not the emotion.',
    type:        'website',
  },
  twitter: { card: 'summary_large_image' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MentorPlaybookOption {
  playbook_id:   string
  strategy_name: string
  mentor_id:     string
  display_name:  string
  avatar_emoji:  string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JournalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect handled by middleware; show nothing during hydration
    return null
  }

  // Fetch initial page of journal entries
  const rawEntries = await db.tradeJournal.findMany({
    where:   { user_id: user.id },
    orderBy: { created_at: 'desc' },
    take:    25,
    include: {
      playbook: {
        select: {
          id:            true,
          strategy_name: true,
          mentor: {
            select: { id: true, display_name: true, handle: true, avatar_emoji: true },
          },
        },
      },
    },
  })

  // Fetch followed mentors' playbooks for the form selector
  const follows = await db.mentorFollow.findMany({
    where:  { user_id: user.id },
    select: {
      mentor: {
        select: {
          id:           true,
          display_name: true,
          avatar_emoji: true,
          playbooks: {
            where:  { published_at: { not: null } },
            select: { id: true, strategy_name: true },
            take:   1,
          },
        },
      },
    },
  })

  const followedPlaybooks: MentorPlaybookOption[] = follows
    .flatMap(f => f.mentor.playbooks.map(pb => ({
      playbook_id:   pb.id,
      strategy_name: pb.strategy_name,
      mentor_id:     f.mentor.id,
      display_name:  f.mentor.display_name,
      avatar_emoji:  f.mentor.avatar_emoji ?? '',
    })))

  // Serialise entries
  const initialEntries: JournalEntryData[] = rawEntries.map(e => ({
    id:                e.id,
    pair:              e.pair,
    direction:         e.direction as 'long' | 'short',
    risk_r:            e.risk_r    ? Number(e.risk_r)    : null,
    setup_grade:       e.setup_grade,
    entry_price:       e.entry_price  ? Number(e.entry_price)  : null,
    stop_loss:         e.stop_loss    ? Number(e.stop_loss)    : null,
    take_profit:       e.take_profit  ? Number(e.take_profit)  : null,
    lot_size:          e.lot_size     ? Number(e.lot_size)     : null,
    outcome:           e.outcome      as JournalEntryData['outcome'],
    pnl_r:             e.pnl_r     ? Number(e.pnl_r)     : null,
    mt5_ticket:        e.mt5_ticket,
    execution_source:  e.execution_source as 'manual' | 'playbuuk',
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
        avatar_emoji: e.playbook.mentor.avatar_emoji ?? '',
      },
    } : null,
  }))

  return (
    <JournalShell
      initialEntries={initialEntries}
      followedPlaybooks={followedPlaybooks}
    />
  )
}
