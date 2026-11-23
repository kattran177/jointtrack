/**
 * Canvas overlay renderer for joint angle visualisation.
 *
 * Draws the lower-limb skeleton, joint angle arcs, and angle labels on top
 * of the live camera feed. The canvas is positioned absolutely over the
 * <video> element and sized to match it.
 *
 * Design decisions
 * ----------------
 * - All drawing is done with the 2D Canvas API — no WebGL required.
 * - Coordinates are in normalised 0–1 space from MediaPipe; we multiply by
 *   canvas width/height just before drawing so the overlay scales correctly
 *   when the user resizes the window.
 * - The renderer is a plain function (not a class or React component) so it
 *   can be called directly from the rAF callback without React re-renders.
 * - Text labels use a minimum 18px font for legibility on small screens and
 *   for users with reduced visual acuity.
 */

import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { LM } from './landmarks.ts'

// ---------------------------------------------------------------------------
// Colour constants
// ---------------------------------------------------------------------------

const COLOUR = {
  bone:        '#ffffff',      // skeleton lines
  boneAlpha:   'rgba(255,255,255,0.7)',
  kneeLeft:    '#34d399',      // emerald-400 — left knee angle
  kneeRight:   '#60a5fa',      // blue-400    — right knee angle
  reliable:    '#10b981',      // green for good tracking
  unreliable:  '#f59e0b',      // amber for degraded tracking
  label_bg:    'rgba(0,0,0,0.6)',
  label_text:  '#ffffff',
  warning_bg:  'rgba(245,158,11,0.85)',
  warning_text:'#1a1a1a',
} as const

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface OverlayData {
  landmarks:        NormalizedLandmark[]
  leftKneeAngle:    number | null
  rightKneeAngle:   number | null
  isReliable:       boolean
  /** Whether to mirror the canvas (use when facingMode='user') */
  mirror:           boolean
}

/**
 * Render one frame of the pose overlay onto the given canvas.
 *
 * Call this once per rAF tick after `detectFrame` returns.
 * Clears the previous frame before drawing.
 *
 * @param canvas  The overlay <canvas> element
 * @param data    Current frame's pose data and computed angles
 */
export function renderOverlay(
  canvas: HTMLCanvasElement,
  data: OverlayData,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)

  if (data.mirror) {
    ctx.save()
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }

  // Draw skeleton lines
  drawSkeleton(ctx, data.landmarks, width, height, data.isReliable)

  // Draw joint angle labels
  if (data.leftKneeAngle !== null) {
    drawAngleLabel(
      ctx,
      data.landmarks[LM.LEFT_KNEE],
      data.leftKneeAngle,
      'L',
      COLOUR.kneeLeft,
      width,
      height,
    )
  }
  if (data.rightKneeAngle !== null) {
    drawAngleLabel(
      ctx,
      data.landmarks[LM.RIGHT_KNEE],
      data.rightKneeAngle,
      'R',
      COLOUR.kneeRight,
      width,
      height,
    )
  }

  if (data.mirror) ctx.restore()

  // Draw tracking quality indicator (always in screen space, unmirrored)
  drawQualityBadge(ctx, data.isReliable, width, height)
}

/**
 * Clear the canvas — call when the camera stops or pose is lost.
 */
export function clearOverlay(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  ctx?.clearRect(0, 0, canvas.width, canvas.height)
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

/**
 * Bone connections to draw for the lower-limb skeleton.
 * Each pair is [proximal, distal] landmark index.
 */
const LOWER_LIMB_BONES: [number, number][] = [
  [LM.LEFT_HIP,    LM.RIGHT_HIP],
  [LM.LEFT_HIP,    LM.LEFT_KNEE],
  [LM.LEFT_KNEE,   LM.LEFT_ANKLE],
  [LM.RIGHT_HIP,   LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE,  LM.RIGHT_ANKLE],
  [LM.LEFT_ANKLE,  LM.LEFT_HEEL],
  [LM.RIGHT_ANKLE, LM.RIGHT_HEEL],
  // Shoulders for framing context
  [LM.LEFT_SHOULDER,  LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER,  LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
]

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  lms: NormalizedLandmark[],
  w: number,
  h: number,
  reliable: boolean,
): void {
  ctx.strokeStyle = reliable ? COLOUR.bone : COLOUR.unreliable
  ctx.lineWidth   = 3
  ctx.lineCap     = 'round'

  for (const [a, b] of LOWER_LIMB_BONES) {
    if (a >= lms.length || b >= lms.length) continue
    ctx.beginPath()
    ctx.moveTo(lms[a].x * w, lms[a].y * h)
    ctx.lineTo(lms[b].x * w, lms[b].y * h)
    ctx.stroke()
  }

  // Draw joint dots
  const joints = [
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ]
  for (const idx of joints) {
    if (idx >= lms.length) continue
    ctx.beginPath()
    ctx.arc(lms[idx].x * w, lms[idx].y * h, 6, 0, Math.PI * 2)
    ctx.fillStyle = reliable ? COLOUR.reliable : COLOUR.unreliable
    ctx.fill()
  }
}

function drawAngleLabel(
  ctx: CanvasRenderingContext2D,
  joint: NormalizedLandmark,
  angleDeg: number,
  side: 'L' | 'R',
  colour: string,
  w: number,
  h: number,
): void {
  const x = joint.x * w
  const y = joint.y * h

  const text = `${side}: ${Math.round(angleDeg)}°`
  const fontSize = Math.max(18, Math.round(w / 28)) // scales with canvas width
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`

  const metrics  = ctx.measureText(text)
  const padX     = 8
  const padY     = 6
  const boxW     = metrics.width + padX * 2
  const boxH     = fontSize + padY * 2
  // Position label offset from the joint — shift right for left side, left for right
  const offsetX  = side === 'L' ? 14 : -boxW - 14
  const offsetY  = -boxH / 2

  // Background pill
  ctx.fillStyle = COLOUR.label_bg
  roundRect(ctx, x + offsetX, y + offsetY, boxW, boxH, 6)
  ctx.fill()

  // Coloured left border accent
  ctx.fillStyle = colour
  roundRect(ctx, x + offsetX, y + offsetY, 4, boxH, 3)
  ctx.fill()

  // Text
  ctx.fillStyle = COLOUR.label_text
  ctx.fillText(text, x + offsetX + padX + 4, y + offsetY + padY + fontSize - 2)
}

function drawQualityBadge(
  ctx: CanvasRenderingContext2D,
  reliable: boolean,
  w: number,
  h: number,
): void {
  const text   = reliable ? '● Tracking' : '⚠ Adjust position'
  const bg     = reliable ? 'rgba(16,185,129,0.85)' : COLOUR.warning_bg
  const fg     = reliable ? '#ffffff' : COLOUR.warning_text
  const fontSize = Math.max(14, Math.round(w / 36))

  ctx.font = `${fontSize}px system-ui, sans-serif`
  const metrics = ctx.measureText(text)
  const padX = 10, padY = 6
  const boxW = metrics.width + padX * 2
  const boxH = fontSize + padY * 2

  ctx.fillStyle = bg
  roundRect(ctx, w - boxW - 12, h - boxH - 12, boxW, boxH, 8)
  ctx.fill()

  ctx.fillStyle = fg
  ctx.fillText(text, w - boxW - 12 + padX, h - boxH - 12 + padY + fontSize - 2)
}

/** Polyfill for ctx.roundRect — available in modern browsers but not all JSDOM versions */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
