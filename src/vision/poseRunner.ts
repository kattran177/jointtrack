/**
 * MediaPipe Pose Landmarker — initialisation and per-frame inference.
 *
 * This module is the only place in JointTrack that touches the MediaPipe API
 * directly. Everything downstream (angle calculation, rep counting, storage)
 * receives plain Vec3 objects extracted here, keeping those modules testable
 * without any browser or ML dependencies.
 *
 * Privacy guarantee
 * -----------------
 * Raw video frames are processed entirely in-process by the WASM runtime.
 * No frame data is serialised, stored to disk, or sent over the network.
 * The only persistent output is the computed angle values written to
 * IndexedDB by the storage module.
 *
 * Threading model
 * ---------------
 * MediaPipe tasks-vision runs the pose model on the main thread via WASM.
 * We call `detectForVideo` inside a `requestAnimationFrame` loop started by
 * the React hook in `usePoseCamera.ts`. The loop is stopped on component
 * unmount to release the camera stream and avoid memory leaks.
 *
 * WASM / model files
 * ------------------
 * We load the Pose Landmarker WASM bundle and model asset directly from the
 * Google CDN. In a production self-hosted deployment these should be copied
 * to the `public/` directory and the CDN URL replaced with a relative path.
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { Vec3 } from '../biomechanics/vectors.ts'
import { LM, MIN_VISIBILITY } from './landmarks.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The subset of MediaPipe pose data that the rest of the app cares about.
 * Using a plain object (not the MediaPipe result class) keeps downstream
 * code decoupled from the ML library.
 */
export interface PoseFrame {
  /** Raw normalised landmarks [0–32], or null when pose not detected */
  landmarks: NormalizedLandmark[] | null
  /** Extracted lower-limb Vec3 positions (image-space, normalised 0–1) */
  lower: LowerLimbLandmarks | null
  /** True when all required lower-limb landmarks meet the visibility threshold */
  isReliable: boolean
  /** Timestamp in ms from performance.now() */
  timestampMs: number
}

export interface LowerLimbLandmarks {
  leftHip:    Vec3
  rightHip:   Vec3
  leftKnee:   Vec3
  rightKnee:  Vec3
  leftAnkle:  Vec3
  rightAnkle: Vec3
}

// ---------------------------------------------------------------------------
// Singleton landmarker instance
// ---------------------------------------------------------------------------

let landmarker: PoseLandmarker | null = null
let initPromise: Promise<PoseLandmarker> | null = null

/**
 * Initialise (or return the cached) PoseLandmarker instance.
 *
 * Safe to call multiple times — subsequent calls return the same promise.
 * Call this as early as possible (e.g. on app load) so the WASM bundle
 * is downloaded and compiled before the user reaches the camera screen.
 */
export async function initialisePoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker
  if (initPromise) return initPromise

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      // WASM bundle — loaded from CDN; replace with '/mediapipe/wasm' for self-hosting
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    )

    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        // Lite model: fast enough for real-time on mid-range devices
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU', // falls back to CPU automatically if WebGPU unavailable
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false, // not needed; avoids extra memory allocation
    })

    return landmarker
  })()

  return initPromise
}

/**
 * Run pose inference on a single video frame.
 *
 * @param lm         Initialised PoseLandmarker instance
 * @param video      The <video> element currently displaying camera feed
 * @param timestampMs  Current frame timestamp (from requestAnimationFrame callback)
 * @returns          PoseFrame with extracted landmarks and reliability flag
 */
export function detectFrame(
  lm: PoseLandmarker,
  video: HTMLVideoElement,
  timestampMs: number,
): PoseFrame {
  // MediaPipe requires strictly increasing timestamps for VIDEO mode
  const result: PoseLandmarkerResult = lm.detectForVideo(video, timestampMs)

  if (!result.landmarks || result.landmarks.length === 0) {
    return { landmarks: null, lower: null, isReliable: false, timestampMs }
  }

  const raw = result.landmarks[0] // single-pose model
  const lower = extractLowerLimb(raw)
  const isReliable = lower !== null && checkReliability(raw)

  return { landmarks: raw, lower, isReliable, timestampMs }
}

// ---------------------------------------------------------------------------
// Landmark extraction helpers
// ---------------------------------------------------------------------------

/**
 * Pull the six lower-limb landmarks out of the raw MediaPipe array and
 * convert them to our Vec3 type.
 *
 * Returns null if any required landmark index is out of bounds, which
 * would indicate a model format change.
 */
function extractLowerLimb(lms: NormalizedLandmark[]): LowerLimbLandmarks | null {
  const required = [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE]
  if (required.some((i) => i >= lms.length)) return null

  return {
    leftHip:    toVec3(lms[LM.LEFT_HIP]),
    rightHip:   toVec3(lms[LM.RIGHT_HIP]),
    leftKnee:   toVec3(lms[LM.LEFT_KNEE]),
    rightKnee:  toVec3(lms[LM.RIGHT_KNEE]),
    leftAnkle:  toVec3(lms[LM.LEFT_ANKLE]),
    rightAnkle: toVec3(lms[LM.RIGHT_ANKLE]),
  }
}

function toVec3(lm: NormalizedLandmark): Vec3 {
  return { x: lm.x, y: lm.y, z: lm.z ?? 0 }
}

/**
 * Returns true when all six lower-limb landmarks are above the minimum
 * visibility threshold. Used to gate angle calculations.
 */
function checkReliability(lms: NormalizedLandmark[]): boolean {
  const required = [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE]
  return required.every((i) => (lms[i].visibility ?? 0) >= MIN_VISIBILITY)
}

/**
 * Close the landmarker and release GPU/WASM resources.
 * Call this when the camera view unmounts for the final time.
 */
export function disposePoseLandmarker(): void {
  landmarker?.close()
  landmarker = null
  initPromise = null
}
