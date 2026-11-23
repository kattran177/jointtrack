/**
 * ROM Assessment page — the main camera-based movement tracking screen.
 *
 * Lets the user select an assessment mode (knee flexion, sit-to-stand, or
 * hip abduction), runs the live camera view, displays real-time angle
 * readouts, and shows a session summary when they stop.
 *
 * This page does not persist data to IndexedDB yet — that is Day 4.
 * It demonstrates the full end-to-end camera → angle → display pipeline.
 */

import { useCallback, useRef, useState } from 'react'
import { CameraView } from '../components/CameraView.tsx'
import type { AssessmentMode, ProcessedFrame } from '../vision/frameProcessor.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AngleSample {
  leftDeg:  number
  rightDeg: number
  timestamp: number
}

interface SessionSummary {
  mode:          AssessmentMode
  peakLeftDeg:   number | null
  peakRightDeg:  number | null
  stsReps:       number | null
  stsTime:       number | null
  sampleCount:   number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RomAssessment() {
  const [mode, setMode]           = useState<AssessmentMode>('knee-flexion')
  const [isActive, setIsActive]   = useState(false)
  const [summary, setSummary]     = useState<SessionSummary | null>(null)
  const [liveLeft,  setLiveLeft]  = useState<number | null>(null)
  const [liveRight, setLiveRight] = useState<number | null>(null)
  const [liveReps,  setLiveReps]  = useState<number>(0)

  const samplesRef = useRef<AngleSample[]>([])

  // ── Frame result handler ─────────────────────────────────────────────────

  const handleFrame = useCallback((frame: ProcessedFrame) => {
    if (frame.leftKnee?.isPlausible) {
      setLiveLeft(frame.leftKnee.flexionDeg)
      samplesRef.current.push({
        leftDeg:   frame.leftKnee.flexionDeg,
        rightDeg:  frame.rightKnee?.flexionDeg ?? 0,
        timestamp: frame.timestampMs,
      })
    }
    if (frame.rightKnee?.isPlausible) {
      setLiveRight(frame.rightKnee.flexionDeg)
    }
    if (frame.sts) {
      setLiveReps(frame.sts.reps)
    }
  }, [])

  // ── Start / stop ─────────────────────────────────────────────────────────

  const handleStart = () => {
    samplesRef.current = []
    setSummary(null)
    setLiveLeft(null)
    setLiveRight(null)
    setLiveReps(0)
    setIsActive(true)
  }

  const handleStop = () => {
    setIsActive(false)
    const samples = samplesRef.current

    if (samples.length === 0) {
      setSummary(null)
      return
    }

    const lefts  = samples.map((s) => s.leftDeg)
    const rights = samples.map((s) => s.rightDeg)

    setSummary({
      mode,
      peakLeftDeg:  lefts.length  ? Math.max(...lefts)  : null,
      peakRightDeg: rights.length ? Math.max(...rights) : null,
      stsReps:  liveReps > 0 ? liveReps : null,
      stsTime:  null, // populated via STS completedAt in a future session
      sampleCount: samples.length,
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Movement Assessment</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Camera-based range of motion tracking. All processing happens on
          your device — no video is uploaded.
        </p>
      </div>

      {/* Mode selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 mb-3">
            Select assessment
          </legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: 'knee-flexion',  label: 'Knee Flexion / Extension' },
                { value: 'sit-to-stand',  label: '5× Sit-to-Stand'          },
                { value: 'hip-abduction', label: 'Hip Abduction'             },
              ] as { value: AssessmentMode; label: string }[]
            ).map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors min-h-[44px] text-sm font-medium
                  ${mode === value
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-teal-500'
                  }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => { setMode(value); setSummary(null) }}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Live readouts */}
      {isActive && (
        <div className="grid grid-cols-2 gap-3">
          {mode === 'knee-flexion' && (
            <>
              <AngleCard label="Left knee" value={liveLeft}  colour="emerald" />
              <AngleCard label="Right knee" value={liveRight} colour="blue"    />
            </>
          )}
          {mode === 'sit-to-stand' && (
            <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-4xl font-bold text-teal-700">{liveReps}</p>
              <p className="text-sm text-gray-500 mt-1">repetitions completed</p>
            </div>
          )}
        </div>
      )}

      {/* Camera view */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        {!isActive ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-gray-500">
              Press <strong>Begin Assessment</strong> to start the camera.
            </p>
            <button
              onClick={handleStart}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-8 py-3 rounded-lg min-h-[44px] transition-colors"
            >
              Begin Assessment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <CameraView
              mode={mode}
              onFrameResult={handleFrame}
            />
            <div className="text-center">
              <button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg min-h-[44px] transition-colors"
              >
                Finish & Save Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session summary */}
      {summary && <SessionSummaryCard summary={summary} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AngleCard({
  label,
  value,
  colour,
}: {
  label: string
  value: number | null
  colour: 'emerald' | 'blue'
}) {
  const colourClass = colour === 'emerald'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : 'text-blue-700 bg-blue-50 border-blue-200'

  return (
    <div className={`rounded-xl border p-4 text-center ${colourClass}`}>
      <p className="text-3xl font-bold">
        {value !== null ? `${Math.round(value)}°` : '—'}
      </p>
      <p className="text-sm mt-1 font-medium">{label}</p>
    </div>
  )
}

function SessionSummaryCard({ summary }: { summary: SessionSummary }) {
  const modeLabel: Record<AssessmentMode, string> = {
    'knee-flexion':  'Knee Flexion / Extension',
    'sit-to-stand':  '5× Sit-to-Stand',
    'hip-abduction': 'Hip Abduction',
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-green-700 text-lg">✓</span>
        <h2 className="font-semibold text-green-800">Session complete</h2>
      </div>
      <p className="text-sm text-green-700">
        Assessment: <strong>{modeLabel[summary.mode]}</strong>
        {' · '}{summary.sampleCount} frames captured
      </p>

      {(summary.peakLeftDeg !== null || summary.peakRightDeg !== null) && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          {summary.peakLeftDeg !== null && (
            <div className="bg-white rounded-lg border border-green-200 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">
                {Math.round(summary.peakLeftDeg)}°
              </p>
              <p className="text-xs text-gray-500 mt-1">Peak left flexion</p>
            </div>
          )}
          {summary.peakRightDeg !== null && (
            <div className="bg-white rounded-lg border border-green-200 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {Math.round(summary.peakRightDeg)}°
              </p>
              <p className="text-xs text-gray-500 mt-1">Peak right flexion</p>
            </div>
          )}
        </div>
      )}

      {summary.stsReps !== null && (
        <p className="text-green-800 font-medium">
          Sit-to-Stand repetitions: <strong>{summary.stsReps}</strong>
          {summary.stsTime !== null
            ? ` completed in ${summary.stsTime.toFixed(1)} s`
            : ''}
        </p>
      )}

      <p className="text-xs text-gray-500 border-t border-green-200 pt-3">
        Results will be saved to your device in Day 4 (IndexedDB storage).
      </p>
    </div>
  )
}
