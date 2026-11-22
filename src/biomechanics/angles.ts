/**
 * Joint angle calculations for lower-limb assessment.
 *
 * All functions operate on bare Vec3 landmark positions extracted from
 * MediaPipe Pose Landmarker output. The MediaPipe landmark index constants
 * used by the vision layer live in src/vision/landmarks.ts; this module
 * only receives already-extracted coordinates so it stays framework-agnostic
 * and fully unit-testable without any browser or camera dependencies.
 *
 * Clinical framing
 * ----------------
 * These are objective kinematic measurements, not diagnostic values.
 * They are presented to users alongside validated PROMs and trend charts
 * to support — not replace — clinician assessment.
 *
 * Coordinate convention (MediaPipe world-space landmarks)
 * -------------------------------------------------------
 * x  increases to the subject's left (from camera perspective: rightward)
 * y  increases downward
 * z  represents depth (negative = closer to camera)
 * Distances are in metres when using world landmarks.
 */

import { angleBetween, type Vec3 } from './vectors.ts'

// ---------------------------------------------------------------------------
// Knee Flexion / Extension
// ---------------------------------------------------------------------------

/**
 * Active knee flexion angle measured at the knee joint.
 *
 * Uses the hip (greater trochanter proxy), knee (lateral epicondyle proxy),
 * and ankle (lateral malleolus proxy) landmarks to form the femur–tibia
 * angle in 3D space.
 *
 * Full extension ≈ 0–10°; maximum functional flexion ≈ 130–150°.
 * Values outside 0–160° are clamped and logged as low-confidence.
 *
 * @param hip    Hip landmark (left or right)
 * @param knee   Knee landmark (matching side)
 * @param ankle  Ankle landmark (matching side)
 * @returns Knee flexion angle in degrees (0 = full extension)
 */
export function kneeFlexionAngle(hip: Vec3, knee: Vec3, ankle: Vec3): number {
  const raw = angleBetween(hip, knee, ankle)
  // MediaPipe's straight-leg angle is ~180°; clinical convention inverts this
  // so that 0° = full extension and 90° = right-angle flexion.
  return clampAngle(180 - raw, 0, 160)
}

/**
 * Result object returned from a single knee angle measurement frame.
 * The `side` discriminator allows the UI to display left and right
 * measurements separately in the chart.
 */
export interface KneeAngleResult {
  side: 'left' | 'right'
  flexionDeg: number
  /** Raw 3D angle before clinical inversion — useful for debugging overlays */
  rawAngleDeg: number
  /** True when the angle is within a physiologically plausible range */
  isPlausible: boolean
}

export function computeKneeAngle(
  hip: Vec3,
  knee: Vec3,
  ankle: Vec3,
  side: 'left' | 'right',
): KneeAngleResult {
  const rawAngleDeg = angleBetween(hip, knee, ankle)
  const flexionDeg = clampAngle(180 - rawAngleDeg, 0, 160)
  return {
    side,
    flexionDeg,
    rawAngleDeg,
    isPlausible: flexionDeg >= 0 && flexionDeg <= 155,
  }
}

// ---------------------------------------------------------------------------
// Hip Abduction
// ---------------------------------------------------------------------------

/**
 * Hip abduction angle estimated from the lateral displacement of the knee
 * relative to the hip-to-ankle axis projected onto the frontal plane (XY).
 *
 * This is a simplified 2D frontal-plane estimate because accurate 3D hip
 * abduction requires reliable pelvis width and femoral torsion data that
 * MediaPipe cannot consistently provide for older adults in standing.
 * Report as an indicator of movement symmetry, not a clinical goniometry
 * replacement.
 *
 * @param hip    Hip landmark
 * @param knee   Knee landmark (same side)
 * @param ankle  Ankle landmark (same side)
 * @returns Abduction angle in degrees; positive = abducted away from midline
 */
export function hipAbductionAngleFrontal(
  hip: Vec3,
  knee: Vec3,
  ankle: Vec3,
): number {
  // Project onto frontal plane: use x (mediolateral) and y (vertical) only.
  // Build vectors from hip→knee and hip→ankle ignoring z depth.
  const thighVec = { x: knee.x - hip.x, y: knee.y - hip.y }
  const limbAxisVec = { x: ankle.x - hip.x, y: ankle.y - hip.y }

  const crossZ = thighVec.x * limbAxisVec.y - thighVec.y * limbAxisVec.x
  const dotProduct = thighVec.x * limbAxisVec.x + thighVec.y * limbAxisVec.y
  const angle = (Math.atan2(Math.abs(crossZ), dotProduct) * 180) / Math.PI

  // Sign: if the knee is lateral to the ankle (cross-product sign), abducted
  return crossZ >= 0 ? angle : -angle
}

// ---------------------------------------------------------------------------
// Pelvic Drop / Trendelenburg Indicator
// ---------------------------------------------------------------------------

/**
 * Pelvic obliquity in the frontal plane, measured as the angle of the line
 * connecting the two hip landmarks relative to true horizontal.
 *
 * A non-zero value during single-leg stance suggests gluteus medius weakness
 * (Trendelenburg sign). Values > 5° are clinically notable.
 *
 * @param leftHip   Left hip landmark
 * @param rightHip  Right hip landmark
 * @returns Pelvic drop angle in degrees; positive = right hip drops
 */
export function pelvicDropAngle(leftHip: Vec3, rightHip: Vec3): number {
  // In MediaPipe's coordinate system y increases downward, so a positive
  // Δy means the right hip is lower (dropped).
  const deltaY = rightHip.y - leftHip.y
  const deltaX = rightHip.x - leftHip.x
  if (deltaX === 0) return 0
  return (Math.atan2(deltaY, Math.abs(deltaX)) * 180) / Math.PI
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Clamp a value to [min, max]. */
function clampAngle(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
