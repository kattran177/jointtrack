/**
 * dataManager tests — export format validation and import/delete logic.
 *
 * We test parseExportFile and the shape of exportAllData output independently
 * of the browser download (downloadExport triggers a DOM side-effect we skip).
 */

import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { JointTrackDB } from '../db.ts'
import { parseExportFile, type JointTrackExport } from '../dataManager.ts'

let testDb: JointTrackDB

afterEach(async () => {
  if (testDb) await testDb.delete()
})

// ---------------------------------------------------------------------------
// parseExportFile
// ---------------------------------------------------------------------------

describe('parseExportFile', () => {
  it('parses a valid v1.0 export', () => {
    const valid: JointTrackExport = {
      exportVersion:   '1.0',
      exportedAt:      '2024-01-01T10:00:00Z',
      sessions:        [],
      romMeasurements: [],
      promResults:     [],
      stsResults:      [],
    }
    const result = parseExportFile(JSON.stringify(valid))
    expect(result.exportVersion).toBe('1.0')
    expect(Array.isArray(result.sessions)).toBe(true)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseExportFile('not json{')).toThrow('not valid JSON')
  })

  it('throws on missing exportVersion', () => {
    const noVersion = JSON.stringify({ sessions: [] })
    expect(() => parseExportFile(noVersion)).toThrow()
  })

  it('throws on wrong exportVersion', () => {
    const wrongVersion = JSON.stringify({ exportVersion: '2.0', sessions: [] })
    expect(() => parseExportFile(wrongVersion)).toThrow()
  })

  it('preserves all table arrays in the parsed result', () => {
    const data: JointTrackExport = {
      exportVersion:   '1.0',
      exportedAt:      '2024-01-10T10:00:00Z',
      sessions:        [{ id: 1, assessmentType: 'oks', startedAt: '2024-01-01T10:00:00Z', completedAt: '2024-01-01T10:01:00Z' }],
      romMeasurements: [{ id: 1, sessionId: 1, side: 'left', peakFlexionDeg: 100, meanFlexionDeg: 85, frameCount: 50, recordedAt: '2024-01-01T10:01:00Z' }],
      promResults:     [],
      stsResults:      [],
    }
    const result = parseExportFile(JSON.stringify(data))
    expect(result.sessions.length).toBe(1)
    expect(result.romMeasurements[0].peakFlexionDeg).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Schema integrity
// ---------------------------------------------------------------------------

describe('JointTrackDB schema', () => {
  it('opens without error', async () => {
    testDb = new JointTrackDB()
    await expect(testDb.open()).resolves.toBeDefined()
  })

  it('has all four expected tables', async () => {
    testDb = new JointTrackDB()
    await testDb.open()
    const tableNames = testDb.tables.map((t) => t.name)
    expect(tableNames).toContain('sessions')
    expect(tableNames).toContain('romMeasurements')
    expect(tableNames).toContain('promResults')
    expect(tableNames).toContain('stsResults')
  })

  it('sessions table supports bulkAdd', async () => {
    testDb = new JointTrackDB()
    await testDb.open()
    const ids = await testDb.sessions.bulkAdd([
      { assessmentType: 'knee-flexion', startedAt: '2024-01-01T10:00:00Z', completedAt: '2024-01-01T10:01:00Z' },
      { assessmentType: 'ohs',          startedAt: '2024-01-02T10:00:00Z', completedAt: '2024-01-02T10:01:00Z' },
    ], { allKeys: true })
    expect(ids.length).toBe(2)
  })
})
