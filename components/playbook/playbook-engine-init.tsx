'use client'

// components/playbook/playbook-engine-init.tsx
// Lifecycle-only component — renders nothing visible.
//
// Handles three responsibilities on playbook page mount:
//   1. Load the playbook's checklist into the discipline engine store
//   2. Register preferred pairs with the market engine + start the 2.5s tick
//   3. Log usage events:
//        - 'checklist_open' once on mount
//        - 'time_spent' (300s) every 5 minutes while the page is open
//
// On unmount: stops the market engine interval.
//
// Called only for Pro users — free users bypass the discipline engine entirely.

import { useEffect } from 'react'
import { useMarketStore } from '@/stores/market-store'
import { useChecklistStore } from '@/stores/checklist-store'
import type { ChecklistItem } from '@/lib/supabase/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaybookEngineInitProps {
  playbookId:     string
  checklist:      ChecklistItem[]
  preferredPairs: string[]
}

// ─── PlaybookEngineInit ───────────────────────────────────────────────────────

export function PlaybookEngineInit({
  playbookId,
  checklist,
  preferredPairs,
}: PlaybookEngineInitProps) {
  // ── Store actions ──────────────────────────────────────────────────────────
  const loadChecklist = useChecklistStore(s => s.loadChecklist)
  const addPair       = useMarketStore(s => s.addPair)
  const startEngine   = useMarketStore(s => s.startEngine)
  const stopEngine    = useMarketStore(s => s.stopEngine)

  // ── 1. Load checklist into discipline engine ───────────────────────────────
  // Runs when the playbook changes (navigating between mentor pages).
  useEffect(() => {
    loadChecklist(checklist, playbookId)
  // loadChecklist is a stable Zustand action; playbookId is the dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookId])

  // ── 2. Register pairs + start market engine ────────────────────────────────
  // startEngine() is idempotent — safe to call if scanner already started it.
  // stopEngine() on unmount: clears the interval. If the user navigates to the
  // scanner next, its useEffect will restart the engine.
  const pairsKey = preferredPairs.join(',')
  useEffect(() => {
    for (const pair of preferredPairs) {
      addPair(pair)
    }
    startEngine()
    return () => {
      stopEngine()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey])

  // ── 3a. Log checklist_open on mount ───────────────────────────────────────
  // Fire-and-forget — failures are silently swallowed (non-critical telemetry).
  useEffect(() => {
    void fetch(`/api/playbooks/${playbookId}/usage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ event_type: 'checklist_open' }),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookId])

  // ── 3b. Log time_spent every 5 minutes ────────────────────────────────────
  // Interval starts counting from mount (not from the first checklist_open).
  // Cleaned up on unmount so we don't double-count if the page re-mounts.
  useEffect(() => {
    const id = setInterval(() => {
      void fetch(`/api/playbooks/${playbookId}/usage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ event_type: 'time_spent', duration_seconds: 300 }),
      })
    }, 300_000) // 5 minutes

    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookId])

  // No UI — purely side-effects
  return null
}
