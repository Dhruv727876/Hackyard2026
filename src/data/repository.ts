import type { Pickup, ScrapItemInput, WardStats, Worker } from '@/domain/types'

/**
 * The single data-access seam for ScrapLoop. Every method is async even though
 * the current implementation (localStorage) is synchronous, so the Firestore
 * implementation post-MVP is a drop-in swap: UI code never changes shape.
 */
export interface ScrapLoopRepo {
  // Pickups
  listPickups(): Promise<Pickup[]>
  listPickupsByHousehold(householdId: string): Promise<Pickup[]>
  listOpenPickups(): Promise<Pickup[]>
  getPickup(id: string): Promise<Pickup | null>
  createPickup(input: NewPickup): Promise<Pickup>
  acceptPickup(id: string, workerId: string): Promise<Pickup>
  completePickup(id: string): Promise<Pickup>

  // Workers
  listWorkers(): Promise<Worker[]>
  getWorker(id: string): Promise<Worker | null>

  // Ward stats — DERIVED, never stored
  getWardStats(wardId: string): Promise<WardStats>

  // Dev/demo utility
  resetToSeed(): Promise<void>
}

/** What the household submits when requesting a pickup — AI output shape; the repo runs valuation. */
export interface NewPickup {
  householdId: string
  items: ScrapItemInput[]
  address: string
  lat: number
  lng: number
  slot: string
}

export type RepoErrorCode = 'not-found' | 'invalid-transition' | 'storage-unavailable'

/**
 * Raised for expected failure modes the UI will render as retry/disabled
 * states: 'not-found', 'invalid-transition' (accepting an already-accepted or
 * completed pickup, completing a non-accepted pickup), 'storage-unavailable'.
 */
export class RepoError extends Error {
  readonly code: RepoErrorCode

  constructor(code: RepoErrorCode, message: string) {
    super(message)
    this.name = 'RepoError'
    this.code = code
  }
}
