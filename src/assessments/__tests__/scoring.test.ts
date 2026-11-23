import { describe, expect, it } from 'vitest'
import { OHS_QUESTIONS } from '../oxford-hip-score.ts'
import { OKS_QUESTIONS } from '../oxford-knee-score.ts'
import {
  bandLabel,
  baselineToLatestDelta,
  buildResult,
  calculateTotalScore,
  computeDelta,
  deltaDescription,
  isComplete,
  isValidScore,
  scoreToBand,
  unansweredQuestions,
} from '../scoring.ts'
import type { QuestionResponse, QuestionnaireResult } from '../types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build 12 responses all with the same score value */
function uniformResponses(score: number): QuestionResponse[] {
  return Array.from({ length: 12 }, (_, i) => ({
    questionId: i + 1,
    selectedScore: score,
  }))
}

function makeResult(
  instrument: 'OKS' | 'OHS',
  score: number,
  completedAt = '2024-01-01T10:00:00.000Z',
): QuestionnaireResult {
  return {
    instrument,
    side: 'left',
    responses: uniformResponses(score / 12), // approximate — just for delta tests
    totalScore: score,
    completedAt,
  }
}

// ---------------------------------------------------------------------------
// calculateTotalScore
// ---------------------------------------------------------------------------
describe('calculateTotalScore', () => {
  it('returns 0 when all 12 responses score 0', () => {
    expect(calculateTotalScore(uniformResponses(0))).toBe(0)
  })

  it('returns 48 when all 12 responses score 4', () => {
    expect(calculateTotalScore(uniformResponses(4))).toBe(48)
  })

  it('returns null when any response is null', () => {
    const responses = uniformResponses(3)
    responses[5].selectedScore = null
    expect(calculateTotalScore(responses)).toBeNull()
  })

  it('sums heterogeneous scores correctly', () => {
    const responses: QuestionResponse[] = [
      { questionId: 1,  selectedScore: 4 },
      { questionId: 2,  selectedScore: 3 },
      { questionId: 3,  selectedScore: 2 },
      { questionId: 4,  selectedScore: 1 },
      { questionId: 5,  selectedScore: 0 },
      { questionId: 6,  selectedScore: 4 },
      { questionId: 7,  selectedScore: 3 },
      { questionId: 8,  selectedScore: 2 },
      { questionId: 9,  selectedScore: 1 },
      { questionId: 10, selectedScore: 0 },
      { questionId: 11, selectedScore: 4 },
      { questionId: 12, selectedScore: 3 },
    ]
    // 4+3+2+1+0+4+3+2+1+0+4+3 = 27
    expect(calculateTotalScore(responses)).toBe(27)
  })
})

// ---------------------------------------------------------------------------
// scoreToBand
// ---------------------------------------------------------------------------
describe('scoreToBand', () => {
  it('maps 0 → severe', () => expect(scoreToBand(0)).toBe('severe'))
  it('maps 19 → severe', () => expect(scoreToBand(19)).toBe('severe'))
  it('maps 20 → moderate', () => expect(scoreToBand(20)).toBe('moderate'))
  it('maps 29 → moderate', () => expect(scoreToBand(29)).toBe('moderate'))
  it('maps 30 → mild', () => expect(scoreToBand(30)).toBe('mild'))
  it('maps 39 → mild', () => expect(scoreToBand(39)).toBe('mild'))
  it('maps 40 → satisfactory', () => expect(scoreToBand(40)).toBe('satisfactory'))
  it('maps 48 → satisfactory', () => expect(scoreToBand(48)).toBe('satisfactory'))
  it('returns null for score -1', () => expect(scoreToBand(-1)).toBeNull())
  it('returns null for score 49', () => expect(scoreToBand(49)).toBeNull())
})

describe('bandLabel', () => {
  it('returns non-empty string for every band', () => {
    const bands = ['severe', 'moderate', 'mild', 'satisfactory'] as const
    bands.forEach((b) => expect(bandLabel(b).length).toBeGreaterThan(0))
  })
})

// ---------------------------------------------------------------------------
// computeDelta
// ---------------------------------------------------------------------------
describe('computeDelta', () => {
  it('returns positive delta for improvement', () => {
    const result = computeDelta(makeResult('OKS', 20), makeResult('OKS', 28))
    expect(result?.delta).toBe(8)
    expect(result?.isClinicallyMeaningful).toBe(true) // ≥ 5
  })

  it('returns negative delta for deterioration', () => {
    const result = computeDelta(makeResult('OKS', 35), makeResult('OKS', 29))
    expect(result?.delta).toBe(-6)
    expect(result?.isClinicallyMeaningful).toBe(true)
  })

  it('flags delta of 4 as NOT clinically meaningful (below MCID=5)', () => {
    const result = computeDelta(makeResult('OKS', 20), makeResult('OKS', 24))
    expect(result?.isClinicallyMeaningful).toBe(false)
  })

  it('flags delta of exactly 5 as clinically meaningful', () => {
    const result = computeDelta(makeResult('OKS', 20), makeResult('OKS', 25))
    expect(result?.isClinicallyMeaningful).toBe(true)
  })

  it('returns null when previous score is null', () => {
    const prev = makeResult('OKS', 0)
    prev.totalScore = null
    const curr = makeResult('OKS', 25)
    expect(computeDelta(prev, curr)).toBeNull()
  })

  it('returns null when current score is null', () => {
    const prev = makeResult('OKS', 25)
    const curr = makeResult('OKS', 0)
    curr.totalScore = null
    expect(computeDelta(prev, curr)).toBeNull()
  })

  it('handles OHS instrument and uses OHS MCID', () => {
    const result = computeDelta(makeResult('OHS', 25), makeResult('OHS', 30))
    expect(result?.delta).toBe(5)
    expect(result?.isClinicallyMeaningful).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// deltaDescription
// ---------------------------------------------------------------------------
describe('deltaDescription', () => {
  it('describes no change', () => {
    const d = computeDelta(makeResult('OKS', 25), makeResult('OKS', 25))!
    expect(deltaDescription(d)).toMatch(/no change/i)
  })

  it('describes an improvement', () => {
    const d = computeDelta(makeResult('OKS', 20), makeResult('OKS', 32))!
    expect(deltaDescription(d)).toMatch(/improvement/i)
  })

  it('describes a deterioration', () => {
    const d = computeDelta(makeResult('OKS', 32), makeResult('OKS', 20))!
    expect(deltaDescription(d)).toMatch(/deterioration/i)
  })

  it('includes "clinically meaningful" for large changes', () => {
    const d = computeDelta(makeResult('OKS', 20), makeResult('OKS', 30))!
    expect(deltaDescription(d)).toMatch(/clinically meaningful/i)
  })
})

// ---------------------------------------------------------------------------
// baselineToLatestDelta
// ---------------------------------------------------------------------------
describe('baselineToLatestDelta', () => {
  it('returns null for fewer than 2 results', () => {
    expect(baselineToLatestDelta([makeResult('OKS', 25)])).toBeNull()
    expect(baselineToLatestDelta([])).toBeNull()
  })

  it('compares first to last result', () => {
    const results = [
      makeResult('OKS', 20, '2024-01-01T10:00:00Z'),
      makeResult('OKS', 25, '2024-02-01T10:00:00Z'),
      makeResult('OKS', 32, '2024-03-01T10:00:00Z'),
    ]
    const delta = baselineToLatestDelta(results)
    expect(delta?.previous).toBe(20)
    expect(delta?.current).toBe(32)
    expect(delta?.delta).toBe(12)
  })

  it('skips null-score results', () => {
    const results = [
      makeResult('OKS', 20),
      { ...makeResult('OKS', 0), totalScore: null }, // incomplete
      makeResult('OKS', 30),
    ]
    const delta = baselineToLatestDelta(results)
    expect(delta?.previous).toBe(20)
    expect(delta?.current).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// isComplete / unansweredQuestions / isValidScore
// ---------------------------------------------------------------------------
describe('isComplete', () => {
  it('returns true for 12 non-null responses', () => {
    expect(isComplete(uniformResponses(3))).toBe(true)
  })

  it('returns false when any response is null', () => {
    const r = uniformResponses(3)
    r[11].selectedScore = null
    expect(isComplete(r)).toBe(false)
  })

  it('returns false when fewer than 12 responses', () => {
    expect(isComplete(uniformResponses(2).slice(0, 10))).toBe(false)
  })
})

describe('unansweredQuestions', () => {
  it('returns empty array when all answered', () => {
    expect(unansweredQuestions(uniformResponses(2))).toEqual([])
  })

  it('returns IDs of unanswered questions', () => {
    const r = uniformResponses(2)
    r[0].selectedScore = null  // question 1
    r[6].selectedScore = null  // question 7
    expect(unansweredQuestions(r)).toEqual([1, 7])
  })
})

describe('isValidScore', () => {
  it('accepts null (unanswered)', () => expect(isValidScore(null)).toBe(true))
  it('accepts 0', () => expect(isValidScore(0)).toBe(true))
  it('accepts 4', () => expect(isValidScore(4)).toBe(true))
  it('rejects -1', () => expect(isValidScore(-1)).toBe(false))
  it('rejects 5', () => expect(isValidScore(5)).toBe(false))
  it('rejects 2.5 (non-integer)', () => expect(isValidScore(2.5)).toBe(false))
})

// ---------------------------------------------------------------------------
// buildResult
// ---------------------------------------------------------------------------
describe('buildResult', () => {
  it('builds a complete OKS result', () => {
    const r = buildResult('OKS', 'right', uniformResponses(3))
    expect(r.instrument).toBe('OKS')
    expect(r.side).toBe('right')
    expect(r.totalScore).toBe(36)
    expect(r.completedAt).toBeTruthy()
  })

  it('builds an incomplete OHS result with null score', () => {
    const responses = uniformResponses(2)
    responses[3].selectedScore = null
    const r = buildResult('OHS', 'left', responses)
    expect(r.totalScore).toBeNull()
  })

  it('stores the optional note', () => {
    const r = buildResult('OKS', 'left', uniformResponses(2), 'Post-physio session')
    expect(r.note).toBe('Post-physio session')
  })
})

// ---------------------------------------------------------------------------
// Question definition sanity checks (OKS + OHS)
// ---------------------------------------------------------------------------
describe('OKS question definitions', () => {
  it('has exactly 12 questions', () => {
    expect(OKS_QUESTIONS.length).toBe(12)
  })

  it('every question has 5 options', () => {
    OKS_QUESTIONS.forEach((q) => expect(q.options.length).toBe(5))
  })

  it('every question has options scored 0–4 in order', () => {
    OKS_QUESTIONS.forEach((q) => {
      q.options.forEach((opt, i) => expect(opt.score).toBe(i))
    })
  })

  it('question IDs are 1–12', () => {
    OKS_QUESTIONS.forEach((q, i) => expect(q.id).toBe(i + 1))
  })
})

describe('OHS question definitions', () => {
  it('has exactly 12 questions', () => {
    expect(OHS_QUESTIONS.length).toBe(12)
  })

  it('every question has 5 options', () => {
    OHS_QUESTIONS.forEach((q) => expect(q.options.length).toBe(5))
  })

  it('every question has options scored 0–4 in order', () => {
    OHS_QUESTIONS.forEach((q) => {
      q.options.forEach((opt, i) => expect(opt.score).toBe(i))
    })
  })
})
