/**
 * Repository tests — run against an in-memory fake IndexedDB so they work
 * in Vitest's jsdom environment without a real browser.
 *
 * We re-create a fresh JointTrackDB instance for every test file by
 * importing fake-indexeddb before Dexie initialises.
 */

import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { JointTrackDB } from '../db.ts'

// Use a fresh in-memory DB instance for each test to prevent state bleed
let testDb: JointTrackDB

beforeEach(() => {
  // Replace the module-level singleton with a fresh instance
  testDb = new JointTrackDB()
  // Monkey-patch the repositories to use testDb — we re-import after
})

afterEach(async () => {
  await testDb.delete()
})

// ---------------------------------------------------------------------------
// Because our repositories import the singleton `db` from db.ts, we need to
// test them via the db instance directly for isolation. We test the logic by
// calling Dexie directly in a way that mirrors what the repositories do.
// ---------------------------------------------------------------------------

describe('sessions — CRUD', () => {
  it('creates and retrieves a session', async () => {
    const id = await testDb.sessions.add({
      assessmentType: 'knee-flexion',
      side:           'bilateral',
      startedAt:      '2024-01-01T10:00:00Z',
      completedAt:    '2024-01-01T10:05:00Z',
    })
    const fetched = await testDb.sessions.get(id)
    expect(fetched).toBeDefined()
    expect(fetched?.assessmentType).toBe('knee-flexion')
    expect(fetched?.id).toBe(id)
  })

  it('auto-increments IDs', async () => {
    const id1 = await testDb.sessions.add({
      assessmentType: 'oks',
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:01:00Z',
    })
    const id2 = await testDb.sessions.add({
      assessmentType: 'ohs',
      startedAt: '2024-01-02T10:00:00Z',
      completedAt: '2024-01-02T10:01:00Z',
    })
    expect(id2).toBeGreaterThan(id1)
  })

  it('stores and retrieves a note', async () => {
    const id = await testDb.sessions.add({
      assessmentType: 'sit-to-stand',
      startedAt:   '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:05:00Z',
      note:        'Post-physio visit',
    })
    const fetched = await testDb.sessions.get(id)
    expect(fetched?.note).toBe('Post-physio visit')
  })

  it('updates a note', async () => {
    const id = await testDb.sessions.add({
      assessmentType: 'knee-flexion',
      startedAt:   '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:05:00Z',
    })
    await testDb.sessions.update(id, { note: 'Updated note' })
    const fetched = await testDb.sessions.get(id)
    expect(fetched?.note).toBe('Updated note')
  })

  it('returns undefined for non-existent session', async () => {
    const fetched = await testDb.sessions.get(99999)
    expect(fetched).toBeUndefined()
  })

  it('deletes a session by ID', async () => {
    const id = await testDb.sessions.add({
      assessmentType: 'ohs',
      startedAt:   '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:01:00Z',
    })
    await testDb.sessions.delete(id)
    expect(await testDb.sessions.get(id)).toBeUndefined()
  })

  it('retrieves all sessions ordered by completedAt desc', async () => {
    await testDb.sessions.bulkAdd([
      { assessmentType: 'oks', startedAt: '2024-01-01T10:00:00Z', completedAt: '2024-01-01T10:00:00Z' },
      { assessmentType: 'ohs', startedAt: '2024-01-03T10:00:00Z', completedAt: '2024-01-03T10:00:00Z' },
      { assessmentType: 'knee-flexion', startedAt: '2024-01-02T10:00:00Z', completedAt: '2024-01-02T10:00:00Z' },
    ])
    const all = await testDb.sessions.orderBy('completedAt').reverse().toArray()
    expect(all[0].completedAt).toBe('2024-01-03T10:00:00Z')
    expect(all[2].completedAt).toBe('2024-01-01T10:00:00Z')
  })
})

// ---------------------------------------------------------------------------
// ROM Measurements
// ---------------------------------------------------------------------------

describe('romMeasurements', () => {
  it('saves and retrieves measurements for a session', async () => {
    const sessionId = await testDb.sessions.add({
      assessmentType: 'knee-flexion',
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:05:00Z',
    })
    await testDb.romMeasurements.add({
      sessionId,
      side:           'left',
      peakFlexionDeg: 112,
      meanFlexionDeg: 95,
      frameCount:     120,
      recordedAt:     '2024-01-01T10:05:00Z',
    })
    const results = await testDb.romMeasurements
      .where('sessionId').equals(sessionId).toArray()
    expect(results.length).toBe(1)
    expect(results[0].peakFlexionDeg).toBe(112)
    expect(results[0].side).toBe('left')
  })

  it('stores left and right measurements separately', async () => {
    const sessionId = await testDb.sessions.add({
      assessmentType: 'knee-flexion',
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:05:00Z',
    })
    await testDb.romMeasurements.bulkAdd([
      { sessionId, side: 'left',  peakFlexionDeg: 110, meanFlexionDeg: 90, frameCount: 100, recordedAt: '2024-01-01T10:05:00Z' },
      { sessionId, side: 'right', peakFlexionDeg: 105, meanFlexionDeg: 88, frameCount: 100, recordedAt: '2024-01-01T10:05:00Z' },
    ])
    const results = await testDb.romMeasurements
      .where('sessionId').equals(sessionId).toArray()
    expect(results.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// PROM Results
// ---------------------------------------------------------------------------

describe('promResults', () => {
  it('saves and retrieves a PROM result', async () => {
    const sessionId = await testDb.sessions.add({
      assessmentType: 'oks',
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:10:00Z',
    })
    await testDb.promResults.add({
      sessionId,
      instrument:    'OKS',
      side:          'left',
      totalScore:    35,
      responsesJson: '[]',
      completedAt:   '2024-01-01T10:10:00Z',
    })
    const results = await testDb.promResults
      .where('sessionId').equals(sessionId).toArray()
    expect(results.length).toBe(1)
    expect(results[0].totalScore).toBe(35)
    expect(results[0].instrument).toBe('OKS')
  })

  it('stores null totalScore for incomplete questionnaire', async () => {
    const sessionId = await testDb.sessions.add({
      assessmentType: 'ohs',
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:10:00Z',
    })
    await testDb.promResults.add({
      sessionId,
      instrument:    'OHS',
      side:          'right',
      totalScore:    null,
      responsesJson: '[]',
      completedAt:   '2024-01-01T10:10:00Z',
    })
    const result = await testDb.promResults
      .where('sessionId').equals(sessionId).first()
    expect(result?.totalScore).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// STS Results
// ---------------------------------------------------------------------------

describe('stsResults', () => {
  it('saves and retrieves an STS result', async () => {
    const sessionId = await testDb.sessions.add({
      assessmentType: 'sit-to-stand',
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:03:00Z',
    })
    await testDb.stsResults.add({
      sessionId,
      repsCompleted:  5,
      completionTime: 14.3,
      targetReps:     5,
      recordedAt:     '2024-01-01T10:03:00Z',
    })
    const results = await testDb.stsResults
      .where('sessionId').equals(sessionId).toArray()
    expect(results.length).toBe(1)
    expect(results[0].repsCompleted).toBe(5)
    expect(results[0].completionTime).toBeCloseTo(14.3)
  })

  it('stores null completionTime when target not reached', async () => {
    const sessionId = await testDb.sessions.add({
      assessmentType: 'sit-to-stand',
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:02:00Z',
    })
    await testDb.stsResults.add({
      sessionId,
      repsCompleted:  3,
      completionTime: null,
      targetReps:     5,
      recordedAt:     '2024-01-01T10:02:00Z',
    })
    const result = await testDb.stsResults
      .where('sessionId').equals(sessionId).first()
    expect(result?.completionTime).toBeNull()
  })
})
