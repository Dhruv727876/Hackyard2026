import { RATE_BY_MATERIAL } from '@/config/rates'
import type { MaterialId, ScrapItem, ScrapItemInput, Valuation } from './types'

/** Household override if present, otherwise the AI estimate. */
export function effectiveKg(item: Pick<ScrapItem, 'estKg' | 'userKg'>): number {
  return item.userKg ?? item.estKg
}

/**
 * Indicative value in ₹ for a weight of one material. Full precision —
 * never round mid-calculation; rounding is a display concern (@/lib/format).
 */
export function valueForItem(material: MaterialId, kg: number): number {
  if (material === 'non_recyclable') return 0
  return Math.max(kg, 0) * RATE_BY_MATERIAL[material].ratePerKg
}

/** Returns a NEW item with the household's weight override applied (clamped ≥ 0). */
export function withWeightOverride(item: ScrapItem, kg: number): ScrapItem {
  const userKg = Math.max(kg, 0)
  return { ...item, userKg, value: valueForItem(item.material, userKg) }
}

/**
 * Values a batch of AI-supplied items against the rate table. Never mutates
 * the input: every returned item is a new object with ratePerKg, value,
 * recyclable and disposalTip populated from the config table. Totals keep
 * full precision — the sum of unrounded item values.
 */
export function valuateItems(items: readonly ScrapItemInput[]): Valuation {
  const valuedItems: ScrapItem[] = items.map((item) => {
    const rate = RATE_BY_MATERIAL[item.material]
    const kg = effectiveKg(item)
    return {
      ...item,
      ratePerKg: rate.ratePerKg,
      value: valueForItem(item.material, kg),
      recyclable: rate.recyclable,
      disposalTip: rate.disposalTip,
    }
  })

  const totalINR = valuedItems.reduce((sum, item) => sum + item.value, 0)
  const totalKg = valuedItems.reduce((sum, item) => sum + effectiveKg(item), 0)
  const co2SavedKg = valuedItems.reduce(
    (sum, item) => sum + effectiveKg(item) * RATE_BY_MATERIAL[item.material].co2PerKg,
    0,
  )

  return { items: valuedItems, totalINR, totalKg, co2SavedKg }
}
