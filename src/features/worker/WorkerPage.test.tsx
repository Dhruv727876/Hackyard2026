import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pickup, Worker } from '@/domain/types'
import { DEMO_WORKER_ID } from './constants'
import WorkerPage from './WorkerPage'

const mockListOpenPickups = vi.fn()
const mockListPickups = vi.fn()
const mockListWorkers = vi.fn()
const mockAcceptPickup = vi.fn()
const mockCompletePickup = vi.fn()

vi.mock('@/data', () => ({
  repo: {
    listOpenPickups: (...args: unknown[]) => mockListOpenPickups(...args),
    listPickups: (...args: unknown[]) => mockListPickups(...args),
    listWorkers: (...args: unknown[]) => mockListWorkers(...args),
    acceptPickup: (...args: unknown[]) => mockAcceptPickup(...args),
    completePickup: (...args: unknown[]) => mockCompletePickup(...args),
  },
}))

const WORKER_2: Worker = {
  id: 'worker-2',
  name: 'Sunita Devi',
  area: 'ward-151',
  lat: 12.9338,
  lng: 77.6205,
  activePickups: 1,
}

// Distance to worker (12.9338, 77.6205):
// pickup-close: lat 12.9340, lng 77.6210 (~0.1 km)
// pickup-far: lat 12.9520, lng 77.6150 (~2.1 km)
const ACCEPTED_PICKUP: Pickup = {
  id: 'pickup-accepted',
  householdId: 'household-imran',
  items: [
    {
      material: 'cardboard',
      label: 'Cardboard boxes',
      estKg: 2.4,
      ratePerKg: 9,
      value: 21.6,
      recyclable: true,
      confidence: 0.9,
    },
  ],
  totalValue: 21.6,
  totalKg: 2.4,
  address: '9, Jyoti Nivas Lane',
  lat: 12.934,
  lng: 77.621,
  slot: 'Tomorrow 9–11am',
  status: 'accepted',
  workerId: 'worker-2',
  createdAt: '2026-10-06T02:10:00.000Z',
}

const REQUESTED_PICKUP: Pickup = {
  id: 'pickup-requested',
  householdId: 'household-lakshmi',
  items: [
    {
      material: 'metal',
      label: 'Copper pipes',
      estKg: 1.5,
      ratePerKg: 35,
      value: 52.5,
      recyclable: true,
      confidence: 0.8,
    },
  ],
  totalValue: 52.5,
  totalKg: 1.5,
  address: '7, Water Tank Road',
  lat: 12.952,
  lng: 77.615,
  slot: 'Tomorrow 5–7pm',
  status: 'requested',
  createdAt: '2026-10-07T03:00:00.000Z',
}

const OTHER_WORKER_ACCEPTED_PICKUP: Pickup = {
  id: 'pickup-other',
  householdId: 'household-other',
  items: [],
  totalValue: 0,
  totalKg: 0,
  address: '10, Other Road',
  lat: 12.93,
  lng: 77.62,
  slot: 'Today',
  status: 'accepted',
  workerId: 'worker-1',
  createdAt: '2026-10-06T00:00:00.000Z',
}

describe('WorkerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListWorkers.mockResolvedValue([WORKER_2])
    mockListPickups.mockResolvedValue([
      REQUESTED_PICKUP,
      ACCEPTED_PICKUP,
      OTHER_WORKER_ACCEPTED_PICKUP,
    ])
    mockListOpenPickups.mockResolvedValue([REQUESTED_PICKUP])
  })

  it('renders "Nearby jobs" and the worker name', async () => {
    render(<WorkerPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Nearby jobs' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Sunita Devi')).toBeInTheDocument()
    })
  })

  it('renders open and own-accepted pickups sorted by distance, excluding other workers jobs', async () => {
    render(<WorkerPage />)

    await waitFor(() => {
      expect(screen.getByText('9, Jyoti Nivas Lane')).toBeInTheDocument()
    })

    expect(screen.getByText('7, Water Tank Road')).toBeInTheDocument()
    expect(screen.queryByText('10, Other Road')).not.toBeInTheDocument()

    // Closer job (pickup-accepted) should appear before farther job (pickup-requested)
    const cards = screen.getAllByText(/km away/)
    expect(cards).toHaveLength(2)
    expect(cards[0].textContent).toContain('0.1 km away')
    expect(cards[1].textContent).toContain('2.1 km away')
  })

  it('"Accept Job" calls repo.acceptPickup with the correct ID and DEMO_WORKER_ID', async () => {
    mockAcceptPickup.mockResolvedValueOnce({
      ...REQUESTED_PICKUP,
      status: 'accepted',
      workerId: DEMO_WORKER_ID,
    })

    render(<WorkerPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Accept Job' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Accept Job' }))

    await waitFor(() => {
      expect(mockAcceptPickup).toHaveBeenCalledWith('pickup-requested', 'worker-2')
    })
  })

  it('"Mark Complete" calls repo.completePickup with the correct ID', async () => {
    mockCompletePickup.mockResolvedValueOnce({
      ...ACCEPTED_PICKUP,
      status: 'completed',
    })

    render(<WorkerPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }))

    await waitFor(() => {
      expect(mockCompletePickup).toHaveBeenCalledWith('pickup-accepted')
    })
  })

  it('shows empty state when no jobs are available', async () => {
    mockListPickups.mockResolvedValue([])
    mockListOpenPickups.mockResolvedValue([])

    render(<WorkerPage />)

    await waitFor(() => {
      expect(screen.getByText('No jobs available right now.')).toBeInTheDocument()
    })
  })
})
