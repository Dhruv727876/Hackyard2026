import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepoError } from '@/data'
import type { ScrapItemInput } from '@/domain/types'
import { PickupRequestForm } from './PickupRequestForm'

const mockCreatePickup = vi.fn()

vi.mock('@/data', () => ({
  repo: {
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

const SAMPLE_ITEMS: ScrapItemInput[] = [
  { material: 'paper', label: 'Old newspapers', estKg: 3.0, confidence: 0.9 },
  { material: 'metal', label: 'Copper tubes', estKg: 1.0, confidence: 0.8 },
]

describe('PickupRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('with null items → "Go back and scan first" message and Link to "/"', () => {
    render(
      <MemoryRouter>
        <PickupRequestForm items={null} onSubmitted={vi.fn()} />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('No scan data. Go back and scan your scrap first.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Scan scrap' })).toHaveAttribute('href', '/')
  })

  it('with items → form renders with summary strip', () => {
    render(
      <MemoryRouter>
        <PickupRequestForm items={SAMPLE_ITEMS} onSubmitted={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/2 items · 4\.0 kg · ₹71/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Street, area, landmark')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request pickup' })).toBeInTheDocument()
  })

  it('submit calls repo.createPickup with correct householdId, items, address, lat, lng, slot', async () => {
    const handleSubmitted = vi.fn()
    mockCreatePickup.mockResolvedValueOnce({ id: 'pickup-123' })

    render(
      <MemoryRouter>
        <PickupRequestForm items={SAMPLE_ITEMS} onSubmitted={handleSubmitted} />
      </MemoryRouter>,
    )

    const addressInput = screen.getByPlaceholderText('Street, area, landmark')
    fireEvent.change(addressInput, { target: { value: '123 Indiranagar, Bangalore' } })

    const slotSelect = screen.getByLabelText('Pickup slot')
    fireEvent.change(slotSelect, { target: { value: 'Tomorrow 2–4pm' } })

    const submitButton = screen.getByRole('button', { name: 'Request pickup' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreatePickup).toHaveBeenCalledTimes(1)
    })

    expect(mockCreatePickup).toHaveBeenCalledWith({
      householdId: 'household-asha',
      items: SAMPLE_ITEMS,
      address: '123 Indiranagar, Bangalore',
      lat: 12.9352,
      lng: 77.6245,
      slot: 'Tomorrow 2–4pm',
    })

    expect(handleSubmitted).toHaveBeenCalledTimes(1)
  })

  it('on error → inline error shown', async () => {
    mockCreatePickup.mockRejectedValueOnce(
      new RepoError('storage-unavailable', 'Local storage error'),
    )

    render(
      <MemoryRouter>
        <PickupRequestForm items={SAMPLE_ITEMS} onSubmitted={vi.fn()} />
      </MemoryRouter>,
    )

    const addressInput = screen.getByPlaceholderText('Street, area, landmark')
    fireEvent.change(addressInput, { target: { value: 'Some address' } })

    fireEvent.click(screen.getByRole('button', { name: 'Request pickup' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Local storage error')
    })
  })

  it('geolocation button sets the pin text', async () => {
    const mockGetCurrentPosition = vi.fn((success) => {
      success({ coordinates: { latitude: 12.93, longitude: 77.62 } })
    })

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    })

    render(
      <MemoryRouter>
        <PickupRequestForm items={SAMPLE_ITEMS} onSubmitted={vi.fn()} />
      </MemoryRouter>,
    )

    const locateButton = screen.getByRole('button', { name: 'Use my location' })
    fireEvent.click(locateButton)

    await waitFor(() => {
      expect(screen.getByText('Pin: 12.9300, 77.6200')).toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })
})
