import { describe, expect, it } from 'vitest'
import {
  angleBetween,
  cross,
  dot,
  magnitude,
  normalise,
  subtract,
} from '../vectors.ts'

describe('subtract', () => {
  it('returns vector from b to a', () => {
    const result = subtract({ x: 3, y: 4, z: 5 }, { x: 1, y: 2, z: 3 })
    expect(result).toEqual({ x: 2, y: 2, z: 2 })
  })

  it('handles negative results', () => {
    const result = subtract({ x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 })
    expect(result).toEqual({ x: -5, y: -5, z: -5 })
  })
})

describe('magnitude', () => {
  it('returns 0 for zero vector', () => {
    expect(magnitude({ x: 0, y: 0, z: 0 })).toBe(0)
  })

  it('returns 1 for unit x-axis vector', () => {
    expect(magnitude({ x: 1, y: 0, z: 0 })).toBe(1)
  })

  it('computes 3-4-5 Pythagorean triple correctly', () => {
    expect(magnitude({ x: 3, y: 4, z: 0 })).toBeCloseTo(5, 10)
  })

  it('computes 3D magnitude', () => {
    // sqrt(1^2 + 2^2 + 2^2) = sqrt(9) = 3
    expect(magnitude({ x: 1, y: 2, z: 2 })).toBeCloseTo(3, 10)
  })
})

describe('dot', () => {
  it('returns 0 for perpendicular vectors', () => {
    expect(dot({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0)
  })

  it('returns magnitude-product for parallel vectors', () => {
    expect(dot({ x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 })).toBe(6)
  })

  it('returns negative for anti-parallel vectors', () => {
    expect(dot({ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 })).toBe(-1)
  })
})

describe('cross', () => {
  it('x × y = z', () => {
    expect(cross({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toEqual({
      x: 0,
      y: 0,
      z: 1,
    })
  })

  it('y × x = -z', () => {
    const result = cross({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 })
    expect(result.z).toBeCloseTo(-1, 10)
  })

  it('parallel vectors produce zero vector', () => {
    const result = cross({ x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 })
    expect(result).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('normalise', () => {
  it('returns a unit vector', () => {
    const result = normalise({ x: 3, y: 4, z: 0 })
    expect(magnitude(result)).toBeCloseTo(1, 10)
  })

  it('returns zero vector unchanged', () => {
    expect(normalise({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('angleBetween', () => {
  // Three collinear landmarks in a straight line → 180° raw (0° flexion)
  it('returns 180° for a straight line (full extension geometry)', () => {
    const hip = { x: 0, y: -1, z: 0 }
    const knee = { x: 0, y: 0, z: 0 }
    const ankle = { x: 0, y: 1, z: 0 }
    expect(angleBetween(hip, knee, ankle)).toBeCloseTo(180, 5)
  })

  it('returns 90° for a right angle', () => {
    // hip is directly above knee; ankle is directly to the right of knee
    const hip = { x: 0, y: -1, z: 0 }
    const knee = { x: 0, y: 0, z: 0 }
    const ankle = { x: 1, y: 0, z: 0 }
    expect(angleBetween(hip, knee, ankle)).toBeCloseTo(90, 5)
  })

  it('returns 0° when two landmarks are coincident', () => {
    // Degenerate: hip and knee at same position
    expect(
      angleBetween(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
      ),
    ).toBe(0)
  })

  it('returns ~45° for a 45-degree bend', () => {
    // hip at (-1, -1, 0), knee at (0,0,0), ankle at (1, 0, 0)
    const hip = { x: -1, y: -1, z: 0 }
    const knee = { x: 0, y: 0, z: 0 }
    const ankle = { x: 1, y: 0, z: 0 }
    // vector knee→hip = (-1,-1,0), vector knee→ankle = (1,0,0)
    // cos θ = (-1*1 + -1*0) / (sqrt(2) * 1) = -1/sqrt(2) → θ = 135°
    expect(angleBetween(hip, knee, ankle)).toBeCloseTo(135, 2)
  })

  it('handles 3D landmarks correctly', () => {
    const a = { x: 0, y: -1, z: 0 }
    const b = { x: 0, y: 0, z: 0 }
    const c = { x: 0, y: 0, z: 1 } // ankle displaced in z
    expect(angleBetween(a, b, c)).toBeCloseTo(90, 5)
  })
})
