import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RATES } from '@/config/rates'
import { valuateItems } from '@/domain/valuation'
import { LocalRepo } from './localRepo'
import { RepoError } from './repository'
import type { NewPickup } from './repository'
import { SEED_PICKUPS, SEED_WORKERS } from './seed'

const PICKUPS_KEY = 'scraploop:v1:pickups'
const INITIALIZED_KEY = 'scraploop:v1:initialized'

const testPickup: NewPickup = {
  householdId: 'household-test',
  items: [
    { material: 'paper', label: 'Newspaper bundle', estKg: 2, confidence: 0.9 },
  ],
  address: '1, Test Street, Koramangala',
  lat: 12.9352,
  lng: 77.6245,
  slot: 'Tomorrow 9–11am',
}

beforeEach(() => {
  localStorage.clear()
})

describe('LocalRepo seeding', () => {
  it('seeds on first access and a second instance does not duplicate', async () => {
    const first = new LocalRepo()
    await expect(first.listPickups()).resolves.toHaveLength(SEED_PICKUPS.length)
    await expect(first.listWorkers()).resolves.toHaveLength(SEED_WORKERS.length)

    const second = new LocalRepo()
    const pickups = await second.listPickups()
    expect(pickups).toHaveLength(SEED_PICKUPS.length)
    const ids = new Set(pickups.map((pickup) => pickup.id))
    expect(ids.size).toBe(pickups.length)
    await expect(second.listWorkers()).resolves.toHaveLength(SEED_WORKERS.length)
  })

  it('auto-reseeds corrupt JSON without throwing', async () => {
    localStorage.setItem(INITIALIZED_KEY, '1')
    localStorage.setItem(PICKUPS_KEY, '{definitely not json')
    const repo = new LocalRepo()
    await expect(repo.listPickups()).resolves.toHaveLength(SEED_PICKUPS.length)
  })

  it('auto-reseeds wrong-shaped data without throwing', async () => {
    localStorage.setItem(INITIALIZED_KEY, '1')
    localStorage.setItem(PICKUPS_KEY, JSON.stringify({ nope: [1, 2, 3] }))
    const repo = new LocalRepo()
    await expect(repo.listPickups()).resolves.toHaveLength(SEED_PICKUPS.length)
    await expect(repo.listWorkers()).resolves.toHaveLength(SEED_WORKERS.length)
  })

  it('throws storage-unavailable when localStorage is inaccessible', async () => {
    vi.stubGlobal('localStorage', undefined)
    try {
      const repo = new LocalRepo()
      await expect(repo.listPickups()).rejects.toThrow(RepoError)
      await expect(repo.listPickups()).rejects.toMatchObject({ code: 'storage-unavailable' })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('LocalRepo pickups', () => {
  it('createPickup returns a requested, valuated pickup with a UUID id and persists it', async () => {
    const repo = new LocalRepo()
    const created = await repo.createPickup(testPickup)

    expect(created.status).toBe('requested')
    expect(created.workerId).toBeUndefined()
    expect(created.address).toBe(testPickup.address)
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    const expected = valuateItems(testPickup.items)
    expect(created.totalValue).toBeCloseTo(expected.totalINR)
    expect(created.totalKg).toBeCloseTo(expected.totalKg)
    expect(created.items[0].ratePerKg).toBe(12)
    expect(created.items[0].value).toBeCloseTo(24)

    await expect(repo.getPickup(created.id)).resolves.toEqual(created)
  })

  it('getPickup returns null for an unknown id', async () => {
    const repo = new LocalRepo()
    await expect(repo.getPickup('does-not-exist')).resolves.toBeNull()
  })

  it('listOpenPickups returns only requested pickups', async () => {
    const repo = new LocalRepo()
    const open = await repo.listOpenPickups()
    expect(open).toHaveLength(2) // the two seeded requested pickups
    expect(open.every((pickup) => pickup.status === 'requested')).toBe(true)
  })

  it('listPickupsByHousehold filters by household', async () => {
    const repo = new LocalRepo()
    const mine = await repo.listPickupsByHousehold('household-asha')
    expect(mine).toHaveLength(1)
    expect(mine[0].id).toBe('pickup-1')
  })

  it('acceptPickup sets worker, increments activePickups, and rejects double-accept', async () => {
    const repo = new LocalRepo()
    const open = await repo.listOpenPickups()
    const target = open[0]

    const updated = await repo.acceptPickup(target.id, 'worker-3')
    expect(updated.status).toBe('accepted')
    expect(updated.workerId).toBe('worker-3')
    await expect(repo.getWorker('worker-3')).resolves.toMatchObject({ activePickups: 1 })

    await expect(repo.acceptPickup(target.id, 'worker-1')).rejects.toThrow(RepoError)
    await expect(repo.acceptPickup(target.id, 'worker-1')).rejects.toMatchObject({
      code: 'invalid-transition',
    })
  })

  it('acceptPickup throws not-found for unknown pickup or worker', async () => {
    const repo = new LocalRepo()
    await expect(repo.acceptPickup('missing-pickup', 'worker-1')).rejects.toMatchObject({
      code: 'not-found',
    })
    await expect(repo.acceptPickup('pickup-3', 'missing-worker')).rejects.toMatchObject({
      code: 'not-found',
    })
  })

  it('completePickup requires an accepted pickup and restores activePickups', async () => {
    const repo = new LocalRepo()
    const open = await repo.listOpenPickups()

    // requested → invalid transition
    await expect(repo.completePickup(open[0].id)).rejects.toMatchObject({
      code: 'invalid-transition',
    })

    const accepted = await repo.acceptPickup(open[0].id, 'worker-3') // starts at 0
    await expect(repo.getWorker('worker-3')).resolves.toMatchObject({ activePickups: 1 })

    const completed = await repo.completePickup(accepted.id)
    expect(completed.status).toBe('completed')
    expect(typeof completed.completedAt).toBe('string')
    expect(completed.completedAt).toBeTruthy()
    await expect(repo.getWorker('worker-3')).resolves.toMatchObject({ activePickups: 0 })
  })
})

describe('LocalRepo ward stats', () => {
  it('derives ward-151 stats from exactly the seeded completed pickup', async () => {
    // Hand-computed for seed pickup-1 (paper 3.2kg, pet 1.1kg, metal 0.6kg):
    // ₹ = 3.2×12 + 1.1×25 + 0.6×35 = 38.4 + 27.5 + 21 = 86.9
    // kg = 4.9, CO2 = 3.2×0.9 + 1.1×1.5 + 0.6×2.0 = 2.88 + 1.65 + 1.2 = 5.73
    const repo = new LocalRepo()
    const stats = await repo.getWardStats('ward-151')

    expect(stats.wardId).toBe('ward-151')
    expect(stats.pickupsCompleted).toBe(1)
    expect(stats.totalKg).toBeCloseTo(4.9)
    expect(stats.totalINR).toBeCloseTo(86.9)
    expect(stats.co2Saved).toBeCloseTo(5.73)
    expect(stats.byMaterial.paper).toBeCloseTo(3.2)
    expect(stats.byMaterial.pet).toBeCloseTo(1.1)
    expect(stats.byMaterial.metal).toBeCloseTo(0.6)
    expect(stats.byMaterial.glass).toBe(0)
  })

  it('changes by exactly the totals of a newly completed pickup (CO2 hand-computed)', async () => {
    const repo = new LocalRepo()
    const before = await repo.getWardStats('ward-151')
    expect(before.pickupsCompleted).toBe(1)

    // e_waste 2kg → ₹80, CO2 24; metal 1kg → ₹35, CO2 2  ⇒ ₹115, 3kg, CO2 26
    const created = await repo.createPickup({
      ...testPickup,
      items: [
        { material: 'e_waste', label: 'Old laptop', estKg: 2, confidence: 0.8 },
        { material: 'metal', label: 'Steel scraps', estKg: 1, confidence: 0.9 },
      ],
    })
    const accepted = await repo.acceptPickup(created.id, 'worker-1')
    await repo.completePickup(accepted.id)

    const after = await repo.getWardStats('ward-151')
    expect(after.pickupsCompleted).toBe(2)
    expect(after.totalKg).toBeCloseTo(before.totalKg + 3)
    expect(after.totalINR).toBeCloseTo(before.totalINR + 115)
    expect(after.co2Saved).toBeCloseTo(before.co2Saved + 26)
    expect(after.byMaterial.e_waste).toBeCloseTo(2)
    expect(after.byMaterial.metal).toBeCloseTo(before.byMaterial.metal + 1)
  })

  it('returns zeros with a full byMaterial map for an unknown ward', async () => {
    const repo = new LocalRepo()
    const stats = await repo.getWardStats('ward-999')
    expect(stats.totalKg).toBe(0)
    expect(stats.totalINR).toBe(0)
    expect(stats.co2Saved).toBe(0)
    expect(stats.pickupsCompleted).toBe(0)
    expect(Object.keys(stats.byMaterial).sort()).toEqual(
      RATES.map((rate) => rate.material).sort(),
    )
  })
})

describe('LocalRepo reset', () => {
  it('resetToSeed restores the seed after mutations', async () => {
    const repo = new LocalRepo()
    const open = await repo.listOpenPickups()
    await repo.acceptPickup(open[0].id, 'worker-3')
    await repo.createPickup(testPickup)
    expect(await repo.listPickups()).toHaveLength(SEED_PICKUPS.length + 1)

    await repo.resetToSeed()
    expect(await repo.listPickups()).toHaveLength(SEED_PICKUPS.length)
    expect(await repo.listOpenPickups()).toHaveLength(2)
    await expect(repo.getWorker('worker-3')).resolves.toMatchObject({ activePickups: 0 })
  })
})
