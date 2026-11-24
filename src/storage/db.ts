/**
 * JointTrack IndexedDB schema — defined via Dexie.
 *
 * Dexie is a thin, well-typed wrapper around the IndexedDB API. It gives us
 * promise-based queries, versioned migrations, and compound index support
 * without the ceremony of raw IndexedDB transactions.
 *
 * Privacy note
 * ------------
 * Everything stored here lives exclusively in the user's browser. No data
 * is transmitted to any server. The user can export a full JSON backup or
 * delete everything via the controls in src/storage/dataManager.ts.
 *
 * Schema versioning
 * -----------------
 * Bump the version number and add a migration in the `upgrade` block whenever
 * the schema changes. Never alter an existing version — Dexie will not run
 * the upgrade if the user's database is already at that version.
 *
 * Table overview
 * --------------
 * sessions        — one row per assessment session (metadata + timestamps)
 * romMeasurements — ROM angle samples recorded during a session
 * promResults     — OKS / OHS questionnaire completion records
 */

import Dexie, { type Table } from 'dexie'

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

/**
 * A single assessment session.
 *
 * A session is created when the user starts a camera assessment or begins a
 * questionnaire. It is updated when they finish to record the peak values
 * and duration.
 */
export interface SessionRecord {
  /** Auto-incremented primary key */
  id?:            number
  /** ISO-8601 timestamp — when the session started */
  startedAt:      string
  /** ISO-8601 timestamp — when the session was saved */
  completedAt:    string
  /** Which assessment was performed */
  assessmentType: 'knee-flexion' | 'sit-to-stand' | 'hip-abduction' | 'oks' | 'ohs'
  /** Which side (for unilateral assessments) */
  side?:          'left' | 'right' | 'bilateral'
  /** Free-text note added by the user */
  note?:          string
}

/**
 * A single ROM measurement snapshot stored at the end of a camera session.
 *
 * We store summary statistics (peak, mean) rather than every frame's angle
 * value to keep the database compact. Raw per-frame data is never persisted.
 */
export interface RomMeasurementRecord {
  id?:            number
  /** Foreign key → sessions.id */
  sessionId:      number
  side:           'left' | 'right'
  /** Peak flexion angle reached during the session (degrees) */
  peakFlexionDeg: number
  /** Mean flexion angle across plausible frames (degrees) */
  meanFlexionDeg: number
  /** Number of reliable frames used to compute these values */
  frameCount:     number
  /** ISO-8601 timestamp */
  recordedAt:     string
}

/**
 * A completed Oxford Knee Score or Oxford Hip Score result.
 */
export interface PromResultRecord {
  id?:          number
  sessionId:    number
  instrument:   'OKS' | 'OHS'
  side:         'left' | 'right'
  /** Total score 0–48, or null if any question was unanswered */
  totalScore:   number | null
  /** JSON-serialised array of QuestionResponse objects */
  responsesJson: string
  completedAt:  string
  note?:        string
}

/**
 * A single Sit-to-Stand test result.
 */
export interface StsResultRecord {
  id?:            number
  sessionId:      number
  repsCompleted:  number
  /** Seconds to complete the target reps, or null if target not reached */
  completionTime: number | null
  /** Target rep count (usually 5) */
  targetReps:     number
  recordedAt:     string
}

// ---------------------------------------------------------------------------
// Database class
// ---------------------------------------------------------------------------

export class JointTrackDB extends Dexie {
  sessions!:        Table<SessionRecord,        number>
  romMeasurements!: Table<RomMeasurementRecord, number>
  promResults!:     Table<PromResultRecord,     number>
  stsResults!:      Table<StsResultRecord,      number>

  constructor() {
    super('JointTrackDB')

    this.version(1).stores({
      // Primary key is auto-incremented (++id)
      // Indexed fields follow, comma-separated
      sessions:        '++id, assessmentType, completedAt',
      romMeasurements: '++id, sessionId, side, recordedAt',
      promResults:     '++id, sessionId, instrument, side, completedAt',
      stsResults:      '++id, sessionId, recordedAt',
    })
  }
}

/** Singleton database instance — import this throughout the app. */
export const db = new JointTrackDB()
