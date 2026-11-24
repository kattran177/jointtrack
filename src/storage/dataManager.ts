/**
 * Data manager — JSON export, import, and full data deletion.
 *
 * Privacy controls required by the design spec:
 *   1. Export all local data as a JSON file (browser download)
 *   2. Import from a previously exported JSON file
 *   3. Delete all local data with a single confirmed action
 *
 * The export format is a plain JSON object with one array per table so it
 * is human-readable and can be opened in any text editor or spreadsheet.
 * It is also the input format for import, making round-trips lossless.
 *
 * No external services are involved — the file never leaves the device
 * unless the user explicitly shares it.
 */

import { db } from './db.ts'
import type {
  PromResultRecord,
  RomMeasurementRecord,
  SessionRecord,
  StsResultRecord,
} from './db.ts'

// ---------------------------------------------------------------------------
// Export types
// ---------------------------------------------------------------------------

export interface JointTrackExport {
  /** Semantic version of the export format — bump if the schema changes */
  exportVersion:   '1.0'
  exportedAt:      string
  sessions:        SessionRecord[]
  romMeasurements: RomMeasurementRecord[]
  promResults:     PromResultRecord[]
  stsResults:      StsResultRecord[]
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Collect all records from every table and return a typed export object.
 * The caller is responsible for triggering the browser download.
 */
export async function exportAllData(): Promise<JointTrackExport> {
  const [sessions, romMeasurements, promResults, stsResults] = await Promise.all([
    db.sessions.toArray(),
    db.romMeasurements.toArray(),
    db.promResults.toArray(),
    db.stsResults.toArray(),
  ])

  return {
    exportVersion:   '1.0',
    exportedAt:      new Date().toISOString(),
    sessions,
    romMeasurements,
    promResults,
    stsResults,
  }
}

/**
 * Trigger a JSON file download in the browser.
 *
 * Creates a temporary <a> element, clicks it, and removes it immediately —
 * the standard pattern for programmatic browser downloads.
 *
 * @param data   The export object to serialise
 * @param filename  Optional filename; defaults to a timestamped name
 */
export function downloadExport(
  data: JointTrackExport,
  filename?: string,
): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)

  const date = new Date().toISOString().split('T')[0]
  const name = filename ?? `jointtrack-export-${date}.json`

  const a = document.createElement('a')
  a.href     = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Parse a JSON string as a JointTrackExport and validate its structure.
 * Throws a descriptive error if the format is unrecognised.
 */
export function parseExportFile(json: string): JointTrackExport {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('File is not valid JSON.')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('exportVersion' in parsed) ||
    (parsed as JointTrackExport).exportVersion !== '1.0'
  ) {
    throw new Error(
      'Unrecognised export format. Only JointTrack v1.0 exports are supported.',
    )
  }

  return parsed as JointTrackExport
}

/**
 * Import records from a parsed export into the local database.
 *
 * Strategy: bulk-add all records, skipping any that already exist
 * (matched by their original `id`). This makes re-importing idempotent —
 * running it twice will not duplicate rows.
 *
 * Records that exist locally but are not in the import file are left
 * untouched (non-destructive merge, not a full replace).
 *
 * @returns  Counts of records added per table
 */
export async function importData(
  data: JointTrackExport,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {
    sessions: 0,
    romMeasurements: 0,
    promResults: 0,
    stsResults: 0,
  }

  await db.transaction(
    'rw',
    db.sessions,
    db.romMeasurements,
    db.promResults,
    db.stsResults,
    async () => {
      // For each table, add records whose id does not yet exist locally
      for (const session of data.sessions) {
        const exists = session.id !== undefined
          ? await db.sessions.get(session.id)
          : undefined
        if (!exists) {
          await db.sessions.add(session)
          counts.sessions++
        }
      }

      for (const rom of data.romMeasurements) {
        const exists = rom.id !== undefined
          ? await db.romMeasurements.get(rom.id)
          : undefined
        if (!exists) {
          await db.romMeasurements.add(rom)
          counts.romMeasurements++
        }
      }

      for (const prom of data.promResults) {
        const exists = prom.id !== undefined
          ? await db.promResults.get(prom.id)
          : undefined
        if (!exists) {
          await db.promResults.add(prom)
          counts.promResults++
        }
      }

      for (const sts of data.stsResults) {
        const exists = sts.id !== undefined
          ? await db.stsResults.get(sts.id)
          : undefined
        if (!exists) {
          await db.stsResults.add(sts)
          counts.stsResults++
        }
      }
    },
  )

  return counts
}

// ---------------------------------------------------------------------------
// Delete all data
// ---------------------------------------------------------------------------

/**
 * Permanently delete every record in every table.
 *
 * This is irreversible. The UI must prompt the user to confirm before
 * calling this function, and should offer an export first.
 *
 * We clear tables rather than deleting the database so that the Dexie
 * instance and schema remain intact for immediate re-use.
 */
export async function deleteAllData(): Promise<void> {
  await db.transaction(
    'rw',
    db.sessions,
    db.romMeasurements,
    db.promResults,
    db.stsResults,
    async () => {
      await Promise.all([
        db.sessions.clear(),
        db.romMeasurements.clear(),
        db.promResults.clear(),
        db.stsResults.clear(),
      ])
    },
  )
}

/**
 * Returns a count of records per table — used in the data management UI
 * to show the user how much data they have before deleting.
 */
export async function getDataCounts(): Promise<Record<string, number>> {
  const [sessions, rom, prom, sts] = await Promise.all([
    db.sessions.count(),
    db.romMeasurements.count(),
    db.promResults.count(),
    db.stsResults.count(),
  ])
  return { sessions, romMeasurements: rom, promResults: prom, stsResults: sts }
}
