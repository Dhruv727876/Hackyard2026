import { useState } from 'react'
import { SCAN_CONFIG } from '@/config/scan'
import type { ScrapItemInput } from '@/domain/types'
import { validateImageFile } from '@/lib/image'
import type { ScanOutcome } from '@/services/scanContract'
import { scanScrap } from '@/services/scanService'
import { PhotoPicker } from './PhotoPicker'
import { ScanResults } from './ScanResults'

export type ScanPhase = 'pick' | 'scanning' | 'results'

export default function ScanPage(): React.JSX.Element {
  const [files, setFiles] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<{ name: string; reason: string }[]>([])
  const [phase, setPhase] = useState<ScanPhase>('pick')
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null)
  const [items, setItems] = useState<ScrapItemInput[]>([])

  const handleAddFiles = (incoming: File[]): void => {
    const newErrors: { name: string; reason: string }[] = []
    const newValidFiles: File[] = []

    let currentCount = files.length
    for (const file of incoming) {
      const validation = validateImageFile(file)
      if (!validation.ok) {
        newErrors.push({ name: file.name, reason: validation.reason })
        continue
      }

      if (currentCount >= SCAN_CONFIG.maxImages) {
        newErrors.push({
          name: file.name,
          reason: 'You can add up to 3 photos per scan.',
        })
        continue
      }

      newValidFiles.push(file)
      currentCount += 1
    }

    if (newValidFiles.length > 0) {
      setFiles((prev) => [...prev, ...newValidFiles])
    }
    if (newErrors.length > 0) {
      setFileErrors((prev) => [...prev, ...newErrors])
    }
  }

  const handleRemoveFile = (index: number): void => {
    const removed = files[index]
    setFiles((prev) => prev.filter((_, i) => i !== index))
    if (removed) {
      setFileErrors((prev) =>
        prev.filter(
          (err) =>
            err.name !== removed.name &&
            err.reason !== 'You can add up to 3 photos per scan.',
        ),
      )
    }
  }

  const handleScan = async (): Promise<void> => {
    if (files.length === 0 || phase === 'scanning') return
    setPhase('scanning')
    setOutcome(null)

    try {
      const res = await scanScrap(files)
      setOutcome(res)
      if (res.kind === 'ok') {
        if (res.result.items.length === 0) {
          setOutcome({ kind: 'retry', reason: 'unclear' })
          setPhase('pick')
        } else {
          setItems(res.result.items)
          setPhase('results')
        }
      } else {
        setPhase('pick')
      }
    } catch {
      setOutcome({ kind: 'retry', reason: 'unclear' })
      setPhase('pick')
    }
  }

  const handleScanAgain = (): void => {
    setFiles([])
    setFileErrors([])
    setItems([])
    setOutcome(null)
    setPhase('pick')
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-emerald-800">Scan your scrap</h1>
        <p className="text-sm text-slate-600">
          Photograph household scrap to get an indicative material, weight and value
          estimate.
        </p>
      </header>

      {phase !== 'results' && (
        <div className="space-y-4">
          <PhotoPicker
            files={files}
            errors={fileErrors}
            disabled={phase === 'scanning'}
            onAdd={handleAddFiles}
            onRemove={handleRemoveFile}
          />

          {outcome?.kind === 'retry' && (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              {outcome.reason === 'unclear' ? (
                <>
                  <p className="font-medium">
                    We couldn't clearly spot scrap in these photos. Try better lighting,
                    a plain background, or move closer.
                  </p>
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={files.length === 0 || phase === 'scanning'}
                    className="min-h-[44px] rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-50"
                  >
                    Retry scan
                  </button>
                </>
              ) : (
                <p className="font-medium">
                  Please wait a few seconds before scanning again.
                </p>
              )}
            </div>
          )}

          {phase === 'scanning' && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 py-2 text-emerald-800"
            >
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <span className="text-sm font-medium">Analysing your photos…</span>
            </div>
          )}

          <button
            type="button"
            aria-label="Scan scrap"
            disabled={files.length === 0 || phase === 'scanning'}
            onClick={handleScan}
            className="min-h-[44px] w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {phase === 'scanning' ? 'Analysing your photos…' : 'Scan scrap'}
          </button>
        </div>
      )}

      {phase === 'results' && (
        <div className="space-y-4">
          {outcome?.kind === 'ok' && outcome.source === 'sample' && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <span className="rounded-full bg-amber-200 px-2 py-0.5 font-semibold text-amber-900">
                Sample result
              </span>
              <span className="text-slate-600">
                Gemini wasn't reachable, so this demo result is shown.
              </span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-sm text-slate-600">No scrap detected</p>
              <button
                type="button"
                onClick={handleScanAgain}
                className="min-h-[44px] w-full rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                Scan again
              </button>
            </div>
          ) : (
            <>
              <ScanResults items={items} onChange={setItems} />
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="min-h-[44px] w-full rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  Scan again
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
