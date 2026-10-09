import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ScrapItemInput } from '@/domain/types'
import NewPickupPage from './NewPickupPage'

const SAMPLE_ITEMS: ScrapItemInput[] = [
  { material: 'paper', label: 'Old newspapers', estKg: 2.0, confidence: 0.9 },
]

describe('NewPickupPage', () => {
  it('with router state items → form shows', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/pickups/new', state: { items: SAMPLE_ITEMS } }]}>
        <NewPickupPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Request a pickup' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Street, area, landmark')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request pickup' })).toBeInTheDocument()
  })

  it('without state → "Go back" message', () => {
    render(
      <MemoryRouter initialEntries={['/pickups/new']}>
        <NewPickupPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('No scan data. Go back and scan your scrap first.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Scan scrap' })).toBeInTheDocument()
  })
})
