/**
 * CameraView — the live camera feed with pose overlay.
 *
 * Renders the <video> element, the overlay <canvas>, and the control bar.
 * The parent page passes `onFrameResult` to receive processed angle data
 * each frame, and `mode` to select which assessment is running.
 *
 * Layout: video and canvas are absolutely stacked inside a relative wrapper
 * so the canvas sits pixel-perfectly on top of the feed regardless of size.
 *
 * Accessibility
 * -------------
 * - The camera view has an aria-label describing its purpose.
 * - Angle labels on the canvas are mirrored in a live ARIA region below
 *   the video so screen-reader users receive real-time feedback.
 * - Start/Stop buttons meet the 44px minimum touch target.
 */

import { useCallback, useEffect, useRef } from 'react'
import type { KneeAngleResult } from '../biomechanics/angles.ts'
import { SitToStandCounter } from '../biomechanics/repCounter.ts'
import type { AssessmentMode, ProcessedFrame } from '../vision/frameProcessor.ts'
import { processFrame, resetFrameProcessor } from '../vision/frameProcessor.ts'
import type { PoseFrame } from '../vision/poseRunner.ts'
import { usePoseCamera } from '../vision/usePoseCamera.ts'
import { clearOverlay, renderOverlay } from '../vision/overlayRenderer.ts'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CameraViewProps {
  mode: AssessmentMode
  onFrameResult?: (frame: ProcessedFrame) => void
  /** Width of the camera feed. Default 640. */
  width?: number
  height?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CameraView({
  mode,
  onFrameResult,
  width  = 640,
  height = 480,
}: CameraViewProps) {

  const startTimeRef   = useRef<number | null>(null)
  const stsCounterRef  = useRef(new SitToStandCounter())
  const latestFrameRef = useRef<ProcessedFrame | null>(null)

  // Reset smoothing buffers and rep counter when mode changes
  useEffect(() => {
    resetFrameProcessor()
    stsCounterRef.current.reset()
    startTimeRef.current = null
  }, [mode])

  // ── Frame handler ────────────────────────────────────────────────────────

  const handleFrame = useCallback((raw: PoseFrame) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Sync canvas size to actual rendered video size
    const video = videoRef.current
    if (video && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width  = video.videoWidth  || width
      canvas.height = video.videoHeight || height
    }

    if (!raw.isReliable || !raw.landmarks) {
      clearOverlay(canvas)
      return
    }

    // Compute elapsed seconds for STS counter
    if (startTimeRef.current === null) startTimeRef.current = raw.timestampMs
    const elapsed = (raw.timestampMs - startTimeRef.current) / 1000

    const processed = processFrame(raw, mode, stsCounterRef.current, elapsed)
    latestFrameRef.current = processed

    // Render overlay on canvas
    renderOverlay(canvas, {
      landmarks:      raw.landmarks,
      leftKneeAngle:  processed.leftKnee?.flexionDeg ?? null,
      rightKneeAngle: processed.rightKnee?.flexionDeg ?? null,
      isReliable:     processed.isReliable,
      mirror:         true, // selfie camera — mirror for natural feel
    })

    onFrameResult?.(processed)
  }, [mode, width, height, onFrameResult])

  const { videoRef, canvasRef, status, error, startCamera, stopCamera } =
    usePoseCamera({ onFrame: handleFrame, facingMode: 'user', width, height })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Camera + overlay stack */}
      <div
        className="relative bg-gray-900 rounded-xl overflow-hidden shadow-lg"
        style={{ width, maxWidth: '100%' }}
        aria-label="Live camera view with joint angle overlay"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width:     '100%',
            height:    'auto',
            display:   'block',
            transform: 'scaleX(-1)', // mirror selfie view
          }}
          aria-hidden="true"
        />
        <canvas
          ref={canvasRef}
          style={{
            position:  'absolute',
            top: 0,
            left: 0,
            width:  '100%',
            height: '100%',
            transform: 'scaleX(-1)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        {/* Overlay status when not running */}
        {status !== 'running' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white text-center px-6">
            <StatusMessage status={status} error={error} />
          </div>
        )}
      </div>

      {/* ARIA live region — text equivalent of canvas angle labels */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="angle-live-region"
      >
        {latestFrameRef.current && renderAriaText(latestFrameRef.current)}
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap justify-center">
        {status !== 'running' ? (
          <button
            onClick={startCamera}
            disabled={status === 'initialising' || status === 'requesting'}
            className="bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-semibold px-6 py-3 rounded-lg min-h-[44px] transition-colors"
          >
            {status === 'initialising' ? 'Loading model…' :
             status === 'requesting'   ? 'Requesting camera…' :
                                         'Start Camera'}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg min-h-[44px] transition-colors"
          >
            Stop Camera
          </button>
        )}
      </div>

      {/* Setup guidance */}
      {status === 'idle' || status === 'stopped' ? (
        <SetupGuide mode={mode} />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusMessage({
  status,
  error,
}: {
  status: string
  error: string | null
}) {
  if (error) {
    return (
      <div className="text-amber-300">
        <p className="text-xl mb-2">⚠ Camera unavailable</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }
  if (status === 'initialising') {
    return (
      <div>
        <p className="text-xl mb-2 animate-pulse">Loading pose model…</p>
        <p className="text-sm text-gray-300">This takes a few seconds on first use.</p>
      </div>
    )
  }
  if (status === 'requesting') {
    return <p className="text-xl">Waiting for camera permission…</p>
  }
  return (
    <div>
      <p className="text-4xl mb-3">📷</p>
      <p className="text-lg">Press <strong>Start Camera</strong> to begin</p>
    </div>
  )
}

function SetupGuide({ mode }: { mode: AssessmentMode }) {
  const guides: Record<AssessmentMode, string[]> = {
    'knee-flexion': [
      'Position the camera 1.5–2 m away at mid-body height.',
      'Stand side-on so your full leg is visible.',
      'Slowly bend and straighten your knee to your comfortable maximum.',
    ],
    'sit-to-stand': [
      'Place the camera 1.5–2 m in front of a sturdy chair.',
      'The camera should see you from head to knee.',
      'Fold your arms across your chest. Rise and sit 5 times as smoothly as you can.',
    ],
    'hip-abduction': [
      'Stand facing the camera at 1.5–2 m distance.',
      'Hold a wall or chair back for balance if needed.',
      'Slowly lift your leg to the side and return.',
    ],
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg text-sm">
      <p className="font-semibold text-blue-800 mb-2">Setup guide</p>
      <ul className="space-y-1 text-blue-700 list-disc list-inside">
        {guides[mode].map((tip, i) => <li key={i}>{tip}</li>)}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderAriaText(frame: ProcessedFrame): string {
  const parts: string[] = []
  if (frame.leftKnee)  parts.push(`Left knee: ${Math.round(frame.leftKnee.flexionDeg)} degrees`)
  if (frame.rightKnee) parts.push(`Right knee: ${Math.round(frame.rightKnee.flexionDeg)} degrees`)
  if (frame.sts)       parts.push(`Repetitions: ${frame.sts.reps}`)
  return parts.join('. ')
}

function _angleLabel(r: KneeAngleResult): string {
  return `${r.side === 'left' ? 'L' : 'R'}: ${Math.round(r.flexionDeg)}°`
}
// suppress unused warning — used in future sessions panel
void _angleLabel
