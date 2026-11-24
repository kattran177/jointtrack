/**
 * Repository functions — typed read/write operations for every table.
 *
 * Each function wraps a Dexie call with:
 *   - explicit TypeScript return types so callers never receive `any`
 *   - sensible defaults for optional fields
 *   - no business logic — repositories are pure data-access
 *
 * Business logic (e.g. "compute peak from frames", "build a session summary")
 * lives in the session service (sessionService.ts), not here.
 */

import { db } from './db.ts'
import type {
  PromResultRecord,
  RomMeasurementRecord,
  SessionRecord,
  StsResultRecord,
} from './db.ts'

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(
  data: Omit<SessionRecord, 'id'>,
): Promise<number> {
  return db.sessions.add(data)
}

export async function getSession(id: number): Promise<SessionRecord | undefined> {
  return db.sessions.get(id)
}

export async function getAllSessions(): Promise<SessionRecord[]> {
  // Most-recent first
  return db.sessions.orderBy('completedAt').reverse().toArray()
}

export async function getSessionsByType(
  type: SessionRecord['assessmentType'],
): Promise<SessionRecord[]> {
  return db.sessions
    .where('assessmentType').equals(type)
    .reverse()
    .sortBy('completedAt')
}

export async function updateSessionNote(
  id: number,
  note: string,
): Promise<void> {
  await db.sessions.update(id, { note })
}

export async function deleteSession(id: number): Promise<void> {
  // Cascade-delete all measurements linked to this session
  await Promise.all([
    db.romMeasurements.where('sessionId').equals(id).delete(),
    db.promResults.where('sessionId').equals(id).delete(),
    db.stsResults.where('sessionId').equals(id).delete(),
  ])
  await db.sessions.delete(id)
}

// ---------------------------------------------------------------------------
// ROM Measurements
// ---------------------------------------------------------------------------

export async function saveRomMeasurement(
  data: Omit<RomMeasurementRecord, 'id'>,
): Promise<number> {
  return db.romMeasurements.add(data)
}

export async function getRomMeasurementsForSession(
  sessionId: number,
): Promise<RomMeasurementRecord[]> {
  return db.romMeasurements.where('sessionId').equals(sessionId).toArray()
}

/**
 * Return all ROM measurements for a given side, ordered by date.
 * Used to build the longitudinal trend chart.
 */
export async function getRomTrend(
  side: 'left' | 'right',
): Promise<RomMeasurementRecord[]> {
  return db.romMeasurements
    .where('side').equals(side)
    .sortBy('recordedAt')
}

// ---------------------------------------------------------------------------
// PROM Results
// ---------------------------------------------------------------------------

export async function savePromResult(
  data: Omit<PromResultRecord, 'id'>,
): Promise<number> {
  return db.promResults.add(data)
}

export async function getPromResultsForSession(
  sessionId: number,
): Promise<PromResultRecord[]> {
  return db.promResults.where('sessionId').equals(sessionId).toArray()
}

/**
 * Return all PROM results for an instrument + side, ordered by date.
 * Used to build the OKS/OHS score trend chart.
 */
export async function getPromTrend(
  instrument: 'OKS' | 'OHS',
  side: 'left' | 'right',
): Promise<PromResultRecord[]> {
  return db.promResults
    .where('[instrument+side]')
    .equals([instrument, side])
    .sortBy('completedAt')
    .catch(() =>
      // Fallback for environments where compound index isn't available
      db.promResults
        .filter((r) => r.instrument === instrument && r.side === side)
        .sortBy('completedAt'),
    )
}

export async function getLatestPromResult(
  instrument: 'OKS' | 'OHS',
  side: 'left' | 'right',
): Promise<PromResultRecord | undefined> {
  const all = await getPromTrend(instrument, side)
  return all[all.length - 1]
}

// ---------------------------------------------------------------------------
// STS Results
// ---------------------------------------------------------------------------

export async function saveStsResult(
  data: Omit<StsResultRecord, 'id'>,
): Promise<number> {
  return db.stsResults.add(data)
}

export async function getStsTrend(): Promise<StsResultRecord[]> {
  return db.stsResults.orderBy('recordedAt').toArray()
}

export async function getStsResultsForSession(
  sessionId: number,
): Promise<StsResultRecord[]> {
  return db.stsResults.where('sessionId').equals(sessionId).toArray()
}
