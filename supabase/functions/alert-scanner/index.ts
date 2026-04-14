// supabase/functions/alert-scanner/index.ts
//
// Background scanner — evaluates all pair × mentor combos for every Pro user
// with push notifications enabled, fires Web Push alerts when grade >= threshold.
//
// ── Cron setup ─────────────────────────────────────────────────────────────────
// Schedule this function in supabase/config.toml:
//
//   [functions.alert-scanner]
//   schedule = "*/30 * * * * *"    # every 30 seconds
//
// Or via the Supabase dashboard: Functions → alert-scanner → Cron → Add Schedule
//
// ── Required secrets (set via: supabase secrets set KEY=value) ─────────────────
//   VAPID_PUBLIC_KEY     — NEXT_PUBLIC_VAPID_PUBLIC_KEY value (no NEXT_PUBLIC_ prefix here)
//   VAPID_PRIVATE_KEY    — same as .env.local VAPID_PRIVATE_KEY
//   VAPID_SUBJECT        — mailto:support@playbuuk.com
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by the runtime.
//
// ── Dependencies ───────────────────────────────────────────────────────────────
// Uses npm:web-push via Deno's npm compatibility (Deno >= 1.28 / Supabase runtime).

import { createClient }   from 'https://esm.sh/@supabase/supabase-js@2'
import webpush            from 'npm:web-push@3.6.7'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PushSubscriptionJSON {
  endpoint: string
  keys:     { p256dh: string; auth: string }
}

interface AlertPrefsRow {
  user_id:           string
  alert_threshold:   'a_plus' | 'b_plus' | 'c_plus'
  alert_mentors:     string[] | null
  alert_pairs:       string[] | null
  alert_sessions:    string[] | null
  quiet_hours_start: string | null
  quiet_hours_end:   string | null
  push_enabled:      boolean
  push_subscription: PushSubscriptionJSON
}

interface PlaybookRow {
  id:              string
  mentor_id:       string
  strategy_name:   string
  preferred_pairs: string[]
  mentor: {
    id:           string
    display_name: string
    avatar_emoji: string
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_ORDER: Record<string, number> = { 'A+': 4, 'B+': 3, 'C+': 2, 'D+': 1 }
const THRESHOLD_GRADE: Record<string, string> = {
  a_plus: 'A+',
  b_plus: 'B+',
  c_plus: 'C+',
}
const DEDUP_WINDOW_MS  = 30 * 60 * 1000   // 30 min
const RATE_LIMIT_MAX   = 10               // per hour
const RATE_LIMIT_MS    = 60 * 60 * 1000   // 1 hour

// ─── Session detection ────────────────────────────────────────────────────────

function getActiveSessions(utcHour: number, utcMin: number): string[] {
  const t = utcHour * 60 + utcMin
  const s: string[] = []
  if (t >= 0   && t <  9 * 60)              s.push('tokyo')
  if (t >= 8 * 60 && t < 17 * 60)          s.push('london')
  if (t >= 13 * 60 && t < 22 * 60)         s.push('new_york')
  if (t >= 22 * 60 || t < 7 * 60)          s.push('sydney')
  return s
}

// ─── Quiet hours check ────────────────────────────────────────────────────────
// Returns true if current UTC time is inside the user's quiet window.

function isQuietHours(
  start: string | null,
  end:   string | null,
  now:   Date,
): boolean {
  if (!start || !end) return false
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const t      = now.getUTCHours() * 60 + now.getUTCMinutes()
  const tStart = sh * 60 + sm
  const tEnd   = eh * 60 + em
  // Handle overnight wrap (e.g. 22:00 → 06:00)
  return tStart <= tEnd
    ? t >= tStart && t < tEnd
    : t >= tStart || t < tEnd
}

// ─── Simulated grade evaluation (MVP) ────────────────────────────────────────
// Deterministic pseudo-random grade based on pair + mentorId + 5-min bucket.
// In Phase 2, this is replaced by the real market engine evaluator.

function simpleHash(s: string): number {
  let h = 2_166_136_261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16_777_619) >>> 0
  }
  return h
}

function simulateGrade(pair: string, mentorId: string): string {
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000))
  const h      = simpleHash(`${pair}:${mentorId}:${bucket}`) % 100
  if (h < 10) return 'A+'
  if (h < 28) return 'B+'
  if (h < 58) return 'C+'
  return 'D+'
}

function simulateChecklistScore(grade: string, seed: number): number {
  const offset = seed % 13
  const base: Record<string, number> = { 'A+': 86, 'B+': 72, 'C+': 56, 'D+': 28 }
  return (base[grade] ?? 50) + offset
}

// ─── Dedup check ──────────────────────────────────────────────────────────────

async function wasRecentlyAlerted(
  supabase:  ReturnType<typeof createClient>,
  userId:    string,
  mentorId:  string,
  pair:      string,
  grade:     string,
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
  const { data } = await supabase
    .from('alert_log')
    .select('id')
    .eq('user_id',   userId)
    .eq('mentor_id', mentorId)
    .eq('pair',      pair)
    .eq('grade',     grade)
    .gte('sent_at',  since)
    .limit(1)
  return (data?.length ?? 0) > 0
}

// ─── Rate limit check ─────────────────────────────────────────────────────────

async function isRateLimited(
  supabase: ReturnType<typeof createClient>,
  userId:   string,
): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_MS).toISOString()
  const { count } = await supabase
    .from('alert_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', since)
  return (count ?? 0) >= RATE_LIMIT_MAX
}

// ─── Log alert ────────────────────────────────────────────────────────────────

async function logAlert(
  supabase:        ReturnType<typeof createClient>,
  userId:          string,
  mentorId:        string,
  playbookId:      string,
  pair:            string,
  grade:           string,
  checklistScore:  number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('alert_log')
    .insert({
      user_id:          userId,
      mentor_id:        mentorId,
      playbook_id:      playbookId,
      pair:             pair.toUpperCase(),
      grade,
      checklist_score:  checklistScore,
      tapped:           false,
      resulted_in_trade: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[scanner] logAlert error:', error.message)
    return null
  }
  return data?.id ?? null
}

// ─── Send push notification ───────────────────────────────────────────────────

async function sendPush(
  subscription:    PushSubscriptionJSON,
  payload:         object,
): Promise<{ ok: boolean; expired: boolean }> {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload),
      { TTL: 120, urgency: 'normal' },
    )
    return { ok: true, expired: false }
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 410 || status === 404) {
      // Subscription expired/unregistered — caller should clear it
      return { ok: false, expired: true }
    }
    console.error('[scanner] push send error:', err)
    return { ok: false, expired: false }
  }
}

// ─── Clear expired subscription ───────────────────────────────────────────────

async function clearExpiredSubscription(
  supabase: ReturnType<typeof createClient>,
  userId:   string,
): Promise<void> {
  await supabase
    .from('alert_preferences')
    .update({ push_subscription: null })
    .eq('user_id', userId)
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublic     = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate    = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@playbuuk.com'

  if (!vapidPublic || !vapidPrivate) {
    console.error('[scanner] VAPID keys not set')
    return new Response('VAPID keys missing', { status: 500 })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const now      = new Date()

  // ── 1. Get all Pro users with push enabled ─────────────────────────────────

  // Get Pro profile IDs
  const { data: proProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('tier', 'pro')

  if (!proProfiles?.length) {
    return new Response(JSON.stringify({ scanned: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const proIds = proProfiles.map((p: { id: string }) => p.id)

  // Get their alert preferences (with active push subscriptions)
  const { data: prefsList } = await supabase
    .from('alert_preferences')
    .select('*')
    .eq('push_enabled', true)
    .not('push_subscription', 'is', null)
    .in('user_id', proIds)

  if (!prefsList?.length) {
    return new Response(JSON.stringify({ scanned: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const activeSessions = getActiveSessions(now.getUTCHours(), now.getUTCMinutes())
  let alertsSent = 0

  // ── 2. Process each user ───────────────────────────────────────────────────

  for (const prefs of prefsList as AlertPrefsRow[]) {
    const { user_id, alert_threshold, alert_mentors, alert_pairs,
            alert_sessions, quiet_hours_start, quiet_hours_end,
            push_subscription } = prefs

    // Skip if in quiet hours
    if (isQuietHours(quiet_hours_start, quiet_hours_end, now)) continue

    // Skip if no active sessions match user's filter
    if (alert_sessions && alert_sessions.length > 0) {
      const hasMatchingSession = alert_sessions.some(s => activeSessions.includes(s))
      if (!hasMatchingSession) continue
    }

    // Check hourly rate limit for this user
    if (await isRateLimited(supabase, user_id)) continue

    // Get followed mentor playbooks for this user
    const { data: follows } = await supabase
      .from('mentor_follows')
      .select(`
        mentor_id,
        mentor:mentors!inner(
          id,
          display_name,
          avatar_emoji,
          playbooks(
            id,
            strategy_name,
            preferred_pairs,
            published_at
          )
        )
      `)
      .eq('user_id', user_id)

    if (!follows?.length) continue

    // Build list of mentor+playbook combos to scan
    const toScan: Array<{ playbook: PlaybookRow; pairs: string[] }> = []

    for (const follow of follows) {
      const mentor   = (follow as unknown as { mentor: PlaybookRow['mentor'] & { playbooks: Array<{ id: string; strategy_name: string; preferred_pairs: unknown; published_at: string | null }> } }).mentor
      if (!mentor) continue

      // Filter by user's allowed mentors list (null = all)
      if (alert_mentors && !alert_mentors.includes(mentor.id)) continue

      for (const pb of mentor.playbooks) {
        if (!pb.published_at) continue  // skip unpublished

        const mentorPreferred = Array.isArray(pb.preferred_pairs)
          ? (pb.preferred_pairs as string[])
          : []

        // Pairs to scan: user override → mentor preferred pairs → skip
        const pairsToScan = alert_pairs && alert_pairs.length > 0
          ? alert_pairs
          : mentorPreferred.length > 0
          ? mentorPreferred
          : []

        if (pairsToScan.length === 0) continue

        toScan.push({
          playbook: {
            id:              pb.id,
            mentor_id:       mentor.id,
            strategy_name:   pb.strategy_name,
            preferred_pairs: mentorPreferred,
            mentor: {
              id:           mentor.id,
              display_name: mentor.display_name,
              avatar_emoji: mentor.avatar_emoji,
            },
          },
          pairs: pairsToScan,
        })
      }
    }

    // ── 3. Evaluate each pair and send if grade >= threshold ───────────────

    const minGrade   = THRESHOLD_GRADE[alert_threshold] ?? 'A+'
    const minGradeN  = GRADE_ORDER[minGrade] ?? 4

    for (const { playbook, pairs } of toScan) {
      // Re-check rate limit after each alert sent
      if (await isRateLimited(supabase, user_id)) break

      for (const pair of pairs) {
        const grade = simulateGrade(pair, playbook.mentor_id)
        if ((GRADE_ORDER[grade] ?? 0) < minGradeN) continue

        // Dedup check
        if (await wasRecentlyAlerted(supabase, user_id, playbook.mentor_id, pair, grade)) continue

        // Log the alert before sending (get the ID for the notification payload)
        const seed           = simpleHash(`${pair}:${playbook.mentor_id}`)
        const checklistScore = simulateChecklistScore(grade, seed)
        const alertId        = await logAlert(
          supabase, user_id, playbook.mentor_id,
          playbook.id, pair, grade, checklistScore,
        )
        if (!alertId) continue

        // Build notification payload
        const checklist_items_met = Math.round(checklistScore / 14.3)  // out of 7
        const payload = {
          title:   `${gradeEmoji(grade)} ${playbook.mentor.display_name} — ${pair.toUpperCase()} hit ${grade}`,
          body:    `${checklist_items_met}/7 checklist items met. Tap to review the setup.`,
          icon:    '/icon-192.png',
          tag:     `alert-${playbook.mentor_id}-${pair.toLowerCase()}`,
          url:     `/mentor/${playbook.mentor_id}?pair=${pair.toUpperCase()}&alertId=${alertId}`,
          alertId,
        }

        const result = await sendPush(push_subscription, payload)

        if (result.expired) {
          // Subscription is stale — clear it and stop scanning this user
          await clearExpiredSubscription(supabase, user_id)
          break
        }

        if (result.ok) alertsSent++
      }
    }
  }

  console.log(`[scanner] done — ${alertsSent} alert(s) sent at ${now.toISOString()}`)

  return new Response(
    JSON.stringify({ scanned: prefsList.length, alerts_sent: alertsSent }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeEmoji(grade: string): string {
  const map: Record<string, string> = { 'A+': '🟢', 'B+': '🔵', 'C+': '🟡' }
  return map[grade] ?? '⚪'
}
