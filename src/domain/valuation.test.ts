import { describe, expect, it } from 'vitest'
import { effectiveKg, valuateItems, valueForItem, withWeightOverride } from './valuation'
import type { ScrapItem, ScrapItemInput } from './types'

const input = (overrides: Partial<ScrapItemInput> = {}): ScrapItemInput => ({
  material: 'paper',
  label: 'newspaper stack',
  estKg: 2,
  confidence: 0.9,
  ...overrides,
})

const fullItem = (overrides: Partial<ScrapItem> = {}): ScrapItem => ({
  ratePerKg: 12,
  value: 24,
  recyclable: true,
  ...input(overrides),
})

describe('effectiveKg', () => {
  it('returns the AI estimate when no override is set', () => {
    expect(effectiveKg({ estKg: 2.5 })).toBe(2.5)
  })

  it('prefers the household override', () => {
    expect(effectiveKg({ estKg: 2.5, userKg: 1.8 })).toBe(1.8)
  })
})

describe('valueForItem', () => {
  it('multiplies weight by the material rate', () => {
    expect(valueForItem('paper', 2.5)).toBe(30)
    expect(valueForItem('e_waste', 1)).toBe(40)
    expect(valueForItem('glass', 0.5)).toBe(1)
    expect(valueForItem('metal', 1)).toBe(35)
  })

  it('always values non_recyclable at 0', () => {
    expect(valueForItem('non_recyclable', 5)).toBe(0)
  })

  it('clamps negative weights to 0', () => {
    expect(valueForItem('paper', -3)).toBe(0)
    expect(valueForItem('e_waste', -1)).toBe(0)
    expect(valueForItem('non_recyclable', -5)).toBe(0)
  })
})

describe('withWeightOverride', () => {
  it('recalculates value from the override without mutating the original', () => {
    const original: ScrapItem = fullItem({ estKg: 1, value: 12 })
    const updated = withWeightOverride(original, 3)

    expect(updated.userKg).toBe(3)
    expect(updated.value).toBe(36)
    expect(updated).not.toBe(original)
    expect(original.userKg).toBeUndefined()
    expect(original.value).toBe(12)
    expect(original.estKg).toBe(1)
  })

  it('clamps negative overrides to 0', () => {
    const updated = withWeightOverride(fullItem(), -2)
    expect(updated.userKg).toBe(0)
    expect(updated.value).toBe(0)
  })
})

describe('valuateItems', () => {
  it('values a mixed batch and totals weight, ₹ and CO2 (hand-computed)', () => {
    // paper    2.5kg        → 12 × 2.5 = 30     co2 2.5 × 0.9 = 2.25
    // pet      userKg 1.5kg → 25 × 1.5 = 37.5   co2 1.5 × 1.5 = 2.25
    // e_waste  0.5kg        → 40 × 0.5 = 20     co2 0.5 × 12  = 6
    // non_recyclable 2kg    → 0                 co2 0
    // totals: ₹87.5, 6.5kg, 10.5kg CO2
    const valuation = valuateItems([
      input({ material: 'paper', label: 'newspapers', estKg: 2.5 }),
      input({ material: 'pet', label: '2L PET bottle', estKg: 1, userKg: 1.5 }),
      input({ material: 'e_waste', label: 'old phone charger', estKg: 0.5 }),
      input({ material: 'non_recyclable', label: 'chip packets', estKg: 2 }),
    ])

    expect(valuation.items).toHaveLength(4)
    expect(valuation.totalINR).toBeCloseTo(87.5)
    expect(valuation.totalKg).toBeCloseTo(6.5)
    expect(valuation.co2SavedKg).toBeCloseTo(10.5)
    expect(valuation.items[1].value).toBeCloseTo(37.5)
    expect(valuation.items[3].value).toBe(0)
  })

  it('populates ratePerKg, recyclable and disposalTip from the rate table', () => {
    const valuation = valuateItems([
      input({ material: 'cardboard', label: 'boxes', estKg: 1 }),
      input({ material: 'non_recyclable', label: 'foil-lined packet', estKg: 0.2 }),
    ])

    const cardboard = valuation.items[0]
    expect(cardboard.ratePerKg).toBe(9)
    expect(cardboard.recyclable).toBe(true)
    expect(cardboard.value).toBe(9)

    const nonRecyclable = valuation.items[1]
    expect(nonRecyclable.value).toBe(0)
    expect(nonRecyclable.recyclable).toBe(false)
    expect(nonRecyclable.disposalTip).toBe(
      'Not accepted by kabadiwalas. Hand to municipal dry-waste centre or follow local e-waste/sanitary disposal rules.',
    )
  })

  it('returns all zeros and an empty array for empty input', () => {
    expect(valuateItems([])).toEqual({
      items: [],
      totalINR: 0,
      totalKg: 0,
      co2SavedKg: 0,
    })
  })

  it('keeps totals unrounded (no mid-calculation rounding)', () => {
    // 3 × 0.33kg × ₹12/kg = ₹11.88, 0.99kg
    const valuation = valuateItems([
      input({ material: 'paper', label: 'a', estKg: 0.33 }),
      input({ material: 'paper', label: 'b', estKg: 0.33 }),
      input({ material: 'paper', label: 'c', estKg: 0.33 }),
    ])

    expect(valuation.totalINR).toBeCloseTo(11.88)
    expect(valuation.totalKg).toBeCloseTo(0.99)
  })

  it('does not mutate the input items', () => {
    const original = input({ material: 'pet', label: 'bottle', estKg: 1 })
    const valuation = valuateItems([original])

    expect(valuation.items[0]).not.toBe(original)
    expect(original).not.toHaveProperty('ratePerKg')
    expect(original).not.toHaveProperty('value')
  })
})
