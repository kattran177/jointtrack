/**
 * Signal smoothing for joint angle time-series data.
 *
 * Raw landmark positions from MediaPipe fluctuate frame-to-frame due to
 * pose estimation jitter, clothing texture, and self-occlusion. Without
 * smoothing, these fluctuations produce noisy angle traces that look like
 * false deterioration spikes in the longitudinal chart.
 *
 * Two approaches are provided:
 *
 * 1. `movingAverage`  — simple causal O(n) filter; lowest latency, good
 *    for real-time overlay feedback.
 *
 * 2. `savitzkyGolay`  — polynomial least-squares fit over a symmetric window;
 *    preserves peaks better than a plain average, so maximum flexion is not
 *    under-reported. Used for the "peak value" stored to IndexedDB at the end
 *    of each assessment.
 *
 * Both functions are pure: they do not mutate inputs, they accept and return
 * plain number arrays, and they never read from browser APIs — making them
 * straightforward to unit-test and re-use across rendering frames.
 */

// ---------------------------------------------------------------------------
// Moving Average
// ---------------------------------------------------------------------------

/**
 * Causal simple moving average over a sliding window of `windowSize` samples.
 *
 * The first (windowSize - 1) values use a progressively larger available
 * window so the output array is always the same length as the input.
 *
 * @param values     Raw angle time-series (degrees)
 * @param windowSize Number of samples to average (must be ≥ 1)
 * @returns          Smoothed series of the same length
 */
export function movingAverage(values: number[], windowSize: number): number[] {
  if (windowSize < 1) throw new RangeError('windowSize must be ≥ 1')
  if (values.length === 0) return []

  const result: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const slice = values.slice(start, i + 1)
    result.push(slice.reduce((acc, v) => acc + v, 0) / slice.length)
  }
  return result
}

// ---------------------------------------------------------------------------
// Savitzky-Golay (order-2, symmetric window)
// ---------------------------------------------------------------------------

/**
 * Pre-computed Savitzky-Golay coefficients for a 2nd-order polynomial fit.
 *
 * SG coefficients for a window of 2m+1 points are derived by least-squares
 * fitting of a polynomial of degree `order` to the window. For order=2 these
 * are well-known closed-form values tabulated in Numerical Recipes.
 *
 * Keys are the half-window size `m`; each array has length 2m+1.
 * We pre-compute m=2 (5-point) and m=3 (7-point) which are the two most
 * useful choices for 30 fps joint tracking.
 *
 * Reference: Savitzky, A.; Golay, M.J.E. (1964) Anal. Chem. 36 (8), 1627.
 */
const SG_COEFFICIENTS: Record<number, number[]> = {
  // 5-point (m=2), order 2: [-3, 12, 17, 12, -3] / 35
  2: [-3 / 35, 12 / 35, 17 / 35, 12 / 35, -3 / 35],
  // 7-point (m=3), order 2: [-2, 3, 6, 7, 6, 3, -2] / 21
  3: [-2 / 21, 3 / 21, 6 / 21, 7 / 21, 6 / 21, 3 / 21, -2 / 21],
}

/**
 * Apply a Savitzky-Golay smoothing filter to an angle series.
 *
 * Interior points use the full symmetric window. Boundary points fall back
 * to a simple moving average over the available samples to avoid edge
 * artefacts (the boundary condition is usually irrelevant because we store
 * the peak value from the interior of the movement arc).
 *
 * @param values     Raw angle time-series (degrees)
 * @param halfWindow Half-window size `m`; must be 2 or 3
 * @returns          Smoothed series of the same length
 */
export function savitzkyGolay(values: number[], halfWindow: 2 | 3): number[] {
  const coeffs = SG_COEFFICIENTS[halfWindow]
  if (!coeffs) throw new RangeError('halfWindow must be 2 or 3')
  if (values.length === 0) return []

  const m = halfWindow
  const result: number[] = []

  for (let i = 0; i < values.length; i++) {
    if (i < m || i >= values.length - m) {
      // Boundary: simple average over available window
      const start = Math.max(0, i - m)
      const end = Math.min(values.length - 1, i + m)
      const slice = values.slice(start, end + 1)
      result.push(slice.reduce((acc, v) => acc + v, 0) / slice.length)
    } else {
      // Interior: full polynomial weighted sum
      let smoothed = 0
      for (let j = -m; j <= m; j++) {
        smoothed += coeffs[j + m] * values[i + j]
      }
      result.push(smoothed)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Peak Extraction
// ---------------------------------------------------------------------------

/**
 * Extract the maximum value from a smoothed angle series within a contiguous
 * "active window" where values exceed `threshold` degrees.
 *
 * During a knee flexion assessment the user bends and straightens their knee.
 * We want the peak flexion reached, ignoring the start/end baseline noise.
 *
 * @param smoothed   Smoothed angle time-series from `savitzkyGolay`
 * @param threshold  Minimum angle (degrees) to be considered "in movement"
 * @returns          Peak value, or 0 if no samples exceeded the threshold
 */
export function extractPeak(smoothed: number[], threshold = 10): number {
  const active = smoothed.filter((v) => v > threshold)
  if (active.length === 0) return 0
  return Math.max(...active)
}

/**
 * Extract the minimum value from a smoothed series (useful for extension
 * deficit: how close to 0° full extension did the patient achieve?).
 */
export function extractTrough(smoothed: number[], threshold = 160): number {
  const active = smoothed.filter((v) => v < threshold)
  if (active.length === 0) return 180
  return Math.min(...active)
}
