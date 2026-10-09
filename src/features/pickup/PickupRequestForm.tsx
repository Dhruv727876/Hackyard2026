import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { repo, RepoError } from '@/data'
import type { ScrapItemInput } from '@/domain/types'
import { valuateItems } from '@/domain/valuation'
import { formatINR, formatKg } from '@/lib/format'
import {
  DEFAULT_LAT,
  DEFAULT_LNG,
  DEMO_HOUSEHOLD_ID,
  SLOT_OPTIONS,
} from './constants'

export interface PickupRequestFormProps {
  items: ScrapItemInput[] | null
  onSubmitted: () => void
}

export function PickupRequestForm({
  items,
  onSubmitted,
}: PickupRequestFormProps): React.JSX.Element {
  const [address, setAddress] = useState('')
  const [slot, setSlot] = useState<string>(SLOT_OPTIONS[0])
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valuation = useMemo(() => {
    if (!items || items.length === 0) return null
    return valuateItems(items)
  }, [items])

  if (!items || items.length === 0 || !valuation) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">
          No scan data. Go back and scan your scrap first.
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

  const handleUseLocation = (): void => {
    setLocating(true)
    if (!navigator.geolocation) {
      setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })
      setLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position: unknown) => {
        let lat = DEFAULT_LAT
        let lng = DEFAULT_LNG
        if (typeof position === 'object' && position !== null) {
          const posObj = position as Record<string, unknown>
          const coordsObj = (posObj['coords'] ?? posObj['coordinates']) as
            | Record<string, unknown>
            | undefined
          if (
            coordsObj &&
            typeof coordsObj['latitude'] === 'number' &&
            typeof coordsObj['longitude'] === 'number'
          ) {
            lat = coordsObj['latitude']
            lng = coordsObj['longitude']
          }
        }
        setCoords({ lat, lng })
        setLocating(false)
      },
      () => {
        setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })
        setLocating(false)
      },
      { timeout: 5000 },
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      await repo.createPickup({
        householdId: DEMO_HOUSEHOLD_ID,
        items,
        address: address.trim(),
        lat: coords ? coords.lat : DEFAULT_LAT,
        lng: coords ? coords.lng : DEFAULT_LNG,
        slot,
      })
      onSubmitted()
    } catch (err: unknown) {
      if (err instanceof RepoError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to create pickup request')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
        <span className="text-sm font-semibold text-emerald-900">
          {items.length} {items.length === 1 ? 'item' : 'items'} · {formatKg(valuation.totalKg)} · {formatINR(valuation.totalINR)}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="pickup-address" className="block text-xs font-medium text-slate-700">
          Address <span className="text-red-500">*</span>
        </label>
        <input
          id="pickup-address"
          type="text"
          required
          placeholder="Street, area, landmark"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-700">Location</label>
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locating}
            className="min-h-[44px] text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
          >
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
        {coords && (
          <p className="text-xs text-slate-500">
            Pin: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pickup-slot" className="block text-xs font-medium text-slate-700">
          Pickup slot
        </label>
        <select
          id="pickup-slot"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
        >
          {SLOT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pickup-contact" className="block text-xs font-medium text-slate-700">
          Contact <span className="text-xs font-normal text-slate-500">(demo)</span>
        </label>
        <input
          id="pickup-contact"
          type="tel"
          defaultValue="+91 98765 43210"
          className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-[44px] w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {submitting ? 'Requesting…' : 'Request pickup'}
      </button>
    </form>
  )
}
