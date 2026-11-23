/**
 * React hook: usePoseCamera
 *
 * Manages the full lifecycle of the camera + MediaPipe pose loop:
 *   1. Requests camera permission via getUserMedia
 *   2. Initialises the PoseLandmarker (downloads WASM + model once)
 *   3. Runs a requestAnimationFrame loop calling detectFrame on each tick
 *   4. Publishes the latest PoseFrame to consumers via a ref-backed callback
 *   5. Cleans up the stream and cancels the rAF loop on unmount
 *
 * Usage
 * -----
 * ```tsx
 * const { videoRef, canvasRef, status, error, startCamera, stopCamera } =
 *   usePoseCamera({ onFrame: handlePoseFrame })
 *
 * // Attach refs to DOM elements:
 * <video ref={videoRef} autoPlay playsInline muted />
 * <canvas ref={canvasRef} />
 * ```
 *
 * The hook never stores video frames — only the computed PoseFrame object
 * (landmark coordinates + reliability flag) is passed to the callback.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PoseFrame } from './poseRunner.ts'
import {
  disposePoseLandmarker,
  initialisePoseLandmarker,
  detectFrame,
} from './poseRunner.ts'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CameraStatus =
  | 'idle'          // hook just mounted, nothing started
  | 'initialising'  // loading WASM + model
  | 'requesting'    // waiting for getUserMedia permission
  | 'running'       // rAF loop active
  | 'stopped'       // cleanly stopped by caller
  | 'error'         // unrecoverable error (see `error` field)

export interface UsePoseCameraOptions {
  /** Called once per frame with the latest pose detection result */
  onFrame: (frame: PoseFrame) => void
  /**
   * Camera facing mode. 'user' (selfie) is easier to position for sitting
   * assessments; 'environment' (rear) gives better depth for standing tests.
   * Default: 'user'
   */
  facingMode?: 'user' | 'environment'
  /**
   * Ideal video resolution. MediaPipe Lite works well at 640×480.
   * The browser may choose a different resolution if the camera doesn't
   * support the requested one.
   */
  width?: number
  height?: number
}

export interface UsePoseCameraReturn {
  videoRef:    React.RefObject<HTMLVideoElement | null>
  canvasRef:   React.RefObject<HTMLCanvasElement | null>
  status:      CameraStatus
  error:       string | null
  startCamera: () => Promise<void>
  stopCamera:  () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePoseCamera({
  onFrame,
  facingMode = 'user',
  width = 640,
  height = 480,
}: UsePoseCameraOptions): UsePoseCameraReturn {
  const videoRef  = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error,  setError]  = useState<string | null>(null)

  // Stable ref to the latest onFrame callback so the rAF loop doesn't
  // need to be restarted every time the parent re-renders.
  const onFrameRef = useRef(onFrame)
  useEffect(() => { onFrameRef.current = onFrame }, [onFrame])

  // rAF handle + stream stored in refs so cleanup is reliable even if the
  // component unmounts before the async init resolves.
  const rafRef        = useRef<number | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const runningRef    = useRef(false)

  // ---------------------------------------------------------------------------
  // rAF loop
  // ---------------------------------------------------------------------------

  const runLoop = useCallback(() => {
    const video     = videoRef.current
    const landmarker = landmarkerRef.current

    if (!video || !landmarker || !runningRef.current) return

    // Skip frames where the video hasn't started playing yet
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const frame = detectFrame(landmarker, video, performance.now())
      onFrameRef.current(frame)
    }

    rafRef.current = requestAnimationFrame(runLoop)
  }, [])

  // ---------------------------------------------------------------------------
  // Public: startCamera
  // ---------------------------------------------------------------------------

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      setStatus('initialising')

      // 1. Load MediaPipe WASM + model (cached after first load)
      const lm = await initialisePoseLandmarker()
      landmarkerRef.current = lm

      setStatus('requesting')

      // 2. Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width:  { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      })
      streamRef.current = stream

      // 3. Attach stream to video element
      const video = videoRef.current
      if (!video) throw new Error('Video element not mounted')
      video.srcObject = stream
      await video.play()

      // 4. Kick off inference loop
      runningRef.current = true
      setStatus('running')
      rafRef.current = requestAnimationFrame(runLoop)

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Surface user-friendly messages for the two most common failures
      if (message.toLowerCase().includes('permission') ||
          message.toLowerCase().includes('notallowed')) {
        setError('Camera permission was denied. Please allow camera access and try again.')
      } else if (message.toLowerCase().includes('notfound') ||
                 message.toLowerCase().includes('devicenotfound')) {
        setError('No camera found. Please connect a camera and try again.')
      } else {
        setError(`Could not start camera: ${message}`)
      }
      setStatus('error')
    }
  }, [facingMode, width, height, runLoop])

  // ---------------------------------------------------------------------------
  // Public: stopCamera
  // ---------------------------------------------------------------------------

  const stopCamera = useCallback(() => {
    runningRef.current = false

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    // Stop all camera tracks to turn off the hardware indicator light
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setStatus('stopped')
  }, [])

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      runningRef.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      // Don't dispose the landmarker singleton here — it may be reused if
      // the component remounts. Call disposePoseLandmarker() only on full
      // app teardown.
    }
  }, [])

  return { videoRef, canvasRef, status, error, startCamera, stopCamera }
}

// Re-export for consumers that need it
export { disposePoseLandmarker }
