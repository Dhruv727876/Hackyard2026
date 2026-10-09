import { RATE_BY_MATERIAL } from '@/config/rates'
import type { Pickup } from '@/domain/types'
import { effectiveKg } from '@/domain/valuation'
import { formatINR, formatKg } from '@/lib/format'

export interface ImpactCardProps {
  pickups: Pickup[]
}

export function ImpactCard({ pickups }: ImpactCardProps): React.JSX.Element | null {
  const completed = pickups.filter((p) => p.status === 'completed')
  if (completed.length === 0) {
    return null
  }

  const completedItems = completed.flatMap((p) => p.items)
  const totalKg = completedItems.reduce((sum, item) => sum + effectiveKg(item), 0)
  const totalPaid = completedItems.reduce((sum, item) => sum + item.value, 0)
  const totalCo2 = completedItems.reduce(
    (sum, item) => sum + effectiveKg(item) * (RATE_BY_MATERIAL[item.material]?.co2PerKg ?? 0),
    0,
  )

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
      <h2 className="text-base font-bold text-emerald-900">Your impact so far</h2>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/80 p-2.5 shadow-xs">
          <div className="text-lg font-bold text-emerald-700">{formatKg(totalKg)}</div>
          <div className="text-xs text-slate-600">Diverted</div>
        </div>
        <div className="rounded-xl bg-white/80 p-2.5 shadow-xs">
          <div className="text-lg font-bold text-emerald-700">{formatINR(totalPaid)}</div>
          <div className="text-xs text-slate-600">Earned</div>
        </div>
        <div className="rounded-xl bg-white/80 p-2.5 shadow-xs">
          <div className="text-lg font-bold text-emerald-700">{totalCo2.toFixed(1)} kg</div>
          <div className="text-xs text-slate-600">CO₂ saved</div>
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Thank you for keeping {formatKg(totalKg)} out of landfill.
      </p>
    </div>
  )
}
