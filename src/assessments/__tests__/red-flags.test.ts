import { describe, expect, it } from 'vitest'
import {
  RED_FLAGS,
  findFlag,
  getEmergencyFlags,
  getUrgentFlags,
} from '../red-flags.ts'

describe('RED_FLAGS definitions', () => {
  it('contains at least 7 flags', () => {
    expect(RED_FLAGS.length).toBeGreaterThanOrEqual(7)
  })

  it('every flag has a non-empty id, label, description, and action', () => {
    RED_FLAGS.forEach((f) => {
      expect(f.id.length).toBeGreaterThan(0)
      expect(f.label.length).toBeGreaterThan(0)
      expect(f.description.length).toBeGreaterThan(0)
      expect(f.action.length).toBeGreaterThan(0)
    })
  })

  it('all flag IDs are unique', () => {
    const ids = RED_FLAGS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getEmergencyFlags', () => {
  it('returns only isEmergency=true flags', () => {
    getEmergencyFlags().forEach((f) => expect(f.isEmergency).toBe(true))
  })

  it('includes at least 4 emergency flags', () => {
    expect(getEmergencyFlags().length).toBeGreaterThanOrEqual(4)
  })

  it('includes the sudden-severe-pain flag', () => {
    const ids = getEmergencyFlags().map((f) => f.id)
    expect(ids).toContain('sudden-severe-pain')
  })
})

describe('getUrgentFlags', () => {
  it('returns only isEmergency=false flags', () => {
    getUrgentFlags().forEach((f) => expect(f.isEmergency).toBe(false))
  })
})

describe('findFlag', () => {
  it('finds a flag by ID', () => {
    const flag = findFlag('fever-with-pain')
    expect(flag).toBeDefined()
    expect(flag?.isEmergency).toBe(true)
  })

  it('returns undefined for an unknown ID', () => {
    expect(findFlag('nonexistent-flag')).toBeUndefined()
  })
})
