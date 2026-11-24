/**
 * Session service — orchestrates multi-table writes for complete sessions.
 *
 * A "save session" operation involves:
 *   1. Writing a SessionRecord (metadata)
 *   2. Writing one or two RomMeasurementRecords (left/right)
 *   3. Optionally writing an StsResultRecord
 *
 * Doing this in a Dexie transaction ensures either all three writes succeed
 * or none do — preventing orphaned measurement rows.
 *
 * This module also owns the "computed summary" types that the UI and report
 * builder consume, so neither layer needs to query multiple tables directly.
 */

import { db } from './db.ts'
import type {
  PromResultRecord,
  RomMeasurementRecord,
  SessionRecord,
  StsResultRecord,
} from './db.ts'
import {
  getAllSessions,
  getPromResultsForSession,
  getRomMeasurementsForSession,
  getStsResultsForSession,
} from './repositories.ts'

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface SaveRomSessionInput {
  assessmentType: 'knee-flexion' | 'hip-abduction'
  side:           'bilateral'
  startedAt:      string
  note?:          string
  left?: {
    peakFlexionDeg: number
    meanFlexionDeg: number
    frameCount:     number
  }
  right?: {
    peakFlexionDeg: number
    meanFlexionDeg: number
    frameCount:     number
  }
}

export interface SaveStsSessionInput {
  startedAt:      string
  repsCompleted:  number
  completionTime: number | null
  targetReps:     number
  note?:          string
}

export interface SavePromSessionInput {
  instrument:    'OKS' | 'OHS'
  side:          'left' | 'right'
  totalScore:    number | null
  responsesJson: string
  note?:         string
}

// ---------------------------------------------------------------------------
// Save helpers (transactional)
// ---------------------------------------------------------------------------

/**
 * Persist a completed ROM camera session.
 * Returns the new session's ID.
 */
export async function saveRomSession(
  input: SaveRomSessionInput,
): Promise<number> {
  const now = new Date().toISOString()
  let sessionId!: number

  await db.transaction('rw', db.sessions, db.romMeasurements, async () => {
    sessionId = await db.sessions.add({
      assessmentType: input.assessmentType,
      side:           input.side,
      startedAt:      input.startedAt,
      completedAt:    now,
      note:           input.note,
    })

    const measurementBase: Omit<RomMeasurementRecord, 'id' | 'side'> = {
      sessionId,
      frameCount:     0,
      peakFlexionDeg: 0,
      meanFlexionDeg: 0,
      recordedAt:     now,
    }

    if (input.left) {
      await db.romMeasurements.add({
        ...measurementBase,
        ...input.left,
        side: 'left',
      })
    }
    if (input.right) {
      await db.romMeasurements.add({
        ...measurementBase,
        ...input.right,
        side: 'right',
      })
    }
  })

  return sessionId
}

/**
 * Persist a completed 5× Sit-to-Stand session.
 */
export async function saveStsSession(
  input: SaveStsSessionInput,
): Promise<number> {
  const now = new Date().toISOString()
  let sessionId!: number

  await db.transaction('rw', db.sessions, db.stsResults, async () => {
    sessionId = await db.sessions.add({
      assessmentType: 'sit-to-stand',
      side:           'bilateral',
      startedAt:      input.startedAt,
      completedAt:    now,
      note:           input.note,
    })

    await db.stsResults.add({
      sessionId,
      repsCompleted:  input.repsCompleted,
      completionTime: input.completionTime,
      targetReps:     input.targetReps,
      recordedAt:     now,
    })
  })

  return sessionId
}

/**
 * Persist a completed Oxford questionnaire result.
 */
export async function savePromSession(
  input: SavePromSessionInput,
): Promise<number> {
  const now = new Date().toISOString()
  let sessionId!: number

  await db.transaction('rw', db.sessions, db.promResults, async () => {
    sessionId = await db.sessions.add({
      assessmentType: input.instrument === 'OKS' ? 'oks' : 'ohs',
      side:           input.side,
      startedAt:      now,
      completedAt:    now,
      note:           input.note,
    })

    await db.promResults.add({
      sessionId,
      instrument:    input.instrument,
      side:          input.side,
      totalScore:    input.totalScore,
      responsesJson: input.responsesJson,
      completedAt:   now,
      note:          input.note,
    })
  })

  return sessionId
}

// ---------------------------------------------------------------------------
// Summary query
// ---------------------------------------------------------------------------

/**
 * Full denormalised summary for one session — used by the report builder
 * and the session detail view.
 */
export interface SessionSummary {
  session:      SessionRecord
  romLeft?:     RomMeasurementRecord
  romRight?:    RomMeasurementRecord
  sts?:         StsResultRecord
  prom?:        PromResultRecord
}

export async function getSessionSummary(
  sessionId: number,
): Promise<SessionSummary | null> {
  const session = await db.sessions.get(sessionId)
  if (!session) return null

  const [roms, stsList, proms] = await Promise.all([
    getRomMeasurementsForSession(sessionId),
    getStsResultsForSession(sessionId),
    getPromResultsForSession(sessionId),
  ])

  return {
    session,
    romLeft:  roms.find((r) => r.side === 'left'),
    romRight: roms.find((r) => r.side === 'right'),
    sts:      stsList[0],
    prom:     proms[0],
  }
}

/**
 * Returns all sessions with their primary measurement records,
 * most-recent first. Used by the history list and trend chart.
 */
export async function getAllSessionSummaries(): Promise<SessionSummary[]> {
  const sessions = await getAllSessions()
  return Promise.all(
    sessions.map((s) => getSessionSummary(s.id!)),
  ).then((results) => results.filter((r): r is SessionSummary => r !== null))
}
