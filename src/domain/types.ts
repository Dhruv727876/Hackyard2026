/**
 * ScrapLoop MVP domain entities. Types only — no logic, no React, no I/O.
 */

export type Role = 'household' | 'worker' | 'officer'

export type MaterialId =
  | 'paper'
  | 'cardboard'
  | 'pet'
  | 'plastic'
  | 'glass'
  | 'metal'
  | 'e_waste'
  | 'non_recyclable'

export interface User {
  id: string
  role: Role
  name: string
  area: string
}

/**
 * A single scrap item on a pickup.
 * - `label` is the AI's free-text item description (e.g. "2L PET bottle").
 * - `estKg` is the AI weight estimate; `userKg` is the household's override.
 * - `ratePerKg`, `value`, `recyclable` and `disposalTip` are populated by the
 *   valuation engine (see @/domain/valuation) from the config rate table.
 */
export interface ScrapItem {
  material: MaterialId
  label: string
  estKg: number
  userKg?: number
  ratePerKg: number
  value: number
  recyclable: boolean
  confidence: number
  disposalTip?: string
}

/**
 * What the AI/service layer supplies before valuation: only material, label,
 * estKg, confidence and an optional userKg. The valuation engine fills in
 * ratePerKg, value, recyclable and disposalTip from the rate table.
 */
export type ScrapItemInput = Omit<
  ScrapItem,
  'ratePerKg' | 'value' | 'recyclable' | 'disposalTip'
>

export type PickupStatus = 'requested' | 'accepted' | 'completed'

export interface Pickup {
  id: string
  householdId: string
  items: ScrapItem[]
  totalValue: number
  totalKg: number
  address: string
  lat: number
  lng: number
  slot: string
  status: PickupStatus
  workerId?: string
  /** ISO date string */
  createdAt: string
  /** ISO date string */
  completedAt?: string
}

export interface Worker {
  id: string
  name: string
  area: string
  lat: number
  lng: number
  activePickups: number
}

export interface RateEntry {
  material: MaterialId
  displayName: string
  ratePerKg: number
  /** kg CO2e avoided per kg recycled */
  co2PerKg: number
  recyclable: boolean
  disposalTip?: string
}

export interface WardStats {
  wardId: string
  totalKg: number
  totalINR: number
  co2Saved: number
  pickupsCompleted: number
  byMaterial: Record<MaterialId, number>
}

export interface Valuation {
  items: ScrapItem[]
  totalINR: number
  totalKg: number
  co2SavedKg: number
}
