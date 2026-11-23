/**
 * Oxford Hip Score (OHS) — question definitions and scoring.
 *
 * The OHS is a 12-item patient-reported outcome measure developed at the
 * University of Oxford to assess the outcome of total hip replacement.
 * Like the OKS, it is widely used pre-operatively and during waiting-list
 * monitoring to document functional baseline and change over time.
 *
 * Instrument reference
 * --------------------
 * Dawson J, Fitzpatrick R, Carr A, Murray D. "Questionnaire on the
 * perceptions of patients about total hip replacement." J Bone Joint Surg Br.
 * 1996 Mar;78(2):185–90. PMID: 8666621.
 *
 * Scoring convention
 * ------------------
 * Identical to the OKS: each of 12 questions scores 0–4 (0 = worst, 4 = best).
 * Total score range 0–48; higher = better function.
 *
 * Severity bands:
 *   40–48  Satisfactory joint function
 *   30–39  Mild difficulty
 *   20–29  Moderate difficulty
 *    0–19  Severe difficulty
 *
 * Minimal Clinically Important Difference (MCID): 5 points
 * Reference: Murray DW et al. J Bone Joint Surg Br. 2007.
 */

import type { QuestionDefinition } from './types.ts'

export const OHS_QUESTIONS: QuestionDefinition[] = [
  {
    id: 1,
    text: 'During the past 4 weeks, how would you describe the pain you usually have from your hip?',
    options: [
      { label: 'Severe',         score: 0 },
      { label: 'Moderate',       score: 1 },
      { label: 'Mild',           score: 2 },
      { label: 'Very mild',      score: 3 },
      { label: 'None',           score: 4 },
    ],
  },
  {
    id: 2,
    text: 'During the past 4 weeks, have you had any trouble with washing and drying yourself (all over) because of your hip?',
    options: [
      { label: 'Impossible to do',       score: 0 },
      { label: 'Very difficult to do',   score: 1 },
      { label: 'Moderate difficulty',    score: 2 },
      { label: 'A little difficulty',    score: 3 },
      { label: 'No trouble at all',      score: 4 },
    ],
  },
  {
    id: 3,
    text: 'During the past 4 weeks, have you had any trouble getting in and out of a car or using public transport because of your hip? (whichever you tend to use)',
    options: [
      { label: 'Impossible to do',       score: 0 },
      { label: 'Very difficult to do',   score: 1 },
      { label: 'Moderate difficulty',    score: 2 },
      { label: 'A little difficulty',    score: 3 },
      { label: 'No trouble at all',      score: 4 },
    ],
  },
  {
    id: 4,
    text: 'During the past 4 weeks, for how long have you been able to walk before pain from your hip becomes severe? (with or without a walking stick)',
    options: [
      { label: 'Not at all — pain is severe on walking',  score: 0 },
      { label: 'Around 15 minutes',                       score: 1 },
      { label: 'Around 30 minutes',                       score: 2 },
      { label: 'Around 1 hour',                           score: 3 },
      { label: 'No pain / more than 1 hour',              score: 4 },
    ],
  },
  {
    id: 5,
    text: 'During the past 4 weeks, after a meal (sat at a table), how painful has it been for you to stand up from a chair because of your hip?',
    options: [
      { label: 'Unbearable',             score: 0 },
      { label: 'Very painful',           score: 1 },
      { label: 'Moderately painful',     score: 2 },
      { label: 'Slightly painful',       score: 3 },
      { label: 'Not at all painful',     score: 4 },
    ],
  },
  {
    id: 6,
    text: 'During the past 4 weeks, have you been limping when walking, because of your hip?',
    options: [
      { label: 'All of the time',              score: 0 },
      { label: 'Most of the time',             score: 1 },
      { label: 'Often, not just at first',      score: 2 },
      { label: 'Sometimes, or just at first',  score: 3 },
      { label: 'Rarely / never',               score: 4 },
    ],
  },
  {
    id: 7,
    text: 'During the past 4 weeks, could you put on a pair of socks, stockings or tights?',
    options: [
      { label: 'No, impossible',              score: 0 },
      { label: 'Very difficult',              score: 1 },
      { label: 'Moderate difficulty',         score: 2 },
      { label: 'A little difficulty',         score: 3 },
      { label: 'Yes, easily',                 score: 4 },
    ],
  },
  {
    id: 8,
    text: 'During the past 4 weeks, have you been troubled by pain from your hip in bed at night?',
    options: [
      { label: 'Every night',          score: 0 },
      { label: 'Most nights',          score: 1 },
      { label: 'Sometimes',            score: 2 },
      { label: 'Only 1 or 2 nights',   score: 3 },
      { label: 'No nights',            score: 4 },
    ],
  },
  {
    id: 9,
    text: 'During the past 4 weeks, how much has pain from your hip interfered with your usual work? (including housework)',
    options: [
      { label: 'Totally',          score: 0 },
      { label: 'Greatly',          score: 1 },
      { label: 'Moderately',       score: 2 },
      { label: 'A little bit',     score: 3 },
      { label: 'Not at all',       score: 4 },
    ],
  },
  {
    id: 10,
    text: 'During the past 4 weeks, have you had any sudden, severe pain — "shooting", "stabbing", or "spasms" — from the affected hip?',
    options: [
      { label: 'Every day',           score: 0 },
      { label: 'Most days',           score: 1 },
      { label: 'Some days',           score: 2 },
      { label: 'Only 1 or 2 days',    score: 3 },
      { label: 'No days',             score: 4 },
    ],
  },
  {
    id: 11,
    text: 'During the past 4 weeks, could you do the household shopping on your own?',
    options: [
      { label: 'No, impossible',              score: 0 },
      { label: 'Very difficult',              score: 1 },
      { label: 'Moderate difficulty',         score: 2 },
      { label: 'A little difficulty',         score: 3 },
      { label: 'Yes, easily',                 score: 4 },
    ],
  },
  {
    id: 12,
    text: 'Could you walk down one flight of stairs?',
    options: [
      { label: 'No, impossible',              score: 0 },
      { label: 'Very difficult',              score: 1 },
      { label: 'Moderate difficulty',         score: 2 },
      { label: 'A little difficulty',         score: 3 },
      { label: 'Yes, easily',                 score: 4 },
    ],
  },
]

/** MCID for the Oxford Hip Score (5 points). */
export const OHS_MCID = 5
