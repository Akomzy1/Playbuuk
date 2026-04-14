// stores/checklist-store.ts
// Discipline engine state — the core of Playbuuk's psychology gate.
//
// Responsibilities:
//   1. Hold the current playbook's checklist items
//   2. Track manual toggle state (trader-controlled items)
//   3. Run auto-evaluation on every market tick (called by components via evaluate())
//   4. Compute and expose the live grade
//
// Data flow:
//   PlaybookPage SSR → loadChecklist(playbook.checklist)
//   market-store tick → component calls evaluate(analysis)
//   grade, autoResults, manualState → live-checklist.tsx renders
//
// Separation of concerns:
//   evaluator.ts — pure evalKey → boolean dispatch
//   grader.ts    — weighted score + grade letter
//   This store   — Zustand state + orchestration
//
// Psychology note:
//   Auto items (item.auto = true) are set ONLY by evaluate().
//   The trader cannot override them — they have no toggle.
//   Manual items ONLY respond to toggleManual().
//   This enforces: "BOS either happened or it didn't."

'use client'

import { create } from 'zustand'
import { evaluateChecklistItem } from '@/lib/playbook/evaluator'
import { calculateGrade, type Grade, type GradeResult, type MissingItem } from '@/lib/playbook/grader'
import type { ChecklistItem } from '@/lib/supabase/types'
import type { MarketAnalysis } from '@/lib/market/engine'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistStore {
  // ── State ──────────────────────────────────────────────────────────────────

  /** The active playbook's checklist. Empty until loadChecklist() is called. */
  checklistItems: ChecklistItem[]

  /** Trader-controlled toggle state. Keys are item.id. */
  manualState: Record<string, boolean>

  /**
   * Auto-evaluation results from the last evaluate() call.
   * Keys are item.id (not evalKey) so the UI can look up by item directly.
   */
  autoResults: Record<string, boolean>

  /** Current grade result — updated on every evaluate() call. */
  gradeResult: GradeResult

  /** Convenience alias for gradeResult.grade */
  currentGrade: Grade

  /** True while auto-evaluation is running (brief — kept for animation sync). */
  evaluating: boolean

  /** ID of the playbook that loaded this checklist. */
  playbookId: string | null

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Initialise the checklist from a playbook.
   * Clears all manual state and auto results.
   * Call this when navigating to a playbook page.
   */
  loadChecklist: (items: ChecklistItem[], playbookId?: string) => void

  /**
   * Toggle a manual item on/off.
   * No-op for auto items (auto = true).
   * Recalculates grade immediately using the last known analysis.
   */
  toggleManual: (itemId: string) => void

  /**
   * Run all auto-evaluations against current MarketAnalysis.
   * Called by the playbook page's useEffect that subscribes to market-store.
   * Updates autoResults + recalculates grade.
   */
  evaluate: (analysis: MarketAnalysis) => void

  /**
   * Reset manual state and auto results for the current checklist.
   * Does NOT clear the checklist items themselves.
   */
  reset: () => void

  // ── Internal ───────────────────────────────────────────────────────────────
  /** Last analysis snapshot — used to recalculate grade after manual toggle. */
  _lastAnalysis: MarketAnalysis | null
}

// ─── Empty grade ──────────────────────────────────────────────────────────────

function emptyGrade(): GradeResult {
  return {
    grade: 'D+', score: 0, percentage: 0,
    checkedCount: 0, totalCount: 0,
    checkedWeight: 0, totalWeight: 0,
    missingItems: [],
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useChecklistStore = create<ChecklistStore>((set, get) => ({
  checklistItems: [],
  manualState:    {},
  autoResults:    {},
  gradeResult:    emptyGrade(),
  currentGrade:   'D+',
  evaluating:     false,
  playbookId:     null,
  _lastAnalysis:  null,

  // ── loadChecklist ──────────────────────────────────────────────────────────
  loadChecklist(items, playbookId) {
    // Pre-initialise manual state: all manual items start unchecked
    const manualState: Record<string, boolean> = {}
    for (const item of items) {
      if (!item.auto) manualState[item.id] = false
    }

    set({
      checklistItems: items,
      manualState,
      autoResults:    {},
      gradeResult:    emptyGrade(),
      currentGrade:   'D+',
      playbookId:     playbookId ?? null,
      _lastAnalysis:  null,
    })
  },

  // ── toggleManual ──────────────────────────────────────────────────────────
  toggleManual(itemId) {
    const { checklistItems, manualState, _lastAnalysis } = get()

    // Guard: only manual items can be toggled
    const item = checklistItems.find(i => i.id === itemId)
    if (!item || item.auto) return

    const nextManualState = {
      ...manualState,
      [itemId]: !manualState[itemId],
    }

    // Recalculate grade with the existing analysis snapshot
    const analysis  = _lastAnalysis
    const gradeResult = analysis
      ? calculateGrade(checklistItems, analysis, nextManualState)
      : emptyGrade()

    set({
      manualState:  nextManualState,
      gradeResult,
      currentGrade: gradeResult.grade,
    })
  },

  // ── evaluate ──────────────────────────────────────────────────────────────
  evaluate(analysis) {
    const { checklistItems, manualState } = get()
    if (checklistItems.length === 0) return

    set({ evaluating: true, _lastAnalysis: analysis })

    // Run auto-evaluation for every item that has an evalKey
    const autoResults: Record<string, boolean> = {}
    for (const item of checklistItems) {
      if (item.auto && item.evalKey) {
        const result = evaluateChecklistItem(item.evalKey, analysis)
        autoResults[item.id] = result === true
      }
    }

    const gradeResult = calculateGrade(checklistItems, analysis, manualState)

    set({
      autoResults,
      gradeResult,
      currentGrade: gradeResult.grade,
      evaluating:   false,
    })
  },

  // ── reset ─────────────────────────────────────────────────────────────────
  reset() {
    const { checklistItems } = get()

    const manualState: Record<string, boolean> = {}
    for (const item of checklistItems) {
      if (!item.auto) manualState[item.id] = false
    }

    set({
      manualState,
      autoResults:   {},
      gradeResult:   emptyGrade(),
      currentGrade:  'D+',
      _lastAnalysis: null,
    })
  },
}))

// ─── Selector helpers ─────────────────────────────────────────────────────────

/**
 * True if the item is currently "checked" — either auto-confirmed or manually ticked.
 * Use this in the UI to determine the visual state of each row.
 */
export function isItemChecked(
  item:        ChecklistItem,
  autoResults: Record<string, boolean>,
  manualState: Record<string, boolean>,
): boolean {
  if (item.auto) return autoResults[item.id] === true
  return manualState[item.id] === true
}

/**
 * Returns missing items sorted by weight descending — highest-impact first.
 * Used by the "what's missing" section below the grade ring.
 */
export function getMissingItemsSorted(missingItems: MissingItem[]): MissingItem[] {
  return [...missingItems].sort((a, b) => b.weight - a.weight)
}
