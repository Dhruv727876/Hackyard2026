import type { MaterialId, RateEntry } from '@/domain/types'

// Indicative Indian kabadiwala rates; city/dealer dependent. Config-driven on
// purpose — replace with live dealer feeds post-MVP.

// Defined as a literal Record (not an array) so that a MaterialId missing from
// this table is a compile error; RATES below is derived from it.
const RATE_TABLE: Record<MaterialId, RateEntry> = {
  paper: {
    material: 'paper',
    displayName: 'Paper',
    ratePerKg: 12,
    co2PerKg: 0.9,
    recyclable: true,
  },
  cardboard: {
    material: 'cardboard',
    displayName: 'Cardboard',
    ratePerKg: 9,
    co2PerKg: 0.9,
    recyclable: true,
  },
  pet: {
    material: 'pet',
    displayName: 'PET',
    ratePerKg: 25,
    co2PerKg: 1.5,
    recyclable: true,
  },
  plastic: {
    material: 'plastic',
    displayName: 'Plastic (mixed/HDPE)',
    ratePerKg: 10,
    co2PerKg: 1.4,
    recyclable: true,
  },
  glass: {
    material: 'glass',
    displayName: 'Glass',
    ratePerKg: 2,
    co2PerKg: 0.3,
    recyclable: true,
  },
  metal: {
    material: 'metal',
    displayName: 'Metal (mixed)',
    ratePerKg: 35,
    co2PerKg: 2.0,
    recyclable: true,
  },
  e_waste: {
    material: 'e_waste',
    displayName: 'E-waste',
    ratePerKg: 40,
    co2PerKg: 12,
    recyclable: true,
  },
  non_recyclable: {
    material: 'non_recyclable',
    displayName: 'Non-recyclable',
    ratePerKg: 0,
    co2PerKg: 0,
    recyclable: false,
    disposalTip:
      'Not accepted by kabadiwalas. Hand to municipal dry-waste centre or follow local e-waste/sanitary disposal rules.',
  },
}

export const RATES: readonly RateEntry[] = Object.values(RATE_TABLE)

export const RATE_BY_MATERIAL: Record<MaterialId, RateEntry> = RATE_TABLE
