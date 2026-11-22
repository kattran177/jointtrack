import { describe, expect, it } from 'vitest'
import {
  computeKneeAngle,
  hipAbductionAngleFrontal,
  kneeFlexionAngle,
  pelvicDropAngle,
} from '../angles.ts'

// ---------------------------------------------------------------------------
// Knee Flexion
// ---------------------------------------------------------------------------
describe('kneeFlexionAngle', () => {
  it('returns ~0° for a fully extended knee', () => {
    // Collinear: hip above knee above ankle → raw 180° → flexion 0°
    const hip = { x: 0, y: -1, z: 0 }
    const knee = { x: 0, y: 0, z: 0 }
    const ankle = { x: 0, y: 1, z: 0 }
    expect(kneeFlexionAngle(hip, knee, ankle)).toBeCloseTo(0, 1)
  })

  it('returns ~90° for a right-angle bend', () => {
    // hip directly above knee, ankle directly ahead of knee
    const hip = { x: 0, y: -1, z: 0 }
    const knee = { x: 0, y: 0, z: 0 }
    const ankle = { x: 1, y: 0, z: 0 }
    // raw angleBetween = 90° → flexion = 180 - 90 = 90°
    expect(kneeFlexionAngle(hip, knee, ankle)).toBeCloseTo(90, 1)
  })

  it('clamps values above 160° to 160°', () => {
    // Artificially extreme geometry
    const hip = { x: 0, y: -1, z: 0 }
    const knee = { x: 0, y: 0, z: 0 }
    const ankle = { x: 0, y: -0.01, z: 0 } // ankle almost on top of hip
    // This produces an extremely small raw angle → flexion near 180° → clamped 160
    const result = kneeFlexionAngle(hip, knee, ankle)
    expect(result).toBeLessThanOrEqual(160)
  })
})

describe('computeKneeAngle', () => {
  it('marks physiologically plausible angles as plausible', () => {
    const hip = { x: 0, y: -1, z: 0 }
    const knee = { x: 0, y: 0, z: 0 }
    const ankle = { x: 0, y: 1, z: 0 }
    const result = computeKneeAngle(hip, knee, ankle, 'left')
    expect(result.isPlausible).toBe(true)
    expect(result.side).toBe('left')
  })

  it('includes rawAngleDeg in output', () => {
    const hip = { x: 0, y: -1, z: 0 }
    const knee = { x: 0, y: 0, z: 0 }
    const ankle = { x: 0, y: 1, z: 0 }
    const result = computeKneeAngle(hip, knee, ankle, 'right')
    expect(result.rawAngleDeg).toBeCloseTo(180, 1)
  })
})

// ---------------------------------------------------------------------------
// Hip Abduction (frontal plane)
// ---------------------------------------------------------------------------
describe('hipAbductionAngleFrontal', () => {
  it('returns ~0° when knee is directly below hip (neutral stance)', () => {
    const hip = { x: 0, y: 0, z: 0 }
    const knee = { x: 0, y: 1, z: 0 } // straight down
    const ankle = { x: 0, y: 2, z: 0 } // also straight down
    // All three collinear → near-zero abduction
    const angle = hipAbductionAngleFrontal(hip, knee, ankle)
    expect(Math.abs(angle)).toBeCloseTo(0, 1)
  })

  it('returns a positive angle when knee is displaced laterally', () => {
    const hip = { x: 0, y: 0, z: 0 }
    const knee = { x: 1, y: 1, z: 0 } // knee moved lateral
    const ankle = { x: 0, y: 2, z: 0 }
    const angle = hipAbductionAngleFrontal(hip, knee, ankle)
    expect(angle).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Pelvic Drop
// ---------------------------------------------------------------------------
describe('pelvicDropAngle', () => {
  it('returns 0° when both hips are at the same height', () => {
    const leftHip = { x: -0.1, y: 0, z: 0 }
    const rightHip = { x: 0.1, y: 0, z: 0 }
    expect(pelvicDropAngle(leftHip, rightHip)).toBeCloseTo(0, 5)
  })

  it('returns a positive angle when right hip is lower', () => {
    const leftHip = { x: -0.1, y: 0, z: 0 }
    const rightHip = { x: 0.1, y: 0.05, z: 0 } // y is downward, so higher y = lower hip
    expect(pelvicDropAngle(leftHip, rightHip)).toBeGreaterThan(0)
  })

  it('returns a negative angle when left hip is lower', () => {
    const leftHip = { x: -0.1, y: 0.05, z: 0 }
    const rightHip = { x: 0.1, y: 0, z: 0 }
    expect(pelvicDropAngle(leftHip, rightHip)).toBeLessThan(0)
  })

  it('returns 0 when hips are vertically stacked (deltaX = 0)', () => {
    const leftHip = { x: 0, y: 0, z: 0 }
    const rightHip = { x: 0, y: 0.1, z: 0 }
    expect(pelvicDropAngle(leftHip, rightHip)).toBe(0)
  })
})
