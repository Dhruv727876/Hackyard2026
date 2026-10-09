import { useEffect, useState } from 'react'
import { RATE_BY_MATERIAL } from '@/config/rates'
import { repo } from '@/data'
import type { Pickup, Worker } from '@/domain/types'
import { formatINR, formatKg } from '@/lib/format'
import { haversineKm } from '@/lib/geo'
import { DEMO_WORKER_ID } from './constants'

interface EnrichedPickup extends Pickup {
  distance: number
}

export default function WorkerPage(): React.JSX.Element {
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let active = true

    const fetchPickups = async (): Promise<Pickup[]> => {
      try {
        if (typeof repo.listPickups === 'function') {
          const all = await repo.listPickups()
          if (all && all.length > 0) return all
        }
      } catch {
        // Fall back to listOpenPickups
      }
      return repo.listOpenPickups()
    }

    Promise.all([fetchPickups(), repo.listWorkers()])
      .then(([pickupList, workerList]) => {
        if (!active) return
        setPickups(pickupList)
        setWorkers(workerList)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshIndex])

  const worker = workers.find((w) => w.id === DEMO_WORKER_ID)

  const handleAccept = async (id: string): Promise<void> => {
    if (actionLoadingId) return
    setActionLoadingId(id)
    try {
      await repo.acceptPickup(id, DEMO_WORKER_ID)
      setRefreshIndex((prev) => prev + 1)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleComplete = async (id: string): Promise<void> => {
    if (actionLoadingId) return
    setActionLoadingId(id)
    try {
      await repo.completePickup(id)
      setRefreshIndex((prev) => prev + 1)
    } finally {
      setActionLoadingId(null)
    }
  }

  const filtered = pickups.filter(
    (p) =>
      p.status === 'requested' ||
      (p.status === 'accepted' && p.workerId === DEMO_WORKER_ID),
  )

  const enriched: EnrichedPickup[] = filtered.map((p) => {
    const distance = worker
      ? haversineKm(worker.lat, worker.lng, p.lat, p.lng)
      : 0
    return { ...p, distance }
  })

  enriched.sort((a, b) => a.distance - b.distance)

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-teal-800">Nearby jobs</h1>
        {worker && (
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            {worker.name}
          </span>
        )}
      </header>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading jobs">
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              className="h-32 animate-pulse rounded-2xl bg-slate-200/80 p-4"
            />
          ))}
        </div>
      ) : enriched.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No jobs available right now.
        </div>
      ) : (
        <div className="space-y-3">
          {enriched.map((p) => {
            const displayAddress =
              p.address.length > 30 ? `${p.address.slice(0, 30)}…` : p.address

            const materialSummary = Array.from(
              new Set(
                p.items.map(
                  (item) => RATE_BY_MATERIAL[item.material]?.displayName ?? item.material,
                ),
              ),
            ).join(', ')

            const isActionBusy = actionLoadingId === p.id

            return (
              <div
                key={p.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-teal-700">
                      {p.distance.toFixed(1)} km away
                    </span>
                    <p className="text-sm font-medium text-slate-800" title={p.address}>
                      {displayAddress}
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {p.slot}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Items: </span>
                  {materialSummary}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="text-xs font-semibold text-slate-700">
                    {formatKg(p.totalKg)} · {formatINR(p.totalValue)}
                  </div>

                  {p.status === 'requested' && (
                    <button
                      type="button"
                      disabled={isActionBusy}
                      onClick={() => void handleAccept(p.id)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isActionBusy ? 'Accepting…' : 'Accept Job'}
                    </button>
                  )}

                  {p.status === 'accepted' && (
                    <button
                      type="button"
                      disabled={isActionBusy}
                      onClick={() => void handleComplete(p.id)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isActionBusy ? 'Completing…' : 'Mark Complete'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
