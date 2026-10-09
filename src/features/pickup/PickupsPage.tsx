import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { repo } from '@/data'
import type { Pickup, Worker } from '@/domain/types'
import { DEMO_HOUSEHOLD_ID } from './constants'
import { ImpactCard } from './ImpactCard'
import { PickupList } from './PickupList'

export default function PickupsPage(): React.JSX.Element {
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([
      repo.listPickupsByHousehold(DEMO_HOUSEHOLD_ID),
      repo.listWorkers(),
    ])
      .then(([householdPickups, workerList]) => {
        if (!active) return
        setPickups(householdPickups)
        setWorkers(workerList)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load pickups. Please try again.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [retryCount])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-emerald-800">My pickups</h1>
        <Link
          to="/pickups/new"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          New pickup
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError(null)
              setRetryCount((c) => c + 1)
            }}
            className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <ImpactCard pickups={pickups} />
          <PickupList pickups={pickups} workers={workers} loading={loading} />
        </>
      )}
    </section>
  )
}
