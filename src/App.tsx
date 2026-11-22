/**
 * JointTrack — root application shell.
 *
 * Full routing and page components are built in later milestones.
 * This shell confirms the stack is wired correctly and displays the
 * project identity and disclaimer banner from Day 1.
 */

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Skip-nav for keyboard/screen-reader users ── */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-teal-700 text-white px-4 py-2 rounded"
      >
        Skip to main content
      </a>

      {/* ── Header ── */}
      <header className="bg-teal-700 text-white py-4 px-6 shadow">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Simple SVG joint icon placeholder */}
          <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            className="w-8 h-8 fill-current"
          >
            <circle cx="16" cy="16" r="6" />
            <line
              x1="16" y1="2" x2="16" y2="10"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            />
            <line
              x1="16" y1="22" x2="16" y2="30"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            />
            <line
              x1="2" y1="16" x2="10" y2="16"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            />
            <line
              x1="22" y1="16" x2="30" y2="16"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            />
          </svg>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">JointTrack</h1>
            <p className="text-teal-200 text-sm">
              Physiotherapy &amp; Mobility Tracking — Privacy-First
            </p>
          </div>
        </div>
      </header>

      {/* ── Safety Disclaimer Banner ── */}
      <div
        role="alert"
        aria-label="Important safety information"
        className="bg-amber-50 border-l-4 border-amber-400 px-6 py-3"
      >
        <div className="max-w-4xl mx-auto flex items-start gap-3">
          <span className="text-amber-600 text-xl" aria-hidden="true">⚠</span>
          <p className="text-amber-900 text-sm leading-snug">
            <strong>Not a medical diagnostic tool.</strong> JointTrack records
            your movement measurements and questionnaire responses to support
            conversations with your GP, physiotherapist, or orthopaedic
            specialist. It does not diagnose conditions or replace clinical
            assessment.{' '}
            <strong>
              If you have sudden severe pain, cannot bear weight, notice
              locking/catching, fever, or rapid swelling, seek medical
              attention immediately.
            </strong>
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <main id="main" className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <section className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">
            Track your joint health while you wait
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            JointTrack helps adults aged 60+ in Ireland document knee and hip
            mobility, complete validated questionnaires, and generate a clear
            summary report — all stored privately on your own device.
          </p>
        </section>

        {/* Feature cards — navigation targets for future pages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <FeatureCard
            emoji="📐"
            title="Measure ROM"
            description="Use your device camera to record knee flexion and hip movement using MediaPipe pose tracking — no video leaves your device."
            status="Coming Day 3"
          />
          <FeatureCard
            emoji="📋"
            title="Oxford Score Questionnaire"
            description="Complete the Oxford Knee Score (OKS) or Oxford Hip Score (OHS) and track your score trend over time."
            status="Coming Day 2"
          />
          <FeatureCard
            emoji="📈"
            title="Trend Charts"
            description="See how your range of motion and questionnaire scores change across sessions with clear longitudinal charts."
            status="Coming Day 5"
          />
          <FeatureCard
            emoji="📄"
            title="Clinician Report"
            description="Generate a one-page PDF summary or HL7 FHIR export to share with your GP or physiotherapist."
            status="Coming Day 6"
          />
        </div>

        {/* Architecture status badge */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 text-center">
          <p className="text-teal-800 font-medium text-lg mb-1">
            🏗 Day 1 Milestone Complete
          </p>
          <p className="text-teal-700 text-sm">
            Project scaffold, biomechanics math module (joint angle solvers,
            signal smoothing, rep counter), and 50+ unit tests passing.
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-gray-100 border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500">
        <p>
          JointTrack is open-source software released under the MIT licence.
          See{' '}
          <a href="/DISCLAIMER.md" className="underline hover:text-gray-700">
            DISCLAIMER.md
          </a>{' '}
          for full scope and safety information.
        </p>
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FeatureCardProps {
  emoji: string
  title: string
  description: string
  status: string
}

function FeatureCard({ emoji, title, description, status }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-left">
      <div className="text-3xl mb-3" aria-hidden="true">{emoji}</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4 leading-relaxed">{description}</p>
      <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
        {status}
      </span>
    </div>
  )
}

export default App
