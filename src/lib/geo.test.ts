import { describe, expect, it } from 'vitest'
import { haversineKm } from './geo'

const WARD_151 = { lat: 12.9352, lng: 77.6245 }
const WARD_36 = { lat: 12.925, lng: 77.5938 }

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(WARD_151.lat, WARD_151.lng, WARD_151.lat, WARD_151.lng)).toBe(0)
  })

  it('measures a ~2km latitude offset as 1.5–2.5km', () => {
    // 0.015° of latitude ≈ 1.67km at Bangalore's latitude
    const km = haversineKm(WARD_151.lat, WARD_151.lng, 12.9502, WARD_151.lng)
    expect(km).toBeGreaterThan(1.5)
    expect(km).toBeLessThan(2.5)
  })

  it('is symmetric between the two demo ward centers', () => {
    const forward = haversineKm(WARD_151.lat, WARD_151.lng, WARD_36.lat, WARD_36.lng)
    const backward = haversineKm(WARD_36.lat, WARD_36.lng, WARD_151.lat, WARD_151.lng)
    expect(forward).toBe(backward)
    expect(forward).toBeGreaterThan(0)
  })
})
