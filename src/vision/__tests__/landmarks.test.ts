import { describe, expect, it } from 'vitest'
import {
  LM,
  LOW_CONFIDENCE_FRAME_THRESHOLD,
  MIN_VISIBILITY,
} from '../landmarks.ts'

describe('LM landmark indices', () => {
  it('LEFT_HIP and RIGHT_HIP are different', () => {
    expect(LM.LEFT_HIP).not.toBe(LM.RIGHT_HIP)
  })

  it('LEFT_KNEE and RIGHT_KNEE are different', () => {
    expect(LM.LEFT_KNEE).not.toBe(LM.RIGHT_KNEE)
  })

  it('all required lower-limb indices are within 0–32', () => {
    const lowerLimb = [
      LM.LEFT_HIP, LM.RIGHT_HIP,
      LM.LEFT_KNEE, LM.RIGHT_KNEE,
      LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    ]
    lowerLimb.forEach((idx) => {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThanOrEqual(32)
    })
  })

  it('all landmark indices are unique', () => {
    const vals = Object.values(LM)
    expect(new Set(vals).size).toBe(vals.length)
  })
})

describe('thresholds', () => {
  it('MIN_VISIBILITY is between 0 and 1', () => {
    expect(MIN_VISIBILITY).toBeGreaterThan(0)
    expect(MIN_VISIBILITY).toBeLessThan(1)
  })

  it('LOW_CONFIDENCE_FRAME_THRESHOLD is a positive integer', () => {
    expect(LOW_CONFIDENCE_FRAME_THRESHOLD).toBeGreaterThan(0)
    expect(Number.isInteger(LOW_CONFIDENCE_FRAME_THRESHOLD)).toBe(true)
  })
})
