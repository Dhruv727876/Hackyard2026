import { RATES, RATE_BY_MATERIAL } from '@/config/rates'
import { effectiveKg, valuateItems } from '@/domain/valuation'
import { haversineKm } from '@/lib/geo'
import type { MaterialId, Pickup, ScrapItem, WardStats, Worker } from '@/domain/types'
import { RepoError } from './repository'
import type { NewPickup, ScrapLoopRepo } from './repository'
import { SEED_PICKUPS, SEED_WORKERS, WARD_CENTERS } from './seed'
import type { WardCenter } from './seed'

const PICKUPS_KEY = 'scraploop:v1:pickups'
const WORKERS_KEY = 'scraploop:v1:workers'
const INITIALIZED_KEY = 'scraploop:v1:initialized'

// Literal (not derived) so a new MaterialId must be added here too — compile error otherwise.
const ZERO_BY_MATERIAL: Record<MaterialId, number> = {
  paper: 0,
  cardboard: 0,
  pet: 0,
  plastic: 0,
  glass: 0,
  metal: 0,
  e_waste: 0,
  non_recyclable: 0,
}

// ---- shape validation (corrupt storage → reseed, never throw) ----

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMaterial(value: unknown): value is MaterialId {
  return typeof value === 'string' && RATES.some((rate) => rate.material === value)
}

function isScrapItem(value: unknown): value is ScrapItem {
  if (!isRecord(value)) return false
  return (
    isMaterial(value.material) &&
    typeof value.label === 'string' &&
    typeof value.estKg === 'number' &&
    (value.userKg === undefined || typeof value.userKg === 'number') &&
    typeof value.ratePerKg === 'number' &&
    typeof value.value === 'number' &&
    typeof value.recyclable === 'boolean' &&
    typeof value.confidence === 'number' &&
    (value.disposalTip === undefined || typeof value.disposalTip === 'string')
  )
}

function isPickup(value: unknown): value is Pickup {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.householdId === 'string' &&
    Array.isArray(value.items) &&
    value.items.every(isScrapItem) &&
    typeof value.totalValue === 'number' &&
    typeof value.totalKg === 'number' &&
    typeof value.address === 'string' &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    typeof value.slot === 'string' &&
    (value.status === 'requested' || value.status === 'accepted' || value.status === 'completed') &&
    (value.workerId === undefined || typeof value.workerId === 'string') &&
    typeof value.createdAt === 'string' &&
    (value.completedAt === undefined || typeof value.completedAt === 'string')
  )
}

function isWorker(value: unknown): value is Worker {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.area === 'string' &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    typeof value.activePickups === 'number'
  )
}

function isPickupArray(value: unknown): value is Pickup[] {
  return Array.isArray(value) && value.every(isPickup)
}

function isWorkerArray(value: unknown): value is Worker[] {
  return Array.isArray(value) && value.every(isWorker)
}

/** Pickup carries no wardId column yet — assign it to its nearest ward centroid. */
function nearestWardId(lat: number, lng: number): string | null {
  let nearest: WardCenter | null = null
  let bestKm = Number.POSITIVE_INFINITY
  for (const center of WARD_CENTERS) {
    const km = haversineKm(lat, lng, center.lat, center.lng)
    if (km < bestKm) {
      bestKm = km
      nearest = center
    }
  }
  return nearest?.id ?? null
}

/**
 * localStorage-backed ScrapLoopRepo. Every method is async to match the
 * Firestore API shape; mutations resolve after the write completes. Each
 * mutation is one synchronous read → mutate → write cycle (single-threaded JS,
 * so no interleaving within a method) — the Firestore implementation will use
 * transactions instead.
 */
export class LocalRepo implements ScrapLoopRepo {
  private storage(): Storage {
    try {
      const storage = globalThis.localStorage
      if (typeof storage === 'undefined' || storage === null) throw new Error('unavailable')
      const probe = '__scraploop_storage_probe__'
      storage.setItem(probe, probe)
      storage.removeItem(probe)
      return storage
    } catch {
      throw new RepoError('storage-unavailable', 'localStorage is unavailable (SSR or private browsing).')
    }
  }

  private writeSeed(storage: Storage): void {
    storage.setItem(PICKUPS_KEY, JSON.stringify(SEED_PICKUPS))
    storage.setItem(WORKERS_KEY, JSON.stringify(SEED_WORKERS))
    storage.setItem(INITIALIZED_KEY, '1')
  }

  private ensureInitialized(storage: Storage): void {
    if (storage.getItem(INITIALIZED_KEY) !== '1') this.writeSeed(storage)
  }

  private readValidated<T>(
    storage: Storage,
    key: string,
    validate: (value: unknown) => value is T[],
  ): T[] | null {
    const raw = storage.getItem(key)
    if (raw === null) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return validate(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  private loadPickups(storage: Storage): Pickup[] {
    this.ensureInitialized(storage)
    const stored = this.readValidated(storage, PICKUPS_KEY, isPickupArray)
    if (stored !== null) return stored
    this.writeSeed(storage) // corrupt or missing → auto-reseed, never throw
    return this.readValidated(storage, PICKUPS_KEY, isPickupArray) ?? []
  }

  private loadWorkers(storage: Storage): Worker[] {
    this.ensureInitialized(storage)
    const stored = this.readValidated(storage, WORKERS_KEY, isWorkerArray)
    if (stored !== null) return stored
    this.writeSeed(storage) // corrupt or missing → auto-reseed, never throw
    return this.readValidated(storage, WORKERS_KEY, isWorkerArray) ?? []
  }

  // ---- pickups ----

  async listPickups(): Promise<Pickup[]> {
    return this.loadPickups(this.storage())
  }

  async listPickupsByHousehold(householdId: string): Promise<Pickup[]> {
    return this.loadPickups(this.storage()).filter(
      (pickup) => pickup.householdId === householdId,
    )
  }

  async listOpenPickups(): Promise<Pickup[]> {
    return this.loadPickups(this.storage()).filter(
      (pickup) => pickup.status === 'requested',
    )
  }

  async getPickup(id: string): Promise<Pickup | null> {
    return this.loadPickups(this.storage()).find((pickup) => pickup.id === id) ?? null
  }

  async createPickup(input: NewPickup): Promise<Pickup> {
    const storage = this.storage()
    const pickups = this.loadPickups(storage)
    const valuation = valuateItems(input.items)
    const pickup: Pickup = {
      id: crypto.randomUUID(),
      householdId: input.householdId,
      items: valuation.items,
      totalValue: valuation.totalINR,
      totalKg: valuation.totalKg,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      slot: input.slot,
      status: 'requested',
      createdAt: new Date().toISOString(),
    }
    storage.setItem(PICKUPS_KEY, JSON.stringify([...pickups, pickup]))
    return pickup
  }

  async acceptPickup(id: string, workerId: string): Promise<Pickup> {
    const storage = this.storage()
    const pickups = this.loadPickups(storage)
    const pickup = pickups.find((candidate) => candidate.id === id)
    if (!pickup) throw new RepoError('not-found', `Pickup ${id} not found`)
    if (pickup.status !== 'requested') {
      throw new RepoError('invalid-transition', `Pickup ${id} is ${pickup.status}, only requested pickups can be accepted`)
    }
    const workers = this.loadWorkers(storage)
    if (!workers.some((worker) => worker.id === workerId)) {
      throw new RepoError('not-found', `Worker ${workerId} not found`)
    }

    const updated: Pickup = { ...pickup, status: 'accepted', workerId }
    const updatedWorkers = workers.map((worker) =>
      worker.id === workerId ? { ...worker, activePickups: worker.activePickups + 1 } : worker,
    )
    storage.setItem(
      PICKUPS_KEY,
      JSON.stringify(pickups.map((candidate) => (candidate.id === id ? updated : candidate))),
    )
    storage.setItem(WORKERS_KEY, JSON.stringify(updatedWorkers))
    return updated
  }

  async completePickup(id: string): Promise<Pickup> {
    const storage = this.storage()
    const pickups = this.loadPickups(storage)
    const pickup = pickups.find((candidate) => candidate.id === id)
    if (!pickup) throw new RepoError('not-found', `Pickup ${id} not found`)
    if (pickup.status !== 'accepted') {
      throw new RepoError('invalid-transition', `Pickup ${id} is ${pickup.status}, only accepted pickups can be completed`)
    }
    const workers = this.loadWorkers(storage)

    const updated: Pickup = { ...pickup, status: 'completed', completedAt: new Date().toISOString() }
    const updatedWorkers = workers.map((worker) =>
      worker.id === pickup.workerId
        ? { ...worker, activePickups: Math.max(0, worker.activePickups - 1) }
        : worker,
    )
    storage.setItem(
      PICKUPS_KEY,
      JSON.stringify(pickups.map((candidate) => (candidate.id === id ? updated : candidate))),
    )
    storage.setItem(WORKERS_KEY, JSON.stringify(updatedWorkers))
    return updated
  }

  // ---- workers ----

  async listWorkers(): Promise<Worker[]> {
    return this.loadWorkers(this.storage())
  }

  async getWorker(id: string): Promise<Worker | null> {
    return this.loadWorkers(this.storage()).find((worker) => worker.id === id) ?? null
  }

  // ---- derived stats (never stored) ----

  async getWardStats(wardId: string): Promise<WardStats> {
    const storage = this.storage()
    const stats: WardStats = {
      wardId,
      totalKg: 0,
      totalINR: 0,
      co2Saved: 0,
      pickupsCompleted: 0,
      byMaterial: { ...ZERO_BY_MATERIAL },
    }

    if (!WARD_CENTERS.some((center) => center.id === wardId)) return stats

    // Ward membership is derived via nearest centroid until Pickup stores a wardId.
    const completed = this.loadPickups(storage).filter(
      (pickup) =>
        pickup.status === 'completed' && nearestWardId(pickup.lat, pickup.lng) === wardId,
    )

    for (const pickup of completed) {
      stats.pickupsCompleted += 1
      stats.totalKg += pickup.totalKg
      stats.totalINR += pickup.totalValue
      for (const item of pickup.items) {
        const kg = effectiveKg(item)
        stats.byMaterial[item.material] += kg
        stats.co2Saved += kg * RATE_BY_MATERIAL[item.material].co2PerKg
      }
    }
    return stats
  }

  // ---- dev/demo utility ----

  async resetToSeed(): Promise<void> {
    this.writeSeed(this.storage())
  }
}
