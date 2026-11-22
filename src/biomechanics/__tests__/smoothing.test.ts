import { describe, expect, it } from 'vitest'
import {
  extractPeak,
  extractTrough,
  movingAverage,
  savitzkyGolay,
} from '../smoothing.ts'

// ---------------------------------------------------------------------------
// Moving Average
// ---------------------------------------------------------------------------
describe('movingAverage', () => {
  it('returns empty array for empty input', () => {
    expect(movingAverage([], 3)).toEqual([])
  })

  it('returns input unchanged for window=1', () => {
    expect(movingAverage([10, 20, 30], 1)).toEqual([10, 20, 30])
  })

  it('handles boundary: window larger than input', () => {
    const result = movingAverage([10, 20], 5)
    // All points use the available window
    expect(result.length).toBe(2)
    expect(result[0]).toBe(10) // only one value available
    expect(result[1]).toBeCloseTo(15, 5) // average of [10, 20]
  })

  it('smooths a noisy constant signal toward the constant', () => {
    // 100 ± noise; after smoothing each value should be close to 100
    const noisy = [100, 102, 98, 101, 99, 100, 103, 97, 100, 101]
    const smoothed = movingAverage(noisy, 4)
    smoothed.forEach((v) => expect(v).toBeGreaterThan(97))
    smoothed.forEach((v) => expect(v).toBeLessThan(104))
  })

  it('output length equals input length', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(movingAverage(data, 3).length).toBe(data.length)
  })

  it('throws for window size < 1', () => {
    expect(() => movingAverage([1, 2, 3], 0)).toThrow(RangeError)
  })
})

// ---------------------------------------------------------------------------
// Savitzky-Golay
// ---------------------------------------------------------------------------
describe('savitzkyGolay', () => {
  it('returns empty array for empty input', () => {
    expect(savitzkyGolay([], 2)).toEqual([])
  })

  it('output length equals input length', () => {
    const data = Array.from({ length: 15 }, (_, i) => i * 3)
    expect(savitzkyGolay(data, 2).length).toBe(data.length)
  })

  it('passes a linear signal through unchanged (order 2 preserves linear)', () => {
    // SG order-2 filter perfectly preserves polynomial signals of degree ≤ 2
    const linear = Array.from({ length: 10 }, (_, i) => i * 5) // 0,5,10,...
    const result = savitzkyGolay(linear, 2)
    // Interior points should be very close to the original
    for (let i = 2; i < result.length - 2; i++) {
      expect(result[i]).toBeCloseTo(linear[i], 3)
    }
  })

  it('reduces noise on a step function', () => {
    // Step at index 5: 0,0,0,0,0,10,10,10,10,10
    const step = [0, 0, 0, 0, 0, 10, 10, 10, 10, 10]
    const smoothed = savitzkyGolay(step, 2)
    // The smoothed value at the mid-point interior should be between 0 and 10
    expect(smoothed[4]).toBeGreaterThan(0)
    expect(smoothed[4]).toBeLessThan(10)
  })

  it('works with half-window 3 (7-point kernel)', () => {
    const data = Array.from({ length: 20 }, (_, i) => i * 2)
    expect(savitzkyGolay(data, 3).length).toBe(20)
  })

  it('throws for unsupported half-window', () => {
    // @ts-expect-error intentionally invalid
    expect(() => savitzkyGolay([1, 2, 3], 4)).toThrow(RangeError)
  })
})

// ---------------------------------------------------------------------------
// Peak Extraction
// ---------------------------------------------------------------------------
describe('extractPeak', () => {
  it('returns 0 when no values exceed threshold', () => {
    expect(extractPeak([5, 8, 7], 10)).toBe(0)
  })

  it('returns the maximum value above threshold', () => {
    expect(extractPeak([10, 45, 90, 70, 20], 10)).toBe(90)
  })

  it('handles all-zero series', () => {
    expect(extractPeak([0, 0, 0])).toBe(0)
  })
})

describe('extractTrough', () => {
  it('returns 180 when no values are below threshold', () => {
    expect(extractTrough([170, 175, 165], 160)).toBe(180)
  })

  it('returns the minimum value below threshold', () => {
    expect(extractTrough([5, 10, 3, 15], 160)).toBe(3)
  })
})
