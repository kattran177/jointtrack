/**
 * JointTrack — root application shell with simple tab-based navigation.
 *
 * Full routing (React Router) will be added in a later milestone once more
 * pages exist. For now a lightweight tab state keeps things simple.
 */

import { useState } from 'react'
import { Privacy } from './pages/Privacy.tsx'
import { RomAssessment } from './pages/RomAssessment.tsx'

type Page = 'home' | 'rom' | 'questionnaire' | 'trends' | 'report' | 'privacy'

function App() {
  const [page, setPage] = useState<Page>('home')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Skip-nav ── */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-teal-700 text-white px-4 py-2 rounded"
      >
        Skip to main content
      </a>

      {/* ── Header ── */}
      <header className="bg-teal-700 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <svg aria-hidden="true" viewBox="0 0 32 32" className="w-7 h-7 fill-current flex-shrink-0">
            <circle cx="16" cy="16" r="6" />
            <line x1="16" y1="2"  x2="16" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="16" y1="22" x2="16" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="2"  y1="16" x2="10" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="22" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="text-xl font-semibold leading-tight">JointTrack</h1>
            <p className="text-teal-200 text-xs">Privacy-First Mobility Tracking</p>
          </div>
        </div>

        {/* ── Nav tabs ── */}
        <nav aria-label="Main navigation" className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {(
            [
              { id: 'home',          label: 'Home'                        },
              { id: 'rom',           label: '📐 Measure ROM'               },
              { id: 'questionnaire', label: '📋 Questionnaire (Day 2 UI)'  },
              { id: 'trends',        label: '📈 Trends (Day 5)'            },
              { id: 'report',        label: '📄 Report (Day 6)'            },
              { id: 'privacy',       label: '🔒 Privacy & Data'            },
            ] as { id: Page; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              aria-current={page === id ? 'page' : undefined}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors min-h-[44px]
                ${page === id
                  ? 'bg-white text-teal-800'
                  : 'text-teal-100 hover:text-white hover:bg-teal-600'
                }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Safety Disclaimer Banner ── */}
      <div
        role="alert"
        aria-label="Important safety information"
        className="bg-amber-50 border-b border-amber-200 px-4 py-2"
      >
        <div className="max-w-4xl mx-auto flex items-start gap-2">
          <span className="text-amber-600 flex-shrink-0" aria-hidden="true">⚠</span>
          <p className="text-amber-900 text-xs leading-snug">
            <strong>Not a diagnostic tool.</strong> JointTrack records measurements to support
            clinician conversations only.{' '}
            <strong>Seek immediate medical attention</strong> for sudden severe pain, inability
            to bear weight, joint locking, fever with swelling, or signs of DVT.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <main id="main" className="flex-1">
        {page === 'home'          && <HomePage onNavigate={setPage} />}
        {page === 'rom'           && <RomAssessment />}
        {page === 'questionnaire' && <ComingSoon title="Questionnaire" day={2} note="Oxford Knee/Hip Score (OKS/OHS) — logic and tests already built in src/assessments/. UI coming Day 2." />}
        {page === 'trends'        && <ComingSoon title="Trend Charts"   day={5} />}
        {page === 'report'        && <ComingSoon title="Clinician Report" day={6} />}
        {page === 'privacy'       && <Privacy />}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-gray-100 border-t border-gray-200 py-3 px-4 text-center text-xs text-gray-500">
        JointTrack — open-source, MIT licence. See{' '}
        <button
          onClick={() => alert('See DISCLAIMER.md in the project repository for full scope and safety information.')}
          className="underline hover:text-gray-700"
        >
          disclaimer
        </button>.
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

function HomePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Track your joint health while you wait
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
          JointTrack helps adults aged 60+ in Ireland document knee and hip mobility,
          complete validated questionnaires, and generate a clear summary — all stored
          privately on your own device, nothing uploaded.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FeatureCard
          emoji="📐"
          title="Measure ROM"
          description="Live camera pose tracking for knee flexion, sit-to-stand, and hip abduction. No video stored or sent."
          status="✅ Ready"
          statusClass="bg-green-100 text-green-700"
          onClick={() => onNavigate('rom')}
          actionLabel="Open"
        />
        <FeatureCard
          emoji="📋"
          title="Oxford Score (OKS/OHS)"
          description="12-item knee or hip questionnaire with score trend tracking. Logic and tests already built."
          status="🔜 Day 2 UI"
          statusClass="bg-gray-100 text-gray-500"
        />
        <FeatureCard
          emoji="📈"
          title="Trend Charts"
          description="Longitudinal ROM and PROM score charts across all your sessions."
          status="🔜 Day 5"
          statusClass="bg-gray-100 text-gray-500"
        />
        <FeatureCard
          emoji="📄"
          title="Clinician Report"
          description="One-page PDF + HL7 FHIR export for your GP, physio, or specialist."
          status="🔜 Day 6"
          statusClass="bg-gray-100 text-gray-500"
        />
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 text-center">
        <p className="text-teal-800 font-semibold mb-1">🏗 Day 4 Milestone Complete</p>
        <p className="text-teal-700 text-sm">
          IndexedDB persistence via Dexie — sessions, ROM measurements, STS results, and
          PROM records all saved locally. JSON export, import, and Delete All Data controls
          live in the Privacy &amp; Data tab. 134 unit tests still passing.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

interface FeatureCardProps {
  emoji: string
  title: string
  description: string
  status: string
  statusClass: string
  onClick?: () => void
  actionLabel?: string
}

function FeatureCard({
  emoji, title, description, status, statusClass, onClick, actionLabel,
}: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-left flex flex-col gap-3">
      <div className="text-2xl" aria-hidden="true">{emoji}</div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass}`}>
          {status}
        </span>
        {onClick && (
          <button
            onClick={onClick}
            className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold px-4 py-2 rounded-lg min-h-[44px] transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function ComingSoon({ title, day, note }: { title: string; day: number; note?: string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
      <p className="text-5xl">🔜</p>
      <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
      <p className="text-gray-500 text-sm">Coming in Day {day} milestone.</p>
      {note && <p className="text-gray-400 text-xs max-w-md mx-auto">{note}</p>}
    </div>
  )
}

export default App
