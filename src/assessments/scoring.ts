/**
 * Scoring logic for Oxford Knee Score (OKS) and Oxford Hip Score (OHS).
 *
 * All functions are pure — no side effects, no browser APIs — so they are
 * directly unit-testable and safe to call from any context (UI, storage
 * layer, FHIR builder, PDF report).
 *
 * Clinical framing reminder
 * -------------------------
 * Scores are presented to users as objective, self-reported measurements.
 * JointTrack never infers a diagnosis from a score or score change. The
 * severity bands and MCID flags are informational labels to support a
 * conversation with a clinician, not clinical decision outputs.
 */

import { OHS_MCID } from './oxford-hip-score.ts'
import { OKS_MCID } from './oxford-knee-score.ts'
import type {
  QuestionnaireResult,
  QuestionResponse,
  ScoreDelta,
  SeverityBand,
} from './types.ts'

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

/**
 * Sum all response scores for a completed questionnaire.
 *
 * Returns `null` if any of the 12 questions is unanswered (selectedScore
 * is null), because a partial score is not a valid Oxford score and should
 * not be stored or displayed as such.
 *
 * @param responses  Array of 12 QuestionResponse objects
 * @returns          Total score 0–48, or null if incomplete
 */
export function calculateTotalScore(
  responses: QuestionResponse[],
): number | null {
  for (const r of responses) {
    if (r.selectedScore === null) return null
  }
  return responses.reduce((sum, r) => sum + (r.selectedScore ?? 0), 0)
}

/**
 * Convenience wrapper: build a QuestionnaireResult from raw response data.
 *
 * The `completedAt` timestamp defaults to the current time (ISO-8601 string)
 * so callers don't need to manage it separately.
 */
export function buildResult(
  instrument: 'OKS' | 'OHS',
  side: 'left' | 'right',
  responses: QuestionResponse[],
  note?: string,
): QuestionnaireResult {
  return {
    instrument,
    side,
    responses,
    totalScore: calculateTotalScore(responses),
    completedAt: new Date().toISOString(),
    note,
  }
}

// ---------------------------------------------------------------------------
// Severity bands
// ---------------------------------------------------------------------------

/**
 * Map a total Oxford score to a standard severity band.
 *
 * Band boundaries per the Oxford scoring guidance:
 *   40–48 → satisfactory
 *   30–39 → mild
 *   20–29 → moderate
 *    0–19 → severe
 *
 * Returns null for scores outside the valid 0–48 range.
 */
export function scoreToBand(score: number): SeverityBand | null {
  if (score < 0 || score > 48) return null
  if (score >= 40) return 'satisfactory'
  if (score >= 30) return 'mild'
  if (score >= 20) return 'moderate'
  return 'severe'
}

/**
 * Human-readable label for a severity band.
 * Phrased neutrally — describes functional difficulty, not a diagnosis.
 */
export function bandLabel(band: SeverityBand): string {
  const labels: Record<SeverityBand, string> = {
    satisfactory: 'Satisfactory joint function',
    mild:         'Mild difficulty',
    moderate:     'Moderate difficulty',
    severe:       'Severe difficulty',
  }
  return labels[band]
}

// ---------------------------------------------------------------------------
// Score delta and trend
// ---------------------------------------------------------------------------

/**
 * Compute the change in score between two completed questionnaire results.
 *
 * Returns null if either result has a null totalScore (incomplete
 * questionnaire — cannot compute a valid delta).
 *
 * @param previous  Earlier result (baseline or prior session)
 * @param current   More recent result
 */
export function computeDelta(
  previous: QuestionnaireResult,
  current: QuestionnaireResult,
): ScoreDelta | null {
  if (previous.totalScore === null || current.totalScore === null) return null

  const mcid =
    current.instrument === 'OKS' ? OKS_MCID : OHS_MCID

  const delta = current.totalScore - previous.totalScore
  return {
    previous: previous.totalScore,
    current: current.totalScore,
    delta,
    isClinicallyMeaningful: Math.abs(delta) >= mcid,
  }
}

/**
 * Describe the direction of a score change in plain language.
 * Used in the clinician report and trend chart tooltips.
 *
 * "Improvement" and "deterioration" are objective descriptions of score
 * direction, not clinical prognoses.
 */
export function deltaDescription(delta: ScoreDelta): string {
  if (delta.delta === 0) return 'No change since last assessment'
  const direction = delta.delta > 0 ? 'improvement' : 'deterioration'
  const magnitude = delta.isClinicallyMeaningful ? 'clinically meaningful ' : ''
  return `${Math.abs(delta.delta)}-point ${magnitude}${direction}`
}

/**
 * Given an ordered array of results (oldest first), return the delta between
 * the first (baseline) and the most recent result.
 * Returns null if fewer than 2 complete results are present.
 */
export function baselineToLatestDelta(
  results: QuestionnaireResult[],
): ScoreDelta | null {
  const complete = results.filter((r) => r.totalScore !== null)
  if (complete.length < 2) return null
  return computeDelta(complete[0], complete[complete.length - 1])
}

// ---------------------------------------------------------------------------
// Completion / validation helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when all 12 questions have a non-null response.
 */
export function isComplete(responses: QuestionResponse[]): boolean {
  return responses.length === 12 && responses.every((r) => r.selectedScore !== null)
}

/**
 * Returns the question IDs of any unanswered questions.
 * Useful for showing "you have N questions left" in the UI.
 */
export function unansweredQuestions(responses: QuestionResponse[]): number[] {
  return responses
    .filter((r) => r.selectedScore === null)
    .map((r) => r.questionId)
}

/**
 * Validate that a response score is within the valid 0–4 range.
 * Used by the storage layer before persisting data.
 */
export function isValidScore(score: number | null): boolean {
  if (score === null) return true // null = unanswered, structurally valid
  return Number.isInteger(score) && score >= 0 && score <= 4
}
