/**
 * Oxford Knee Score (OKS) — question definitions and scoring.
 *
 * The OKS is a 12-item patient-reported outcome measure developed at the
 * University of Oxford to assess the outcome of knee replacement surgery.
 * It has since been widely adopted as a pre-operative baseline measure and
 * waiting-list monitoring tool.
 *
 * Instrument reference
 * --------------------
 * Dawson J, Fitzpatrick R, Murray D, Carr A. "Questionnaire on the
 * perceptions of patients about total knee replacement." J Bone Joint Surg Br.
 * 1998 Jan;80(1):63–9. PMID: 9460955.
 *
 * Scoring convention
 * ------------------
 * Each question has 5 options scored 0–4 (0 = worst, 4 = best).
 * Total score = sum of all 12 responses → range 0–48.
 * Higher scores indicate better function.
 *
 * Severity bands (standard clinical interpretation):
 *   40–48  Satisfactory joint function
 *   30–39  Mild difficulty
 *   20–29  Moderate difficulty
 *    0–19  Severe difficulty
 *
 * Minimal Clinically Important Difference (MCID): 5 points
 * Reference: Beard DJ et al. J Bone Joint Surg Br. 2015.
 *
 * Usage in JointTrack
 * -------------------
 * JointTrack uses the OKS as a longitudinal tracking tool, not a diagnostic
 * criterion. Score trends are presented neutrally to support clinician review.
 */

import type { QuestionDefinition } from './types.ts'

export const OKS_QUESTIONS: QuestionDefinition[] = [
  {
    id: 1,
    text: 'During the past 4 weeks, how would you describe the pain you usually have from your knee?',
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
    text: 'During the past 4 weeks, have you had any trouble with washing and drying yourself (all over) because of your knee?',
    options: [
      { label: 'Impossible to do',                                    score: 0 },
      { label: 'Very difficult to do',                                score: 1 },
      { label: 'Moderate difficulty',                                 score: 2 },
      { label: 'A little difficulty',                                 score: 3 },
      { label: 'No trouble at all',                                   score: 4 },
    ],
  },
  {
    id: 3,
    text: 'During the past 4 weeks, have you had any trouble getting in and out of a car or using public transport because of your knee? (whichever you tend to use)',
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
    text: 'During the past 4 weeks, for how long have you been able to walk before pain from your knee becomes severe? (with or without a walking stick)',
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
    text: 'During the past 4 weeks, after a meal (sat at a table), how painful has it been for you to stand up from a chair because of your knee?',
    options: [
      { label: 'Unbearable',                                                score: 0 },
      { label: 'Very painful',                                              score: 1 },
      { label: 'Moderately painful',                                        score: 2 },
      { label: 'Slightly painful',                                          score: 3 },
      { label: 'Not at all painful',                                        score: 4 },
    ],
  },
  {
    id: 6,
    text: 'During the past 4 weeks, have you been limping when walking, because of your knee?',
    options: [
      { label: 'All of the time',         score: 0 },
      { label: 'Most of the time',        score: 1 },
      { label: 'Often, not just at first', score: 2 },
      { label: 'Sometimes, or just at first', score: 3 },
      { label: 'Rarely / never',          score: 4 },
    ],
  },
  {
    id: 7,
    text: 'During the past 4 weeks, could you kneel down and get back up afterwards?',
    options: [
      { label: 'No, impossible',              score: 0 },
      { label: 'Very difficult',              score: 1 },
      { label: 'Moderately difficult',        score: 2 },
      { label: 'With a little difficulty',    score: 3 },
      { label: 'Yes, easily',                 score: 4 },
    ],
  },
  {
    id: 8,
    text: 'During the past 4 weeks, have you been troubled by pain from your knee in bed at night?',
    options: [
      { label: 'Every night',                 score: 0 },
      { label: 'Most nights',                 score: 1 },
      { label: 'Sometimes',                   score: 2 },
      { label: 'Only 1 or 2 nights',          score: 3 },
      { label: 'No nights',                   score: 4 },
    ],
  },
  {
    id: 9,
    text: 'During the past 4 weeks, how much has pain from your knee interfered with your usual work? (including housework)',
    options: [
      { label: 'Totally',                     score: 0 },
      { label: 'Greatly',                     score: 1 },
      { label: 'Moderately',                  score: 2 },
      { label: 'A little bit',                score: 3 },
      { label: 'Not at all',                  score: 4 },
    ],
  },
  {
    id: 10,
    text: 'During the past 4 weeks, have you felt that your knee might suddenly "give way" or let you down?',
    options: [
      { label: 'All of the time',         score: 0 },
      { label: 'Most of the time',        score: 1 },
      { label: 'Sometimes',               score: 2 },
      { label: 'Rarely',                  score: 3 },
      { label: 'Never / no',              score: 4 },
    ],
  },
  {
    id: 11,
    text: 'Could you do the household shopping on your own?',
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

/** MCID for the Oxford Knee Score (5 points). */
export const OKS_MCID = 5
