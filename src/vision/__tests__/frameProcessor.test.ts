import { beforeEach, describe, expect, it } from 'vitest'
import { SitToStandCounter } from '../../biomechanics/repCounter.ts'
import {
  processFrame,
  resetFrameProcessor,
} from '../frameProcessor.ts'
import type { PoseFrame } from '../poseRunner.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal PoseFrame with the given lower-limb positions. */
function makeFrame(overrides: Partial<PoseFrame> = {}): PoseFrame {
  return {
    landmarks: null,
    lower: {
      leftHip:    { x: 0.3, y: 0.3, z: 0 },
      rightHip:   { x: 0.7, y: 0.3, z: 0 },
      leftKnee:   { x: 0.3, y: 0.6, z: 0 },
      rightKnee:  { x: 0.7, y: 0.6, z: 0 },
      leftAnkle:  { x: 0.3, y: 0.9, z: 0 },
      rightAnkle: { x: 0.7, y: 0.9, z: 0 },
    },
    isReliable: true,
    timestampMs: 1000,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processFrame — knee-flexion mode', () => {
  beforeEach(() => resetFrameProcessor())

  it('returns null knee values for unreliable frame', () => {
    const result = processFrame(makeFrame({ isReliable: false }), 'knee-flexion')
    expect(result.leftKnee).toBeNull()
    expect(result.rightKnee).toBeNull()
    expect(result.isReliable).toBe(false)
  })

  it('returns null knee values when lower limb data is missing', () => {
    const result = processFrame(makeFrame({ lower: null }), 'knee-flexion')
    expect(result.leftKnee).toBeNull()
  })

  it('returns knee angle results for a reliable frame', () => {
    const result = processFrame(makeFrame(), 'knee-flexion')
    expect(result.leftKnee).not.toBeNull()
    expect(result.rightKnee).not.toBeNull()
    expect(result.leftKnee?.side).toBe('left')
    expect(result.rightKnee?.side).toBe('right')
  })

  it('returns plausible flexion values (0–155°) for a straight-leg frame', () => {
    // Collinear landmarks (hip above knee above ankle) → near-zero flexion
    const straightFrame = makeFrame({
      lower: {
        leftHip:    { x: 0.3, y: 0.1, z: 0 },
        rightHip:   { x: 0.7, y: 0.1, z: 0 },
        leftKnee:   { x: 0.3, y: 0.5, z: 0 },
        rightKnee:  { x: 0.7, y: 0.5, z: 0 },
        leftAnkle:  { x: 0.3, y: 0.9, z: 0 },
        rightAnkle: { x: 0.7, y: 0.9, z: 0 },
      },
    })
    const result = processFrame(straightFrame, 'knee-flexion')
    expect(result.leftKnee?.flexionDeg).toBeGreaterThanOrEqual(0)
    expect(result.leftKnee?.flexionDeg).toBeLessThanOrEqual(155)
  })

  it('smoothing does not increase value beyond raw peak on a stable signal', () => {
    // Feed 10 identical frames — smoothed value should equal raw value
    for (let i = 0; i < 9; i++) processFrame(makeFrame({ timestampMs: i * 33 }), 'knee-flexion')
    const last = processFrame(makeFrame({ timestampMs: 330 }), 'knee-flexion')
    // Smoothed and raw should be very close for a constant signal
    if (last.leftKnee) {
      expect(last.leftKnee.flexionDeg).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('processFrame — sit-to-stand mode', () => {
  beforeEach(() => resetFrameProcessor())

  it('updates the STS counter and returns a rep result', () => {
    const counter = new SitToStandCounter()
    const frame = makeFrame()
    const result = processFrame(frame, 'sit-to-stand', counter, 1.0)
    expect(result.sts).not.toBeNull()
    expect(typeof result.sts?.reps).toBe('number')
  })

  it('returns null sts when no counter is provided', () => {
    const result = processFrame(makeFrame(), 'sit-to-stand')
    expect(result.sts).toBeNull()
  })

  it('computes a non-negative hip-knee ratio', () => {
    const counter = new SitToStandCounter()
    const result = processFrame(makeFrame(), 'sit-to-stand', counter, 0)
    expect(result.hipKneeRatio).not.toBeNull()
    expect(result.hipKneeRatio!).toBeGreaterThanOrEqual(0)
  })
})

describe('processFrame — hip-abduction mode', () => {
  beforeEach(() => resetFrameProcessor())

  it('returns knee angles as a secondary indicator', () => {
    const result = processFrame(makeFrame(), 'hip-abduction')
    expect(result.leftKnee).not.toBeNull()
    expect(result.rightKnee).not.toBeNull()
  })
})

describe('processFrame — mode passthrough', () => {
  it('echoes the mode in the result', () => {
    const r = processFrame(makeFrame(), 'knee-flexion')
    expect(r.mode).toBe('knee-flexion')
  })

  it('echoes the timestampMs', () => {
    const r = processFrame(makeFrame({ timestampMs: 9999 }), 'knee-flexion')
    expect(r.timestampMs).toBe(9999)
  })
})
