/**
 * Repetition counter for the 5× Sit-to-Stand (5STS) test.
 *
 * The 5STS is a validated functional mobility test: the subject rises from
 * a chair 5 times as fast as possible without using their arms. Completion
 * time (seconds) is compared to age/sex normative data, and the number of
 * completed reps within a fixed time window is an alternative scoring format.
 *
 * Detection strategy
 * ------------------
 * We track the vertical (y-axis) position of the hip midpoint relative to
 * the knee midpoint across frames. As y increases downward in MediaPipe's
 * coordinate system, sitting corresponds to a *smaller* hip-to-knee y-ratio
 * (hips and knees at similar height) while standing corresponds to a *larger*
 * ratio (hips well above knees).
 *
 * State machine:
 *   SITTING  → RISING  when hip rises above riseThreshold
 *   RISING   → STANDING when hip-knee ratio exceeds standThreshold
 *   STANDING → LOWERING when ratio starts falling below standThreshold
 *   LOWERING → SITTING  when ratio drops below sitThreshold (rep counted)
 *
 * All thresholds are expressed as normalised ratios relative to the subject's
 * own hip-to-knee height so they are scale-invariant and work for different
 * camera distances.
 */

export type StsPhase = 'sitting' | 'rising' | 'standing' | 'lowering'

export interface StsFrame {
  /** Normalised hip–knee vertical ratio for this frame (0 = fully sitting) */
  ratio: number
  /** Elapsed time in seconds since assessment started */
  elapsedSeconds: number
}

export interface StsResult {
  reps: number
  completedAt: number | null // seconds for the 5th rep, null if not reached
  phase: StsPhase
}

/** Configuration thresholds for the state machine. */
export interface StsConfig {
  /** Ratio below which the subject is considered fully seated */
  sitThreshold?: number
  /** Ratio above which the subject is considered fully upright */
  standThreshold?: number
  /** Target number of repetitions (default 5) */
  targetReps?: number
}

const DEFAULTS: Required<StsConfig> = {
  sitThreshold: 0.25,
  standThreshold: 0.65,
  targetReps: 5,
}

/**
 * Incremental state machine for the 5STS test.
 *
 * Instantiate once per assessment, then call `update()` on every frame.
 * This design avoids array buffering overhead on the main render thread.
 *
 * @example
 * ```ts
 * const counter = new SitToStandCounter()
 * // per-frame inside the MediaPipe callback:
 * const result = counter.update({ ratio: hipKneeRatio, elapsedSeconds: t })
 * if (result.reps === 5) showCompletionScreen(result.completedAt)
 * ```
 */
export class SitToStandCounter {
  private phase: StsPhase = 'sitting'
  private reps = 0
  private completedAt: number | null = null
  private readonly config: Required<StsConfig>

  constructor(config: StsConfig = {}) {
    this.config = { ...DEFAULTS, ...config }
  }

  /**
   * Process one frame and return the current test result.
   * Call this inside the MediaPipe pose callback at ~30 fps.
   */
  update(frame: StsFrame): StsResult {
    const { ratio, elapsedSeconds } = frame
    const { sitThreshold, standThreshold, targetReps } = this.config

    switch (this.phase) {
      case 'sitting':
        if (ratio > sitThreshold) this.phase = 'rising'
        break

      case 'rising':
        if (ratio < sitThreshold) {
          // Dropped back without completing the stand — reset to sitting
          this.phase = 'sitting'
        } else if (ratio >= standThreshold) {
          this.phase = 'standing'
        }
        break

      case 'standing':
        if (ratio < standThreshold) this.phase = 'lowering'
        break

      case 'lowering':
        if (ratio >= standThreshold) {
          // Rose back up before fully sitting — still lowering
          this.phase = 'standing'
        } else if (ratio <= sitThreshold) {
          this.reps++
          this.phase = 'sitting'
          if (this.reps === targetReps && this.completedAt === null) {
            this.completedAt = elapsedSeconds
          }
        }
        break
    }

    return this.snapshot()
  }

  /** Return the current result without advancing the state machine. */
  snapshot(): StsResult {
    return {
      reps: this.reps,
      completedAt: this.completedAt,
      phase: this.phase,
    }
  }

  /** Reset to initial state for a new attempt. */
  reset(): void {
    this.phase = 'sitting'
    this.reps = 0
    this.completedAt = null
  }
}

// ---------------------------------------------------------------------------
// Pure helper: compute hip-knee vertical ratio from landmark coordinates
// ---------------------------------------------------------------------------

export interface LandmarkY {
  leftHipY: number
  rightHipY: number
  leftKneeY: number
  rightKneeY: number
}

/**
 * Compute the normalised hip–knee ratio from four vertical landmark positions.
 *
 * Returns a value between 0 and 1 (and potentially above 1 when fully upright
 * with the camera at mid-body height). The ratio is:
 *
 *   ratio = (kneeY_avg − hipY_avg) / kneeY_avg
 *
 * Because y increases downward, kneeY > hipY when standing (hips above knees).
 * A ratio near 0 means hips and knees are at the same height (seated).
 * A ratio near 0.7–0.8 is typical in full standing at a 1–2 m camera distance.
 *
 * We use the bilateral average to reduce asymmetry noise from leaning.
 */
export function computeHipKneeRatio(lm: LandmarkY): number {
  const hipY = (lm.leftHipY + lm.rightHipY) / 2
  const kneeY = (lm.leftKneeY + lm.rightKneeY) / 2
  if (kneeY === 0) return 0
  return (kneeY - hipY) / kneeY
}
