/**
 * DataManager — privacy controls UI component.
 *
 * Displays:
 *   - Data summary (record counts per table)
 *   - Export all data as JSON button
 *   - Import from JSON file button
 *   - Delete all data button (with confirmation dialog)
 *
 * This component is shown in the Settings / Privacy page. It has no
 * knowledge of what the data means — it delegates entirely to dataManager.ts.
 *
 * Accessibility
 * -------------
 * The delete confirmation uses a role="dialog" region rather than
 * window.confirm() so it is accessible to screen readers and respects
 * system font sizes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteAllData,
  downloadExport,
  exportAllData,
  getDataCounts,
  parseExportFile,
  importData,
} from '../storage/dataManager.ts'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataManager() {
  const [counts,    setCounts]    = useState<Record<string, number> | null>(null)
  const [status,    setStatus]    = useState<string | null>(null)
  const [isError,   setIsError]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy,      setBusy]      = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const refreshCounts = useCallback(async () => {
    const c = await getDataCounts()
    setCounts(c)
  }, [])

  useEffect(() => { void refreshCounts() }, [refreshCounts])

  const totalRecords = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : 0

  // ── Export ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const data = await exportAllData()
      downloadExport(data)
      setStatus(`Exported ${totalRecords} records successfully.`)
      setIsError(false)
    } catch (err) {
      setStatus(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  // ── Import ───────────────────────────────────────────────────────────────

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setStatus(null)
    try {
      const text   = await file.text()
      const parsed = parseExportFile(text)
      const added  = await importData(parsed)
      const total  = Object.values(added).reduce((a, b) => a + b, 0)
      setStatus(`Imported ${total} new records.`)
      setIsError(false)
      await refreshCounts()
    } catch (err) {
      setStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
      setIsError(true)
    } finally {
      setBusy(false)
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Delete all ───────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    setBusy(true)
    setShowConfirm(false)
    setStatus(null)
    try {
      await deleteAllData()
      setStatus('All local data deleted.')
      setIsError(false)
      await refreshCounts()
    } catch (err) {
      setStatus(`Delete failed: ${err instanceof Error ? err.message : String(err)}`)
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Data summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Your data</h2>
        {counts === null ? (
          <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CountTile label="Sessions"       value={counts.sessions}        />
            <CountTile label="ROM readings"   value={counts.romMeasurements} />
            <CountTile label="Questionnaires" value={counts.promResults}     />
            <CountTile label="STS tests"      value={counts.stsResults}      />
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          All data is stored locally in your browser (IndexedDB). Nothing is uploaded.
        </p>
      </div>

      {/* Action buttons */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 mb-1">Privacy controls</h2>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={busy || totalRecords === 0}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-teal-300 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-left"
        >
          <span className="text-xl" aria-hidden="true">⬇️</span>
          <div>
            <p className="font-medium text-teal-800 text-sm">Export all data (JSON)</p>
            <p className="text-teal-600 text-xs">
              Downloads a backup file you can re-import or share with a clinician.
            </p>
          </div>
        </button>

        {/* Import */}
        <button
          onClick={handleImportClick}
          disabled={busy}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-left"
        >
          <span className="text-xl" aria-hidden="true">⬆️</span>
          <div>
            <p className="font-medium text-blue-800 text-sm">Import from JSON backup</p>
            <p className="text-blue-600 text-xs">
              Merges a previous export into your current data. Duplicates are skipped.
            </p>
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Select JSON backup file to import"
          onChange={handleFileChange}
        />

        {/* Delete */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={busy || totalRecords === 0}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-left"
        >
          <span className="text-xl" aria-hidden="true">🗑️</span>
          <div>
            <p className="font-medium text-red-800 text-sm">Delete all local data</p>
            <p className="text-red-600 text-xs">
              Permanently removes all sessions, measurements, and questionnaire results.
            </p>
          </div>
        </button>
      </div>

      {/* Status message */}
      {status && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg px-4 py-3 text-sm ${
            isError
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {status}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showConfirm && (
        <DeleteConfirmDialog
          totalRecords={totalRecords}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
      <p className="text-2xl font-bold text-teal-700">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function DeleteConfirmDialog({
  totalRecords,
  onConfirm,
  onCancel,
}: {
  totalRecords: number
  onConfirm:   () => void
  onCancel:    () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3
          id="delete-dialog-title"
          className="text-lg font-semibold text-gray-800"
        >
          Delete all data?
        </h3>
        <p className="text-sm text-gray-600">
          This will permanently delete <strong>{totalRecords} records</strong> from
          your device. This action cannot be undone.
        </p>
        <p className="text-sm text-gray-500">
          We recommend exporting a backup first.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors min-h-[44px]"
          >
            Delete everything
          </button>
        </div>
      </div>
    </div>
  )
}
