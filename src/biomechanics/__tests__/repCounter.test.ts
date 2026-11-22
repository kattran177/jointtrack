import { describe, expect, it } from 'vitest'
import {
  SitToStandCounter,
  computeHipKneeRatio,
} from '../repCounter.ts'

// ---------------------------------------------------------------------------
// SitToStandCounter — state machine
// ---------------------------------------------------------------------------
describe('SitToStandCounter', () => {
  /**
   * Helper: simulate a single sit→stand→sit cycle by feeding a ramp
   * of ratio values through the counter.
   */
  function simulateCycle(
    counter: SitToStandCounter,
    startTime: number,
  ): number {
    // Ramp up: 0.0 → 0.8 (rising from chair)
    for (let r = 0; r <= 80; r += 5) {
      counter.update({ ratio: r / 100, elapsedSeconds: startTime + r / 100 })
    }
    // Ramp down: 0.8 → 0.0 (sitting back down)
    for (let r = 80; r >= 0; r -= 5) {
      counter.update({ ratio: r / 100, elapsedSeconds: startTime + 1 + r / 100 })
    }
    return startTime + 2
  }

  it('starts with 0 reps in sitting phase', () => {
    const c = new SitToStandCounter()
    expect(c.snapshot().reps).toBe(0)
    expect(c.snapshot().phase).toBe('sitting')
  })

  it('counts 1 rep after a complete sit→stand→sit cycle', () => {
    const c = new SitToStandCounter()
    simulateCycle(c, 0)
    expect(c.snapshot().reps).toBe(1)
  })

  it('counts 5 reps and records completedAt', () => {
    const c = new SitToStandCounter()
    let t = 0
    for (let i = 0; i < 5; i++) {
      t = simulateCycle(c, t)
    }
    const result = c.snapshot()
    expect(result.reps).toBe(5)
    expect(result.completedAt).not.toBeNull()
    expect(result.completedAt!).toBeGreaterThan(0)
  })

  it('does not double-count completedAt after 5 reps', () => {
    const c = new SitToStandCounter()
    let t = 0
    for (let i = 0; i < 7; i++) {
      t = simulateCycle(c, t)
    }
    // completedAt should be the time of the 5th rep, not the 7th
    expect(c.snapshot().completedAt!).toBeLessThan(t - 3)
  })

  it('resets correctly', () => {
    const c = new SitToStandCounter()
    simulateCycle(c, 0)
    c.reset()
    const result = c.snapshot()
    expect(result.reps).toBe(0)
    expect(result.phase).toBe('sitting')
    expect(result.completedAt).toBeNull()
  })

  it('ignores a partial rise that does not reach standThreshold', () => {
    const c = new SitToStandCounter()
    // Rise only to 0.4 (below standThreshold 0.65), then drop back
    for (let r = 0; r <= 40; r += 5) {
      c.update({ ratio: r / 100, elapsedSeconds: r / 10 })
    }
    for (let r = 40; r >= 0; r -= 5) {
      c.update({ ratio: r / 100, elapsedSeconds: 1 + r / 10 })
    }
    expect(c.snapshot().reps).toBe(0)
  })

  it('respects custom targetReps configuration', () => {
    const c = new SitToStandCounter({ targetReps: 3 })
    let t = 0
    for (let i = 0; i < 3; i++) {
      t = simulateCycle(c, t)
    }
    expect(c.snapshot().reps).toBe(3)
    expect(c.snapshot().completedAt).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// computeHipKneeRatio
// ---------------------------------------------------------------------------
describe('computeHipKneeRatio', () => {
  it('returns ~0 when hips and knees are at the same height (seated)', () => {
    // In MediaPipe coords: same y value → hips and knees at equal height
    const result = computeHipKneeRatio({
      leftHipY: 0.5,
      rightHipY: 0.5,
      leftKneeY: 0.5,
      rightKneeY: 0.5,
    })
    expect(result).toBeCloseTo(0, 5)
  })

  it('returns a positive ratio when hips are above knees (standing)', () => {
    // Standing: hipY < kneeY (y increases downward)
    const result = computeHipKneeRatio({
      leftHipY: 0.3,
      rightHipY: 0.3,
      leftKneeY: 0.7,
      rightKneeY: 0.7,
    })
    // ratio = (0.7 - 0.3) / 0.7 ≈ 0.571
    expect(result).toBeCloseTo(0.571, 2)
  })

  it('returns 0 when kneeY is 0 (degenerate frame)', () => {
    const result = computeHipKneeRatio({
      leftHipY: 0,
      rightHipY: 0,
      leftKneeY: 0,
      rightKneeY: 0,
    })
    expect(result).toBe(0)
  })

  it('averages bilateral values', () => {
    // Asymmetric: left knee slightly higher than right
    const result = computeHipKneeRatio({
      leftHipY: 0.3,
      rightHipY: 0.3,
      leftKneeY: 0.65,
      rightKneeY: 0.75,
    })
    // kneeAvg = 0.70, hipAvg = 0.30 → ratio = 0.4 / 0.7 ≈ 0.571
    expect(result).toBeCloseTo(0.571, 2)
  })
})
