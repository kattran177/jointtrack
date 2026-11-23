/**
 * Frame processor — bridges raw PoseFrame data to biomechanics outputs.
 *
 * This module sits between the MediaPipe vision layer and the biomechanics
 * module. It extracts landmark coordinates from a PoseFrame, runs the angle
 * and rep-counter calculations, applies signal smoothing, and returns a
 * structured result that the UI and storage layer can consume directly.
 *
 * It is kept separate from the React hook so it can be unit-tested with
 * synthetic PoseFrame objects without spinning up a camera.
 */

import {
  computeKneeAngle,
  type KneeAngleResult,
} from '../biomechanics/angles.ts'
import {
  computeHipKneeRatio,
  type SitToStandCounter,
  type StsResult,
} from '../biomechanics/repCounter.ts'
import { movingAverage } from '../biomechanics/smoothing.ts'
import type { PoseFrame } from './poseRunner.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssessmentMode =
  | 'knee-flexion'       // Active knee flexion/extension ROM
  | 'sit-to-stand'       // 5× Sit-to-Stand test
  | 'hip-abduction'      // Hip abduction / stance stability

export interface ProcessedFrame {
  mode:              AssessmentMode
  leftKnee:          KneeAngleResult | null
  rightKnee:         KneeAngleResult | null
  sts:               StsResult | null
  hipKneeRatio:      number | null
  isReliable:        boolean
  timestampMs:       number
}

// ---------------------------------------------------------------------------
// Stateful series buffers for smoothing (retained across frames)
// ---------------------------------------------------------------------------

const SMOOTHING_WINDOW = 5 // frames — ~167 ms at 30 fps

class AngleBuffer {
  private leftBuf:  number[] = []
  private rightBuf: number[] = []

  push(left: number, right: number): void {
    this.leftBuf.push(left)
    this.rightBuf.push(right)
    // Keep only the last N + a little extra so slicing stays cheap
    if (this.leftBuf.length > SMOOTHING_WINDOW * 3) {
      this.leftBuf  = this.leftBuf.slice(-SMOOTHING_WINDOW * 2)
      this.rightBuf = this.rightBuf.slice(-SMOOTHING_WINDOW * 2)
    }
  }

  smoothedLatest(): { left: number; right: number } {
    const sl = movingAverage(this.leftBuf,  SMOOTHING_WINDOW)
    const sr = movingAverage(this.rightBuf, SMOOTHING_WINDOW)
    return {
      left:  sl[sl.length - 1] ?? 0,
      right: sr[sr.length - 1] ?? 0,
    }
  }

  reset(): void {
    this.leftBuf  = []
    this.rightBuf = []
  }
}

// Module-level buffers — one per side, shared across all frames in a session
const kneeAngleBuffer = new AngleBuffer()

/**
 * Process a single pose frame for the given assessment mode.
 *
 * @param frame     Raw pose frame from detectFrame()
 * @param mode      Which assessment is currently running
 * @param stsCounter  SitToStandCounter instance (required for 'sit-to-stand')
 * @param elapsedSeconds  Seconds since the assessment started
 */
export function processFrame(
  frame: PoseFrame,
  mode: AssessmentMode,
  stsCounter?: SitToStandCounter,
  elapsedSeconds?: number,
): ProcessedFrame {
  const base: ProcessedFrame = {
    mode,
    leftKnee:     null,
    rightKnee:    null,
    sts:          null,
    hipKneeRatio: null,
    isReliable:   frame.isReliable,
    timestampMs:  frame.timestampMs,
  }

  if (!frame.isReliable || !frame.lower) return base

  const lm = frame.lower

  if (mode === 'knee-flexion') {
    const rawLeft  = computeKneeAngle(lm.leftHip,  lm.leftKnee,  lm.leftAnkle,  'left')
    const rawRight = computeKneeAngle(lm.rightHip, lm.rightKnee, lm.rightAnkle, 'right')

    kneeAngleBuffer.push(rawLeft.flexionDeg, rawRight.flexionDeg)
    const smoothed = kneeAngleBuffer.smoothedLatest()

    return {
      ...base,
      leftKnee:  { ...rawLeft,  flexionDeg: smoothed.left  },
      rightKnee: { ...rawRight, flexionDeg: smoothed.right },
    }
  }

  if (mode === 'sit-to-stand' && stsCounter && elapsedSeconds !== undefined) {
    const ratio = computeHipKneeRatio({
      leftHipY:   lm.leftHip.y,
      rightHipY:  lm.rightHip.y,
      leftKneeY:  lm.leftKnee.y,
      rightKneeY: lm.rightKnee.y,
    })
    const sts = stsCounter.update({ ratio, elapsedSeconds })
    return { ...base, hipKneeRatio: ratio, sts }
  }

  if (mode === 'hip-abduction') {
    // For hip abduction we still compute knee angles as a secondary indicator
    const rawLeft  = computeKneeAngle(lm.leftHip,  lm.leftKnee,  lm.leftAnkle,  'left')
    const rawRight = computeKneeAngle(lm.rightHip, lm.rightKnee, lm.rightAnkle, 'right')
    return { ...base, leftKnee: rawLeft, rightKnee: rawRight }
  }

  return base
}

/** Reset the angle smoothing buffers between assessment sessions. */
export function resetFrameProcessor(): void {
  kneeAngleBuffer.reset()
}
