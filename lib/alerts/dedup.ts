// lib/alerts/dedup.ts
// Deduplication and rate-limit checks for alert notifications.
// Used from Next.js API routes (Prisma). Edge function has its own inline version.

import { db } from '@/lib/db'

const DEDUP_WINDOW_MS  = 30 * 60 * 1000   // 30 minutes
const RATE_LIMIT_MAX   = 10                // max alerts per hour
const RATE_LIMIT_MS    = 60 * 60 * 1000   // 1 hour window

// ─── checkRecentAlert ─────────────────────────────────────────────────────────
// Returns true if the same mentor+pair+grade combo was alerted within 30 min.
// This prevents hammering the trader with the same alert repeatedly.

export async function checkRecentAlert(
  userId:   string,
  mentorId: string,
  pair:     string,
  grade:    string,
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS)

  const recent = await db.alertLog.findFirst({
    where: {
      user_id:   userId,
      mentor_id: mentorId,
      pair:      pair.toUpperCase(),
      grade,
      sent_at:   { gte: since },
    },
    select: { id: true },
  })

  return recent !== null
}

// ─── checkRateLimit ───────────────────────────────────────────────────────────
// Returns true if the user has hit their hourly alert cap (10/hour).

export async function checkRateLimit(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_MS)

  const count = await db.alertLog.count({
    where: {
      user_id: userId,
      sent_at: { gte: since },
    },
  })

  return count >= RATE_LIMIT_MAX
}

// ─── logAlert ─────────────────────────────────────────────────────────────────
// Create an alert_log entry. Returns the new log ID for embedding in notification data.

export async function logAlert(opts: {
  userId:         string
  mentorId:       string
  playbookId:     string
  pair:           string
  grade:          string
  checklistScore: number
}): Promise<string> {
  const entry = await db.alertLog.create({
    data: {
      user_id:         opts.userId,
      mentor_id:       opts.mentorId,
      playbook_id:     opts.playbookId,
      pair:            opts.pair.toUpperCase(),
      grade:           opts.grade,
      checklist_score: opts.checklistScore,
      tapped:          false,
      resulted_in_trade: false,
    },
    select: { id: true },
  })
  return entry.id
}
