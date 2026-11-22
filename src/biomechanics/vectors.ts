/**
 * 3D vector primitives used throughout the biomechanics module.
 *
 * All MediaPipe landmark positions are expressed in a right-handed coordinate
 * system where x increases rightward, y increases downward, and z represents
 * depth (negative = closer to camera). Functions here are pure and have no
 * external dependencies so they can be unit-tested in isolation.
 */

/** A 3-component vector or landmark position. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * Subtract vector `b` from vector `a`, returning the vector from b → a.
 *
 * Used to build bone direction vectors from landmark positions:
 *   e.g. thighVec = subtract(hip, knee)
 */
export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

/**
 * Euclidean length of a vector.
 * Returns 0 for a zero vector to avoid division-by-zero downstream.
 */
export function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * Dot product of two vectors (a · b).
 * Used in the cosine-rule angle calculation.
 */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/**
 * Cross product of two vectors (a × b).
 * Returns a vector perpendicular to both inputs — used for signed-angle
 * calculations and plane-normal checks.
 */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

/**
 * Normalise a vector to unit length.
 * Returns a zero vector unchanged to prevent NaN propagation.
 */
export function normalise(v: Vec3): Vec3 {
  const m = magnitude(v)
  if (m === 0) return { x: 0, y: 0, z: 0 }
  return { x: v.x / m, y: v.y / m, z: v.z / m }
}

/**
 * Compute the unsigned angle (0–180°) at vertex `b` formed by the
 * two bones b→a and b→c, using the dot-product cosine formula.
 *
 * This is the primary primitive for all joint-angle calculations in
 * JointTrack. The result is always non-negative — sign is added by
 * higher-level functions that know the movement's reference axis.
 *
 * @param a  Proximal landmark (e.g. hip for a knee angle)
 * @param b  Vertex landmark  (e.g. knee)
 * @param c  Distal landmark  (e.g. ankle)
 * @returns  Angle in degrees, clamped to [0, 180]
 */
export function angleBetween(a: Vec3, b: Vec3, c: Vec3): number {
  const ba = subtract(a, b) // vector from knee → hip
  const bc = subtract(c, b) // vector from knee → ankle
  const mba = magnitude(ba)
  const mbc = magnitude(bc)

  // Degenerate case: landmarks are coincident — return 0 so callers can
  // treat it as a low-confidence frame and skip it.
  if (mba === 0 || mbc === 0) return 0

  // Clamp cosine to [-1, 1] to guard against floating-point overshoot
  // in acos (which would produce NaN).
  const cosTheta = Math.max(-1, Math.min(1, dot(ba, bc) / (mba * mbc)))
  return (Math.acos(cosTheta) * 180) / Math.PI
}
