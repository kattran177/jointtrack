/**
 * Privacy & Data page — surfaces the DataManager component and explains
 * JointTrack's privacy model in plain language.
 */

import { DataManager } from '../components/DataManager.tsx'

export function Privacy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Privacy &amp; Your Data</h1>
        <p className="text-gray-500 mt-1 text-sm">
          All your data lives on this device. Here is what is stored and how to manage it.
        </p>
      </div>

      {/* How data is stored */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-blue-800">How JointTrack stores data</h2>
        <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
          <li>
            <strong>No video is ever stored.</strong> The camera feed is processed
            live in your browser and immediately discarded — only the computed
            angle numbers are kept.
          </li>
          <li>
            <strong>Everything stays on this device.</strong> Session data is saved
            to your browser's IndexedDB storage, which is local to this browser
            on this device. No data is sent to any server.
          </li>
          <li>
            <strong>You are in control.</strong> Export a full JSON backup at any
            time, transfer it to another device by importing it, or delete
            everything with one click.
          </li>
          <li>
            <strong>Clearing browser data removes JointTrack data.</strong> If you
            use your browser's "clear site data" or private/incognito mode,
            your sessions will be lost. Export a backup first.
          </li>
        </ul>
      </div>

      {/* Data manager controls */}
      <DataManager />
    </div>
  )
}
