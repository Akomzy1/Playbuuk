// lib/market/session.ts
// Forex trading session detection based on UTC wall-clock time.
//
// Session hours (UTC):
//   Sydney   21:00 – 06:00  (crosses midnight)
//   Tokyo    00:00 – 09:00
//   London   07:00 – 16:00
//   New York 13:00 – 22:00
//
// Overlap periods are treated as the "dominant" session (London wins over Tokyo;
// New York wins over London during overlap — highest liquidity).
//
// Killzones (highest-probability reversal / manipulation windows):
//   London open   07:00 – 09:00 UTC
//   New York open 13:00 – 15:00 UTC
//
// All times use the fractional-hour system for easy arithmetic:
//   utcHour = new Date().getUTCHours() + new Date().getUTCMinutes() / 60

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionName = 'London' | 'New York' | 'Tokyo' | 'Sydney' | null

export interface SessionInfo {
  /** Name of the currently active session, or null outside major sessions. */
  name:      SessionName
  /** True when any major session is open. */
  active:    boolean
  /** True during London open (07–09) or NY open (13–15) killzones. */
  killzone:  boolean
  /** Fractional UTC hour at time of call. */
  utcHour:   number
}

// ─── Session windows ──────────────────────────────────────────────────────────

interface SessionWindow {
  name:  Exclude<SessionName, null>
  start: number  // fractional UTC hour (inclusive)
  end:   number  // fractional UTC hour (exclusive)
}

// Sydney wraps midnight — handled specially below.
const SESSIONS: SessionWindow[] = [
  { name: 'Tokyo',    start:  0, end:  9 },
  { name: 'London',   start:  7, end: 16 },
  { name: 'New York', start: 13, end: 22 },
]

const KILLZONES: Array<{ start: number; end: number }> = [
  { start:  7, end:  9 },   // London open
  { start: 13, end: 15 },   // New York open
]

// ─── getCurrentSession ────────────────────────────────────────────────────────

/**
 * Returns session information for right now (uses Date.now() internally).
 * Pure — pass `overrideUtcHour` in tests.
 */
export function getCurrentSession(overrideUtcHour?: number): SessionInfo {
  const now       = new Date()
  const utcHour   = overrideUtcHour ?? (now.getUTCHours() + now.getUTCMinutes() / 60)

  // Sydney: 21:00–06:00 (wraps midnight)
  const sydneyActive = utcHour >= 21 || utcHour < 6

  // Priority: New York > London > Tokyo > Sydney
  // (higher liquidity sessions take precedence in overlaps)
  let sessionName: SessionName = null

  if (utcHour >= 13 && utcHour < 22) {
    sessionName = 'New York'
  } else if (utcHour >= 7 && utcHour < 16) {
    sessionName = 'London'
  } else if (utcHour >= 0 && utcHour < 9) {
    sessionName = 'Tokyo'
  } else if (sydneyActive) {
    sessionName = 'Sydney'
  }

  const active   = sessionName !== null
  const killzone = KILLZONES.some(kz => utcHour >= kz.start && utcHour < kz.end)

  return { name: sessionName, active, killzone, utcHour }
}

// ─── isKillzone ───────────────────────────────────────────────────────────────

/**
 * Returns true during London open (07–09 UTC) or NY open (13–15 UTC).
 * Convenience wrapper — prefer `getCurrentSession().killzone` when you need
 * the full session object anyway.
 */
export function isKillzone(overrideUtcHour?: number): boolean {
  return getCurrentSession(overrideUtcHour).killzone
}

// ─── All active sessions ──────────────────────────────────────────────────────

/**
 * Returns ALL sessions currently open (there can be 2 during overlaps).
 * Useful for display purposes — the scanner may show "London + NY overlap".
 */
export function getActiveSessions(overrideUtcHour?: number): Exclude<SessionName, null>[] {
  const now     = new Date()
  const utcHour = overrideUtcHour ?? (now.getUTCHours() + now.getUTCMinutes() / 60)

  const active: Exclude<SessionName, null>[] = []

  if (utcHour >= 21 || utcHour < 6) active.push('Sydney')

  for (const s of SESSIONS) {
    if (utcHour >= s.start && utcHour < s.end) active.push(s.name)
  }

  return active
}
