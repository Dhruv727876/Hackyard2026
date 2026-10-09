import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SAMPLE_SCAN_RESULT } from '@/services/sampleScan'
import { scanScrap } from '@/services/scanService'
import ScanPage from './ScanPage'
import type { ScanResult } from '@/services/scanContract'

vi.mock('@/services/scanService')

const mockScanScrap = vi.mocked(scanScrap)

function makePhoto(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['x'], name, { type })
}

const TWO_ITEMS_RESULT: ScanResult = {
  scrapDetected: true,
  overallConfidence: 0.85,
  items: [
    { material: 'paper', label: 'Old newspapers', estKg: 3.5, confidence: 0.9 },
    { material: 'metal', label: 'Copper pipes', estKg: 1.0, confidence: 0.8 },
  ],
}

beforeEach(() => {
  vi.resetAllMocks()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('ScanPage', () => {
  it('Scan button is disabled with no photos; enabled after adding one', () => {
    render(<ScanPage />)
    const scanButton = screen.getByRole('button', { name: /^scan scrap$/i })
    expect(scanButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    expect(scanButton).toBeEnabled()
  })

  it("invalid file type (gif) → inline error with the validator's reason; Scan button stays disabled", () => {
    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('bad.gif', 'image/gif')] },
    })

    expect(
      screen.getByText(/Not a supported image type \(JPEG, PNG or WebP\)\./i),
    ).toBeInTheDocument()
    const scanButton = screen.getByRole('button', { name: /^scan scrap$/i })
    expect(scanButton).toBeDisabled()
  })

  it('adding 4 photos → 3 thumbnails, cap error shown', () => {
    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: {
        files: [
          makePhoto('1.jpg'),
          makePhoto('2.jpg'),
          makePhoto('3.jpg'),
          makePhoto('4.jpg'),
        ],
      },
    })

    expect(screen.getAllByAltText(/selected photo/i)).toHaveLength(3)
    expect(
      screen.getByText(/You can add up to 3 photos per scan\./i),
    ).toBeInTheDocument()
  })

  it("ok + source 'gemini' → items render (label, material select, weight), totals card shows formatINR of valuateItems of those items, NO sample badge", async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'ok',
      result: TWO_ITEMS_RESULT,
      source: 'gemini',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(screen.getByText('Old newspapers')).toBeInTheDocument()
    })

    expect(screen.getByText('Copper pipes')).toBeInTheDocument()
    expect(screen.getByLabelText('Material for Old newspapers')).toHaveValue('paper')
    expect(screen.getByLabelText('Weight for Old newspapers')).toHaveValue(3.5)
    expect(screen.getByText('₹77')).toBeInTheDocument()
    expect(screen.queryByText('Sample result')).not.toBeInTheDocument()
  })

  it("ok + source 'sample' → sample badge shown plus the explanation line", async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'ok',
      result: SAMPLE_SCAN_RESULT,
      source: 'sample',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(screen.getByText('Sample result')).toBeInTheDocument()
    })
    expect(
      screen.getByText("Gemini wasn't reachable, so this demo result is shown."),
    ).toBeInTheDocument()
  })

  it("weight edit updates totals live: type into the first item's weight input → total value changes to the hand-computed sum", async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'ok',
      result: {
        scrapDetected: true,
        overallConfidence: 0.9,
        items: [
          {
            material: 'paper',
            label: 'Stack of newspapers',
            estKg: 3.5,
            confidence: 0.9,
          },
        ],
      },
      source: 'gemini',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(screen.getAllByText('₹42')).toHaveLength(2)
    })

    const weightInput = screen.getByLabelText('Weight for Stack of newspapers')
    fireEvent.change(weightInput, { target: { value: '1' } })

    expect(screen.getAllByText('₹12')).toHaveLength(2)
  })

  it('clearing the weight field shows no "NaN" anywhere in the document body', async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'ok',
      result: {
        scrapDetected: true,
        overallConfidence: 0.9,
        items: [
          {
            material: 'paper',
            label: 'Stack of newspapers',
            estKg: 3.5,
            confidence: 0.9,
          },
        ],
      },
      source: 'gemini',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(
        screen.getByLabelText('Weight for Stack of newspapers'),
      ).toBeInTheDocument()
    })

    const weightInput = screen.getByLabelText('Weight for Stack of newspapers')
    fireEvent.change(weightInput, { target: { value: '' } })

    expect(document.body.textContent).not.toContain('NaN')
  })

  it('low-confidence item (conf 0.2) shows "Please review"; high-confidence does not', async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'ok',
      result: {
        scrapDetected: true,
        overallConfidence: 0.6,
        items: [
          { material: 'paper', label: 'Fuzzy paper', estKg: 1, confidence: 0.2 },
          { material: 'glass', label: 'Clear bottle', estKg: 1, confidence: 0.8 },
        ],
      },
      source: 'gemini',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(screen.getByText('Fuzzy paper')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Please review')).toHaveLength(1)
  })

  it('non_recyclable item shows ₹0 and its disposalTip', async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'ok',
      result: {
        scrapDetected: true,
        overallConfidence: 0.8,
        items: [
          {
            material: 'non_recyclable',
            label: 'Chip packets',
            estKg: 0.1,
            confidence: 0.7,
          },
        ],
      },
      source: 'gemini',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(screen.getByText('Chip packets')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        /Not accepted by kabadiwalas\. Hand to municipal dry-waste centre/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText('₹0')).toHaveLength(2)
  })

  it("material select change updates that item's rate and value", async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'ok',
      result: {
        scrapDetected: true,
        overallConfidence: 0.9,
        items: [{ material: 'paper', label: 'Scrap bundle', estKg: 1, confidence: 0.9 }],
      },
      source: 'gemini',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(screen.getByText('₹12/kg')).toBeInTheDocument()
    })
    expect(screen.getAllByText('₹12')).toHaveLength(2)

    const materialSelect = screen.getByLabelText('Material for Scrap bundle')
    fireEvent.change(materialSelect, { target: { value: 'metal' } })

    expect(screen.getByText('₹35/kg')).toBeInTheDocument()
    expect(screen.getAllByText('₹35')).toHaveLength(2)
  })

  it("retry 'unclear' → message + 'Retry scan' button present, photos still listed", async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'retry',
      reason: 'unclear',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('pile.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(
        screen.getByText(
          /We couldn't clearly spot scrap in these photos\. Try better lighting, a plain background, or move closer\./i,
        ),
      ).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Retry scan' })).toBeInTheDocument()
    expect(screen.getAllByAltText(/selected photo/i)).toHaveLength(1)
  })

  it("retry 'rate-limited' → rate-limit message present", async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'retry',
      reason: 'rate-limited',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('pile.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Please wait a few seconds before scanning again.'),
      ).toBeInTheDocument()
    })
  })

  it('"Scan again" in results returns to the picker with no thumbnails and a disabled Scan button', async () => {
    mockScanScrap.mockResolvedValueOnce({
      kind: 'ok',
      result: TWO_ITEMS_RESULT,
      source: 'gemini',
    })

    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText(/add photos/i), {
      target: { files: [makePhoto('a.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /^scan scrap$/i }))

    await waitFor(() => {
      expect(screen.getByText('Old newspapers')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Scan again' }))

    expect(screen.queryByAltText(/selected photo/i)).not.toBeInTheDocument()
    const scanButton = screen.getByRole('button', { name: /^scan scrap$/i })
    expect(scanButton).toBeDisabled()
  })
})
