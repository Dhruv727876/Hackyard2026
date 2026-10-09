import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCAN_CONFIG } from '@/config/scan'
import { SAMPLE_SCAN_RESULT } from './sampleScan'
import { resetScanThrottle, scanScrap } from './scanService'

const { generateContentMock } = vi.hoisted(() => ({ generateContentMock: vi.fn() }))

// A regular (non-arrow) function is required: scanScrap calls `new GoogleGenAI(...)`.
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function GoogleGenAIMock() {
    return { models: { generateContent: generateContentMock } }
  }),
  Type: {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
  },
}))

// jsdom has no canvas, so the real compressImage cannot run here.
vi.mock('@/lib/image', () => ({
  compressImage: vi.fn(async () => new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' })),
  blobToBase64: vi.fn(async () => 'AAAA'),
}))

const photo = (): File => new File([new Uint8Array(8)], 'p.jpg', { type: 'image/jpeg' })

const VALID_SCAN_JSON = JSON.stringify({
  scrapDetected: true,
  overallConfidence: 0.8,
  items: [
    { material: 'paper', label: 'Newspaper stack', estKg: 2.4, confidence: 0.9 },
    { material: 'metal', label: 'Aluminium cans', estKg: 0.4, confidence: 0.6 },
  ],
})

const NO_SCRAP_JSON = JSON.stringify({
  scrapDetected: false,
  overallConfidence: 0.3,
  items: [],
})

const LOW_CONFIDENCE_JSON = JSON.stringify({
  scrapDetected: true,
  overallConfidence: 0.2,
  items: [
    { material: 'paper', label: 'Something', estKg: 1, confidence: 0.2 },
    { material: 'glass', label: 'Something else', estKg: 1, confidence: 0.1 },
  ],
})

const MIXED_CONFIDENCE_JSON = JSON.stringify({
  scrapDetected: true,
  overallConfidence: 0.6,
  items: [
    { material: 'paper', label: 'Newspaper stack', estKg: 2.4, confidence: 0.9 },
    { material: 'glass', label: 'Blurry jar', estKg: 0.5, confidence: 0.2 },
  ],
})

beforeEach(() => {
  resetScanThrottle()
  generateContentMock.mockReset()
  vi.unstubAllEnvs()
  vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('scanScrap', () => {
  it('returns the sample scan without calling the SDK when no API key is set', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '')
    const outcome = await scanScrap([photo()])

    expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
    expect(generateContentMock).not.toHaveBeenCalled()
  })

  it('returns parsed gemini results on a valid response', async () => {
    generateContentMock.mockResolvedValue({ text: VALID_SCAN_JSON })
    const outcome = await scanScrap([photo(), photo()])

    expect(generateContentMock).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({
      kind: 'ok',
      source: 'gemini',
      result: {
        scrapDetected: true,
        overallConfidence: 0.8,
        items: [
          { material: 'paper', label: 'Newspaper stack', estKg: 2.4, confidence: 0.9 },
          { material: 'metal', label: 'Aluminium cans', estKg: 0.4, confidence: 0.6 },
        ],
      },
    })
  })

  it('falls back to the sample on malformed model output', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      generateContentMock.mockResolvedValue({ text: "I can't help with that." })
      const outcome = await scanScrap([photo()])

      expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('falls back to the sample when the model returns undefined text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      generateContentMock.mockResolvedValue({ text: undefined })
      const outcome = await scanScrap([photo()])

      expect(generateContentMock).toHaveBeenCalledTimes(1)
      expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('falls back to the sample on invalid JSON text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      generateContentMock.mockResolvedValue({ text: '{broken json' })
      const outcome = await scanScrap([photo()])

      expect(generateContentMock).toHaveBeenCalledTimes(1)
      expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('returns retry unclear when the model detects no scrap', async () => {
    generateContentMock.mockResolvedValue({ text: NO_SCRAP_JSON })
    expect(await scanScrap([photo()])).toEqual({ kind: 'retry', reason: 'unclear' })
  })

  it('returns retry unclear when every item is below the confidence threshold', async () => {
    generateContentMock.mockResolvedValue({ text: LOW_CONFIDENCE_JSON })
    expect(await scanScrap([photo()])).toEqual({ kind: 'retry', reason: 'unclear' })
  })

  it('keeps mixed-confidence items as ok gemini results', async () => {
    generateContentMock.mockResolvedValue({ text: MIXED_CONFIDENCE_JSON })
    const outcome = await scanScrap([photo()])

    if (outcome.kind !== 'ok') throw new Error('Expected an ok outcome')
    expect(outcome.source).toBe('gemini')
    expect(outcome.result.items).toHaveLength(2)
  })

  it('falls back to the sample when the SDK call rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      generateContentMock.mockRejectedValue(new Error('network down'))
      const outcome = await scanScrap([photo()])

      expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('aborts and falls back to the sample after the request timeout', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      generateContentMock.mockReturnValue(new Promise(() => {})) // never resolves
      const pending = scanScrap([photo()])
      await vi.advanceTimersByTimeAsync(SCAN_CONFIG.requestTimeoutMs)

      expect(await pending).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
      warn.mockRestore()
    }
  })

  it('rate-limits immediate repeat calls and unlocks after resetScanThrottle', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '')
    expect(await scanScrap([photo()])).toEqual({
      kind: 'ok',
      result: SAMPLE_SCAN_RESULT,
      source: 'sample',
    })
    expect(await scanScrap([photo()])).toEqual({ kind: 'retry', reason: 'rate-limited' })

    resetScanThrottle()
    expect(await scanScrap([photo()])).toEqual({
      kind: 'ok',
      result: SAMPLE_SCAN_RESULT,
      source: 'sample',
    })
  })

  it('returns retry unclear for zero images without calling the SDK', async () => {
    const outcome = await scanScrap([])
    expect(outcome).toEqual({ kind: 'retry', reason: 'unclear' })
    expect(generateContentMock).not.toHaveBeenCalled()
  })

  it('uses VITE_GEMINI_MODEL when set and SCAN_CONFIG.model otherwise', async () => {
    generateContentMock.mockResolvedValue({ text: VALID_SCAN_JSON })
    await scanScrap([photo()])
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: SCAN_CONFIG.model }),
    )

    resetScanThrottle()
    vi.stubEnv('VITE_GEMINI_MODEL', 'gemini-test-model')
    await scanScrap([photo()])
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-test-model' }),
    )
  })
})
