import { describe, expect, it } from 'vitest'
import type { MaterialId } from '@/domain/types'
import { RATES, RATE_BY_MATERIAL } from './rates'

const ALL_MATERIALS: MaterialId[] = [
  'paper',
  'cardboard',
  'pet',
  'plastic',
  'glass',
  'metal',
  'e_waste',
  'non_recyclable',
]

describe('rates config', () => {
  it('covers every MaterialId exactly once — no gaps, no duplicates', () => {
    expect(RATES).toHaveLength(ALL_MATERIALS.length)
    const seen = new Set<MaterialId>()
    for (const rate of RATES) {
      expect(seen.has(rate.material)).toBe(false)
      seen.add(rate.material)
    }
    for (const material of ALL_MATERIALS) {
      expect(seen.has(material)).toBe(true)
      expect(RATE_BY_MATERIAL[material]).toBeDefined()
    }
  })

  it('matches the indicative rate and CO2 table', () => {
    expect(RATE_BY_MATERIAL.paper).toMatchObject({ ratePerKg: 12, co2PerKg: 0.9 })
    expect(RATE_BY_MATERIAL.cardboard).toMatchObject({ ratePerKg: 9, co2PerKg: 0.9 })
    expect(RATE_BY_MATERIAL.pet).toMatchObject({ ratePerKg: 25, co2PerKg: 1.5 })
    expect(RATE_BY_MATERIAL.plastic).toMatchObject({
      displayName: 'Plastic (mixed/HDPE)',
      ratePerKg: 10,
      co2PerKg: 1.4,
    })
    expect(RATE_BY_MATERIAL.glass).toMatchObject({ ratePerKg: 2, co2PerKg: 0.3 })
    expect(RATE_BY_MATERIAL.metal).toMatchObject({
      displayName: 'Metal (mixed)',
      ratePerKg: 35,
      co2PerKg: 2.0,
    })
    expect(RATE_BY_MATERIAL.e_waste).toMatchObject({
      displayName: 'E-waste',
      ratePerKg: 40,
      co2PerKg: 12,
    })
    expect(RATE_BY_MATERIAL.non_recyclable).toMatchObject({
      ratePerKg: 0,
      co2PerKg: 0,
      recyclable: false,
    })
    expect(RATE_BY_MATERIAL.non_recyclable.disposalTip).toContain(
      'Not accepted by kabadiwalas',
    )
  })

  it('marks every material except non_recyclable as recyclable', () => {
    for (const rate of RATES) {
      expect(rate.recyclable).toBe(rate.material !== 'non_recyclable')
    }
  })
})
