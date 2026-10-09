import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WardStats } from '@/domain/types'
import WardPage from './WardPage'

const mockGetWardStats = vi.fn()

vi.mock('@/data', () => ({
  repo: {
    getWardStats: (...args: unknown[]) => mockGetWardStats(...args),
  },
}))

const MOCK_WARD_STATS: WardStats = {
  wardId: 'ward-151',
  totalKg: 12.5,
  totalINR: 230,
  co2Saved: 14.8,
  pickupsCompleted: 4,
  byMaterial: {
    paper: 5.0,
    cardboard: 3.5,
    pet: 2.0,
    plastic: 0,
    glass: 0,
    metal: 2.0,
    e_waste: 0,
    non_recyclable: 0,
  },
}

const ZERO_WARD_STATS: WardStats = {
  wardId: 'ward-151',
  totalKg: 0,
  totalINR: 0,
  co2Saved: 0,
  pickupsCompleted: 0,
  byMaterial: {
    paper: 0,
    cardboard: 0,
    pet: 0,
    plastic: 0,
    glass: 0,
    metal: 0,
    e_waste: 0,
    non_recyclable: 0,
  },
}

describe('WardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWardStats.mockResolvedValue(MOCK_WARD_STATS)
  })

  it('renders "Ward 151 Impact" heading and stat cards', async () => {
    render(<WardPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Ward 151 Impact' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('12.5 kg')).toBeInTheDocument()
    })

    expect(screen.getByText('₹230')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('14.8 kg')).toBeInTheDocument()
  })

  it('renders the recycling chart and material breakdown when data is present', async () => {
    render(<WardPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Material breakdown' })).toBeInTheDocument()
    })

    // Container with Recharts SVG should be in document
    const chartContainer = document.querySelector('.recharts-responsive-container')
    expect(chartContainer).toBeInTheDocument()
  })

  it('shows "No recycling data yet." when stats are all zeros', async () => {
    mockGetWardStats.mockResolvedValueOnce(ZERO_WARD_STATS)

    render(<WardPage />)

    await waitFor(() => {
      expect(screen.getByText('No recycling data yet.')).toBeInTheDocument()
    })

    expect(document.querySelector('.recharts-responsive-container')).not.toBeInTheDocument()
  })
})
