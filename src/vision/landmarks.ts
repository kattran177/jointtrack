/**
 * MediaPipe Pose Landmarker — landmark index constants.
 *
 * MediaPipe's BlazePose model returns 33 landmarks indexed 0–32.
 * We alias only the lower-limb landmarks used in JointTrack to avoid
 * magic-number indexing throughout the codebase.
 *
 * Reference: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
 *
 * Coordinate system (normalised image landmarks)
 * -----------------------------------------------
 * x  0–1, left edge → right edge of frame
 * y  0–1, top edge → bottom edge of frame
 * z  depth relative to hip midpoint (negative = closer to camera)
 * visibility  0–1 confidence that the landmark is visible and unoccluded
 */

export const LM = {
  // ── Core lower-limb landmarks ──────────────────────────────────────────
  LEFT_HIP:    23,
  RIGHT_HIP:   24,
  LEFT_KNEE:   25,
  RIGHT_KNEE:  26,
  LEFT_ANKLE:  27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL:   29,
  RIGHT_HEEL:  30,
  LEFT_FOOT_INDEX:  31,
  RIGHT_FOOT_INDEX: 32,

  // ── Upper body — used for framing guidance only ────────────────────────
  LEFT_SHOULDER:  11,
  RIGHT_SHOULDER: 12,
  NOSE:            0,
} as const

export type LandmarkIndex = (typeof LM)[keyof typeof LM]

/**
 * Minimum visibility confidence for a landmark to be considered reliable.
 *
 * MediaPipe reports visibility as a probability (0–1). Values below this
 * threshold indicate the landmark is likely occluded or outside the frame.
 * We gate all angle calculations on this check so that poor-quality frames
 * do not produce misleading angle values.
 *
 * 0.65 is a conservative threshold chosen to tolerate minor occlusion while
 * rejecting frames where the model is guessing.
 */
export const MIN_VISIBILITY = 0.65

/**
 * Minimum number of consecutive low-confidence frames before we surface a
 * "landmark not visible" warning to the user.
 * At 30 fps this corresponds to ~0.5 s of poor visibility.
 */
export const LOW_CONFIDENCE_FRAME_THRESHOLD = 15
