import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pickup, Worker } from '@/domain/types'
import PickupsPage from './PickupsPage'

const mockListPickupsByHousehold = vi.fn()
const mockListWorkers = vi.fn()
const mockCreatePickup = vi.fn()

vi.mock('@/data', () => ({
  repo: {
    listPickupsByHousehold: (...args: unknown[]) => mockListPickupsByHousehold(...args),
    listWorkers: (...args: unknown[]) => mockListWorkers(...args),
    createPickup: (...args: unknown[]) => mockCreatePickup(...args),
  },
  RepoError: class RepoError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

const COMPLETED_PICKUP: Pickup = {
  id: 'pickup-1',
  householdId: 'household-asha',
  items: [
    {
      material: 'paper',
      label: 'Newspaper bundle',
      estKg: 3.2,
      ratePerKg: 12,
      value: 38.4,
      recyclable: true,
      confidence: 0.9,
    },
    {
      material: 'metal',
      label: 'Aluminium tins',
      estKg: 0.6,
      ratePerKg: 35,
      value: 21,
      recyclable: true,
      confidence: 0.8,
    },
  ],
  totalValue: 59.4,
  totalKg: 3.8,
  address: '412, 5th Cross, Koramangala 5th Block',
  lat: 12.9402,
  lng: 77.6295,
  slot: 'Today 2–4pm',
  status: 'completed',
  workerId: 'worker-1',
  createdAt: '2026-09-27T04:30:00.000Z',
  completedAt: '2026-09-28T05:45:00.000Z',
}

const REQUESTED_PICKUP: Pickup = {
  id: 'pickup-2',
  householdId: 'household-asha',
  items: [
    {
      material: 'cardboard',
      label: 'Cardboard boxes',
      estKg: 2.0,
      ratePerKg: 9,
      value: 18,
      recyclable: true,
      confidence: 0.9,
    },
  ],
  totalValue: 18,
  totalKg: 2.0,
  address: '7, Water Tank Road, Koramangala 6th Block',
  lat: 12.947,
  lng: 77.632,
  slot: 'Tomorrow 5–7pm',
  status: 'requested',
  createdAt: '2026-10-07T03:00:00.000Z',
}

const WORKER_1: Worker = {
  id: 'worker-1',
  name: 'Ravi Kumar',
  area: 'ward-151',
  lat: 12.9355,
  lng: 77.6251,
  activePickups: 0,
}

describe('PickupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListPickupsByHousehold.mockResolvedValue([COMPLETED_PICKUP, REQUESTED_PICKUP])
    mockListWorkers.mockResolvedValue([WORKER_1])
  })

  it('renders "My pickups" heading and loading skeleton appears then list', async () => {
    render(
      <MemoryRouter>
        <PickupsPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'My pickups' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /loading pickups/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('412, 5th Cross, Koramangala 5th Block')).toBeInTheDocument()
    })

    expect(screen.queryByRole('status', { name: /loading pickups/i })).not.toBeInTheDocument()
    expect(screen.getByTitle('7, Water Tank Road, Koramangala 6th Block')).toBeInTheDocument()
  })

  it('completed pickup shows status "Completed" + impact line; requested shows "Requested"', async () => {
    render(
      <MemoryRouter>
        <PickupsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    expect(screen.getByText('Requested')).toBeInTheDocument()
    expect(
      screen.getByText('3.8 kg diverted · ₹59 paid · 4.1 kg CO₂ saved'),
    ).toBeInTheDocument()
  })

  it('ImpactCard shows correct totals for the completed pickup', async () => {
    render(
      <MemoryRouter>
        <PickupsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Your impact so far' })).toBeInTheDocument()
    })

    expect(screen.getAllByText('3.8 kg').length).toBeGreaterThan(0)
    expect(screen.getAllByText('₹59').length).toBeGreaterThan(0)
    expect(screen.getByText('4.1 kg')).toBeInTheDocument()
    expect(
      screen.getByText('Thank you for keeping 3.8 kg out of landfill.'),
    ).toBeInTheDocument()
  })
})
