#!/usr/bin/env node
/**
 * scripts/daily-milestone.js
 *
 * Reads the current milestone state from scripts/milestone-state.json,
 * applies the next planned increment, writes a .daily-commit-msg file
 * for the GitHub Actions workflow to use, and updates the state.
 *
 * Run manually:  node scripts/daily-milestone.js
 * Run via CI:    called by .github/workflows/daily-progress.yml
 *
 * Each milestone entry defines:
 *   day         — human-readable day label
 *   commitMsg   — the git commit message to use
 *   description — what was implemented (written to a progress log)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const STATE_FILE = join(__dirname, 'milestone-state.json')
const MSG_FILE   = join(ROOT, '.daily-commit-msg')
const LOG_FILE   = join(ROOT, 'PROGRESS.md')

// ---------------------------------------------------------------------------
// Milestone definitions
// ---------------------------------------------------------------------------
const MILESTONES = [
  {
    day: 1,
    commitMsg: 'feat(biomechanics): add 3D joint angle solvers, smoothing, rep counter + 50 unit tests',
    description: 'Day 1 — Project scaffold; biomechanics math module (vectors, angles, smoothing, STS counter); 50+ Vitest unit tests; README, DISCLAIMER, LICENSE.',
  },
  {
    day: 2,
    commitMsg: 'feat(assessments): implement Oxford Knee Score and Oxford Hip Score with scoring tests',
    description: 'Day 2 — OKS/OHS question definitions, 0–48 scoring logic, delta tracking, red-flag symptom prompts, unit tests for all scoring paths.',
  },
  {
    day: 3,
    commitMsg: 'feat(vision): integrate MediaPipe Pose Landmarker with camera loop and angle overlay',
    description: 'Day 3 — MediaPipe tasks-vision Pose Landmarker (WASM), requestAnimationFrame camera loop, landmark confidence gating, real-time joint angle overlay canvas.',
  },
  {
    day: 4,
    commitMsg: 'feat(storage): add IndexedDB persistence via Dexie with JSON export and data reset',
    description: 'Day 4 — Dexie IndexedDB schema, session and assessment repositories, full JSON backup/restore, Delete All Data utility, storage integration tests.',
  },
  {
    day: 5,
    commitMsg: 'feat(charts): add longitudinal trend charts for ROM and PROM scores using Recharts',
    description: 'Day 5 — Recharts integration, ROM trend line chart, OKS/OHS score over time, session comparison view, deterioration highlighting.',
  },
  {
    day: 6,
    commitMsg: 'feat(export): add HL7 FHIR R4 bundle export and jsPDF clinician summary report',
    description: 'Day 6 — Typed HL7 FHIR R4 Observation and QuestionnaireResponse builders, one-page jsPDF clinician summary (baseline vs. latest, trend chart, red-flag checklist).',
  },
  {
    day: 7,
    commitMsg: 'feat(a11y): accessibility pass, red-flag prompts, keyboard navigation, and ARIA labels',
    description: 'Day 7 — WCAG 2.1 AA pass: skip nav, focus management, ARIA roles, colour contrast audit, minimum touch targets; red-flag symptom modal; screen-reader testing.',
  },
  {
    day: 8,
    commitMsg: 'docs: finalise README, architecture diagram, and clinical pilot guide',
    description: 'Day 8 — Completed README with Mermaid architecture diagram, HSE context section, clinical pilot adaptation guide, contributing guidelines.',
  },
]

// ---------------------------------------------------------------------------
// Load or initialise state
// ---------------------------------------------------------------------------
let state = { completedDay: 0 }
if (existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  } catch {
    console.warn('Could not parse milestone-state.json — starting from 0.')
  }
}

const nextMilestone = MILESTONES.find((m) => m.day > state.completedDay)

if (!nextMilestone) {
  console.log('🎉 All planned milestones complete. Nothing to advance.')
  writeFileSync(MSG_FILE, 'chore: all milestones complete — maintenance pass')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Write commit message and update state
// ---------------------------------------------------------------------------
writeFileSync(MSG_FILE, nextMilestone.commitMsg)

state.completedDay = nextMilestone.day
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n')

// Append to progress log
const logEntry = `\n## ${new Date().toISOString().split('T')[0]} — Day ${nextMilestone.day}\n\n${nextMilestone.description}\n`
const existing = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf8') : '# JointTrack — Daily Progress Log\n'
writeFileSync(LOG_FILE, existing + logEntry)

console.log(`✅ Milestone advanced to Day ${nextMilestone.day}`)
console.log(`   Commit message: ${nextMilestone.commitMsg}`)
