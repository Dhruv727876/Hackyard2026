import { Link } from 'react-router-dom'
import { RATE_BY_MATERIAL } from '@/config/rates'
import type { Pickup, PickupStatus, Worker } from '@/domain/types'
import { effectiveKg } from '@/domain/valuation'
import { formatINR, formatKg } from '@/lib/format'

export interface PickupListProps {
  pickups: Pickup[]
  loading: boolean
  workers: Worker[]
}

function StatusBadge({ status }: { status: PickupStatus }): React.JSX.Element {
  switch (status) {
    case 'requested':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          Requested
        </span>
      )
    case 'accepted':
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          Accepted
        </span>
      )
    case 'completed':
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          Completed
        </span>
      )
  }
}

interface PickupCardProps {
  pickup: Pickup
  workers: Worker[]
}

function PickupCard({ pickup, workers }: PickupCardProps): React.JSX.Element {
  const displayAddress =
    pickup.address.length > 40 ? `${pickup.address.slice(0, 40)}…` : pickup.address

  const worker = pickup.workerId
    ? workers.find((w) => w.id === pickup.workerId)
    : undefined

  let impactLine: string | null = null
  if (pickup.status === 'completed') {
    const divertedKg = pickup.items.reduce((sum, it) => sum + effectiveKg(it), 0)
    const paidINR = pickup.items.reduce((sum, it) => sum + it.value, 0)
    const co2SavedKg = pickup.items.reduce(
      (sum, it) => sum + effectiveKg(it) * (RATE_BY_MATERIAL[it.material]?.co2PerKg ?? 0),
      0,
    )
    impactLine = `${formatKg(divertedKg)} diverted · ${formatINR(paidINR)} paid · ${co2SavedKg.toFixed(1)} kg CO₂ saved`
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">{pickup.slot}</span>
          <p className="text-sm font-medium text-slate-800" title={pickup.address}>
            {displayAddress}
          </p>
        </div>
        <StatusBadge status={pickup.status} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
        <span>
          {pickup.items.length} {pickup.items.length === 1 ? 'item' : 'items'} · {formatKg(pickup.totalKg)}
        </span>
        <span className="font-semibold text-slate-800">{formatINR(pickup.totalValue)}</span>
      </div>

      {pickup.status === 'accepted' && worker && (
        <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
          Assigned to {worker.name}
        </div>
      )}

      {impactLine && (
        <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
          {impactLine}
        </div>
      )}
    </div>
  )
}

export function PickupList({
  pickups,
  loading,
  workers,
}: PickupListProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading pickups">
        {[1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-28 animate-pulse rounded-2xl bg-slate-200/80 p-4"
          />
        ))}
      </div>
    )
  }

  if (pickups.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">
          No pickups yet. Scan your scrap to get started.
        </p>
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          Scan scrap
        </Link>
      </div>
    )
  }

  const sorted = [...pickups].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="space-y-3">
      {sorted.map((pickup) => (
        <PickupCard key={pickup.id} pickup={pickup} workers={workers} />
      ))}
    </div>
  )
}
