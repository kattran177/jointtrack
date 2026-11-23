/**
 * Shared types for the assessments module.
 *
 * These are intentionally framework-agnostic so the scoring logic can be
 * unit-tested without any React or browser dependencies.
 */

/** Which joint this assessment targets. */
export type JointSide = 'knee' | 'hip'

/**
 * A single question in a PROM questionnaire.
 *
 * The `options` array is always ordered from worst (index 0, score 0) to
 * best (last index, score 4) for both OKS and OHS, following the standard
 * Oxford scoring convention.
 */
export interface QuestionDefinition {
  /** 1-based question number within the questionnaire */
  id: number
  /** Full question text as published in the validated instrument */
  text: string
  /** Answer options in worst→best order */
  options: AnswerOption[]
}

export interface AnswerOption {
  /** Display label shown to the user */
  label: string
  /** Numeric score for this option (0–4) */
  score: number
}

/**
 * A completed response to one question.
 * `selectedScore` is 0–4; `null` means the question was skipped/unanswered.
 */
export interface QuestionResponse {
  questionId: number
  selectedScore: number | null
}

/**
 * A fully completed (or partially complete) questionnaire submission.
 *
 * `totalScore` is null when any question is unanswered.
 * `completedAt` is an ISO-8601 timestamp string.
 */
export interface QuestionnaireResult {
  instrument: 'OKS' | 'OHS'
  /** Which side was assessed (left/right) */
  side: 'left' | 'right'
  responses: QuestionResponse[]
  /** Sum of all 12 response scores (0–48). Null if any response is missing. */
  totalScore: number | null
  completedAt: string
  /** Free-text session note (optional) */
  note?: string
}

/**
 * Severity band derived from an Oxford score total.
 * Based on the standard clinical interpretation bands.
 */
export type SeverityBand =
  | 'severe'       // 0–19
  | 'moderate'     // 20–29
  | 'mild'         // 30–39
  | 'satisfactory' // 40–48

/**
 * The change in total score between two questionnaire results.
 * Positive = improvement; negative = deterioration.
 */
export interface ScoreDelta {
  previous: number
  current: number
  delta: number
  /** True when the change is ≥ the MCID (Minimal Clinically Important Difference) */
  isClinicallyMeaningful: boolean
}
