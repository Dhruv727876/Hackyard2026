import { useMemo, useState } from 'react'
import { RATES } from '@/config/rates'
import { SCAN_CONFIG } from '@/config/scan'
import { effectiveKg, valuateItems } from '@/domain/valuation'
import type { MaterialId, ScrapItem, ScrapItemInput } from '@/domain/types'
import { formatINR, formatKg } from '@/lib/format'

export interface ScanResultsProps {
  items: readonly ScrapItemInput[]
  onChange: (items: ScrapItemInput[]) => void
}

interface ItemRowProps {
  item: ScrapItemInput
  valuedItem: ScrapItem
  index: number
  weightText: string
  onMaterialChange: (index: number, material: MaterialId) => void
  onWeightChange: (index: number, rawValue: string) => void
}

function ItemRow({
  item,
  valuedItem,
  index,
  weightText,
  onMaterialChange,
  onWeightChange,
}: ItemRowProps): React.JSX.Element {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onWeightChange(index, event.target.value)
  }

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const matched = RATES.find((r) => r.material === event.target.value)
    if (matched) {
      onMaterialChange(index, matched.material)
    }
  }

  const isLowConfidence = item.confidence < SCAN_CONFIG.confidenceThreshold

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">{item.label}</span>
            {isLowConfidence && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Please review
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">₹{valuedItem.ratePerKg}/kg</span>
        </div>
        <span className="text-base font-bold text-emerald-700">
          {valuedItem.recyclable ? formatINR(valuedItem.value) : '₹0'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label
            htmlFor={`material-select-${index}`}
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Material
          </label>
          <select
            id={`material-select-${index}`}
            value={item.material}
            aria-label={`Material for ${item.label}`}
            onChange={handleSelectChange}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
          >
            {RATES.map((rate) => (
              <option key={rate.material} value={rate.material}>
                {rate.displayName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`weight-input-${index}`}
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Estimated weight (kg)
          </label>
          <div className="relative">
            <input
              id={`weight-input-${index}`}
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={weightText}
              aria-label={`Weight for ${item.label}`}
              onChange={handleInputChange}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-right text-xs font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              kg
            </span>
          </div>
        </div>
      </div>

      {!valuedItem.recyclable && valuedItem.disposalTip && (
        <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
          {valuedItem.disposalTip}
        </p>
      )}
    </div>
  )
}

export function ScanResults({ items, onChange }: ScanResultsProps): React.JSX.Element {
  const [weightTexts, setWeightTexts] = useState<Record<number, string>>({})

  const v = useMemo(() => valuateItems(items), [items])

  const handleMaterialChange = (index: number, material: MaterialId): void => {
    const updated = items.map((it, i) => (i === index ? { ...it, material } : it))
    onChange(updated)
  }

  const handleWeightChange = (index: number, rawValue: string): void => {
    setWeightTexts((prev) => ({ ...prev, [index]: rawValue }))
    const parsed = parseFloat(rawValue)
    const validKg = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    const updated = items.map((it, i) => (i === index ? { ...it, userKg: validKg } : it))
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-emerald-900">Total estimated value</span>
          <span className="text-3xl font-extrabold text-emerald-700">{formatINR(v.totalINR)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-slate-600">
          <span>Total estimated weight: {formatKg(v.totalKg)}</span>
          <span>≈ {v.co2SavedKg.toFixed(1)} kg CO₂ avoided</span>
        </div>
        <p className="mt-3 border-t border-emerald-200/60 pt-2 text-xs text-slate-500">
          Indicative estimate. Final payment is based on actual weight at pickup.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Estimated items</h2>
        {items.map((item, index) => {
          const rawText = weightTexts[index]
          const displayWeight = rawText !== undefined ? rawText : String(effectiveKg(item))

          return (
            <ItemRow
              key={`${item.label}-${index}`}
              item={item}
              valuedItem={v.items[index]}
              index={index}
              weightText={displayWeight}
              onMaterialChange={handleMaterialChange}
              onWeightChange={handleWeightChange}
            />
          )
        })}
      </div>
    </div>
  )
}
