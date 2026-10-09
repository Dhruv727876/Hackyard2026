import { valuateItems } from '@/domain/valuation'
import type { Pickup, PickupStatus, ScrapItemInput, Worker } from '@/domain/types'

/** Demo ward centroids (Bangalore). Post-MVP these come from the backend. */
export interface WardCenter {
  id: string
  name: string
  lat: number
  lng: number
}

export const WARD_CENTERS: readonly WardCenter[] = [
  { id: 'ward-151', name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { id: 'ward-36', name: 'Jayanagar', lat: 12.925, lng: 77.5938 },
]

export const SEED_WORKERS: Worker[] = [
  {
    id: 'worker-1',
    name: 'Ravi Kumar',
    area: 'ward-151',
    lat: 12.9355,
    lng: 77.6251,
    activePickups: 0,
  },
  {
    id: 'worker-2',
    name: 'Sunita Devi',
    area: 'ward-151',
    lat: 12.9338,
    lng: 77.6205,
    activePickups: 1, // reflects the accepted seed pickup below
  },
  {
    id: 'worker-3',
    name: 'Mohammed Irfan',
    area: 'ward-36',
    lat: 12.9245,
    lng: 77.5942,
    activePickups: 0,
  },
]

interface SeedPickupBase {
  id: string
  householdId: string
  address: string
  lat: number
  lng: number
  slot: string
  status: PickupStatus
  workerId?: string
  createdAt: string
  completedAt?: string
}

function buildPickup(base: SeedPickupBase, items: ScrapItemInput[]): Pickup {
  const valuation = valuateItems(items)
  return {
    ...base,
    items: valuation.items,
    totalValue: valuation.totalINR,
    totalKg: valuation.totalKg,
  }
}

/**
 * All four pickups sit in ward-151 (Koramangala) for a single-ward demo, at
 * increasing distances from the ward center so distance sorting is visible.
 */
export const SEED_PICKUPS: Pickup[] = [
  buildPickup(
    {
      id: 'pickup-1',
      householdId: 'household-asha',
      address: '412, 5th Cross, Koramangala 5th Block',
      lat: 12.9402,
      lng: 77.6295,
      slot: 'Today 2–4pm',
      status: 'completed',
      workerId: 'worker-1',
      createdAt: '2026-09-27T04:30:00.000Z',
      completedAt: '2026-09-28T05:45:00.000Z',
    },
    [
      { material: 'paper', label: 'Newspaper bundle', estKg: 3.2, confidence: 0.9 },
      { material: 'pet', label: 'PET bottles', estKg: 1.1, confidence: 0.85 },
      { material: 'metal', label: 'Old aluminium utensils', estKg: 0.6, confidence: 0.8 },
    ],
  ),
  buildPickup(
    {
      id: 'pickup-2',
      householdId: 'household-imran',
      address: '9, Jyoti Nivas Lane, Koramangala 4th Block',
      lat: 12.928,
      lng: 77.618,
      slot: 'Tomorrow 9–11am',
      status: 'accepted',
      workerId: 'worker-2',
      createdAt: '2026-10-06T02:10:00.000Z',
    },
    [
      { material: 'cardboard', label: 'Cardboard boxes', estKg: 2.4, confidence: 0.9 },
      { material: 'plastic', label: 'Mixed plastic containers', estKg: 1.5, confidence: 0.75 },
    ],
  ),
  buildPickup(
    {
      id: 'pickup-3',
      householdId: 'household-lakshmi',
      address: '7, Water Tank Road, Koramangala 6th Block',
      lat: 12.947,
      lng: 77.632,
      slot: 'Tomorrow 5–7pm',
      status: 'requested',
      createdAt: '2026-10-07T03:00:00.000Z',
    },
    [
      { material: 'e_waste', label: 'Old CRT monitor and cables', estKg: 4, confidence: 0.7 },
      { material: 'metal', label: 'Copper wire scrap', estKg: 1.2, confidence: 0.8 },
    ],
  ),
  buildPickup(
    {
      id: 'pickup-4',
      householdId: 'household-george',
      address: '2, 80 Feet Road, Koramangala 8th Block',
      lat: 12.952,
      lng: 77.615,
      slot: 'Saturday 10am–12pm',
      status: 'requested',
      createdAt: '2026-10-07T06:20:00.000Z',
    },
    [
      { material: 'glass', label: 'Glass bottles and jars', estKg: 6.5, confidence: 0.85 },
      { material: 'paper', label: 'Old magazines', estKg: 1, confidence: 0.9 },
    ],
  ),
]
