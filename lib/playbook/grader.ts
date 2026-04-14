// lib/playbook/grader.ts
// Weighted setup grade calculator — the psychology gate number.
//
// Scoring:
//   Each checklist item has a `weight` (integer ≥ 1).
//   "Checked" for auto items  = evaluator returned true
//   "Checked" for manual items = trader manually toggled true
//   score = Σ(checkedWeight) / Σ(totalWeight)  → 0.0 – 1.0
//
// Grade thresholds (from CLAUDE.md spec):
//   A+  score ≥ 0.85  — all key criteria met, take the trade
//   B+  score ≥ 0.70  — conditions met, minor items missing
//   C+  score ≥ 0.50  — borderline, your call
//   D+  score <  0.50  — below threshold, wait
//
// Note: setup-grade.tsx uses its own scoreToGrade() thresholds (90/75/60).
// The grader is the authoritative source for the discipline engine.
// setup-grade.tsx will be updated to import GRADE_THRESHOLDS in Sprint 4.

import { evaluateChecklistItem } from './evaluator'
import type { ChecklistItem } from '@/lib/supabase/types'
import type { MarketAnalysis } from '@/lib/market/engine'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Grade = 'A+' | 'B+' | 'C+' | 'D+'

export interface GradeResult {
  /** Letter grade */
  grade: Grade
  /** 0.0 – 1.0 fraction */
  score: number
  /** 0 – 100 integer for display */
  percentage: number
  /** Number of items contributing to the score */
  checkedCount: number
  /** Total items in the checklist */
  totalCount: number
  /** Weighted points earned */
  checkedWeight: number
  /** Maximum possible weighted points */
  totalWeight: number
  /** Items that are not yet satisfied — for the "what's missing" display */
  missingItems: MissingItem[]
}

export interface MissingItem {
  id:       string
  item:     string
  category: string
  weight:   number
  /** Whether this is an auto item (unmet by market) or manual (not yet ticked) */
  reason:   'auto_unmet' | 'manual_unchecked'
}

// ─── Grade thresholds ─────────────────────────────────────────────────────────

export const GRADE_THRESHOLDS = {
  A_PLUS: 0.85,
  B_PLUS: 0.70,
  C_PLUS: 0.50,
} as const

export function scoreToGrade(score: number): Grade {
  if (score >= GRADE_THRESHOLDS.A_PLUS) return 'A+'
  if (score >= GRADE_THRESHOLDS.B_PLUS) return 'B+'
  if (score >= GRADE_THRESHOLDS.C_PLUS) return 'C+'
  return 'D+'
}

// ─── calculateGrade ───────────────────────────────────────────────────────────

/**
 * Calculate the weighted setup grade.
 *
 * @param checklist   The playbook's checklist items (from ChecklistItem[])
 * @param analysis    Current MarketAnalysis from market-store
 * @param manualState Map of itemId → boolean for trader-toggled manual items
 */
export function calculateGrade(
  checklist:   ChecklistItem[],
  analysis:    MarketAnalysis,
  manualState: Record<string, boolean>,
): GradeResult {
  if (checklist.length === 0) {
    return {
      grade: 'D+', score: 0, percentage: 0,
      checkedCount: 0, totalCount: 0,
      checkedWeight: 0, totalWeight: 0,
      missingItems: [],
    }
  }

  let totalWeight   = 0
  let checkedWeight = 0
  let checkedCount  = 0
  const missingItems: MissingItem[] = []

  for (const item of checklist) {
    totalWeight += item.weight

    // Determine whether this item is "checked"
    let isChecked: boolean

    if (item.auto && item.evalKey) {
      // Auto item — evaluated against live market data
      const result = evaluateChecklistItem(item.evalKey, analysis)
      isChecked = result === true
    } else {
      // Manual item — trader's toggle
      isChecked = manualState[item.id] === true
    }

    if (isChecked) {
      checkedWeight += item.weight
      checkedCount++
    } else {
      missingItems.push({
        id:       item.id,
        item:     item.item,
        category: item.category,
        weight:   item.weight,
        reason:   item.auto && item.evalKey ? 'auto_unmet' : 'manual_unchecked',
      })
    }
  }

  const score       = totalWeight > 0 ? checkedWeight / totalWeight : 0
  const grade       = scoreToGrade(score)
  const percentage  = Math.round(score * 100)

  return {
    grade,
    score,
    percentage,
    checkedCount,
    totalCount: checklist.length,
    checkedWeight,
    totalWeight,
    missingItems,
  }
}

// ─── Minimum execution grade ─────────────────────────────────────────────────

/**
 * The minimum grade at which trade execution is permitted.
 * Below this → execute button locked.
 * Default: C+ (configurable per-trader in future sprint).
 */
export const MIN_EXECUTION_GRADE: Grade = 'C+'

export function canExecuteTrade(grade: Grade): boolean {
  const order: Grade[] = ['D+', 'C+', 'B+', 'A+']
  return order.indexOf(grade) >= order.indexOf(MIN_EXECUTION_GRADE)
}
