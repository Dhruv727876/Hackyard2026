import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCAN_CONFIG } from '@/config/scan'
import { SAMPLE_SCAN_RESULT } from './sampleScan'
import { extractJsonObject, resetScanThrottle, scanScrap } from './scanService'

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

function makeNvidiaResponse(content: unknown, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => ({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
    }),
  }
}

const mockFetch = vi.fn()

beforeEach(() => {
  resetScanThrottle()
  mockFetch.mockReset()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('extractJsonObject', () => {
  it('extracts plain JSON', () => {
    const input = '{"scrapDetected":true,"overallConfidence":0.8,"items":[]}'
    expect(extractJsonObject(input)).toBe(input)
  })

  it('extracts fenced JSON', () => {
    const input = '```json\n{"scrapDetected":true,"items":[]}\n```'
    expect(extractJsonObject(input)).toBe('{"scrapDetected":true,"items":[]}')
  })

  it('extracts think-tagged JSON', () => {
    const input =
      '<think>I see some scrap\nLet me format it.</think>{"scrapDetected":true,"items":[]}'
    expect(extractJsonObject(input)).toBe('{"scrapDetected":true,"items":[]}')
  })

  it('extracts JSON with prose before and after', () => {
    const input = 'Here is the result:\n{"scrapDetected":true,"items":[]}\nHope this helps!'
    expect(extractJsonObject(input)).toBe('{"scrapDetected":true,"items":[]}')
  })

  it('returns null for text with no braces', () => {
    expect(extractJsonObject('No scrap found in this image.')).toBeNull()
  })

  it('returns null for malformed brace ordering or incomplete object', () => {
    expect(extractJsonObject('} invalid {')).toBeNull()
    expect(extractJsonObject('{ incomplete json')).toBeNull()
  })
})

describe('scanScrap', () => {
  it('falls back to the sample and logs warning when proxy returns 503 (e.g. missing server key)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mockFetch.mockResolvedValueOnce(makeNvidiaResponse(null, 503, 'Service Unavailable'))
      const outcome = await scanScrap([photo()])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch.mock.calls[0][0]).toBe('/api/scan')
      expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalledWith(
        '[scrap-scan] falling back to sample data:',
        '503 Service Unavailable',
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('returns parsed nvidia results on a valid plain JSON response', async () => {
    mockFetch.mockResolvedValueOnce(makeNvidiaResponse(VALID_SCAN_JSON))
    const outcome = await scanScrap([photo(), photo()])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]
    expect(calledUrl).toBe('/api/scan')
    expect(calledUrl).toBe(SCAN_CONFIG.apiUrl)
    expect(calledInit.method).toBe('POST')
    expect(calledInit.headers).toEqual({
      'Content-Type': 'application/json',
    })
    expect(calledInit.headers).not.toHaveProperty('Authorization')

    const parsedBody = JSON.parse(calledInit.body)
    expect(parsedBody.model).toBe(SCAN_CONFIG.model)
    expect(parsedBody.stream).toBe(false)
    expect(parsedBody.max_tokens).toBe(1024)
    expect(parsedBody.temperature).toBe(0.2)
    expect(parsedBody.top_p).toBe(0.95)

    expect(outcome).toEqual({
      kind: 'ok',
      source: 'nvidia',
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

  it('handles markdown-fenced JSON response', async () => {
    mockFetch.mockResolvedValueOnce(
      makeNvidiaResponse('```json\n' + VALID_SCAN_JSON + '\n```'),
    )
    const outcome = await scanScrap([photo()])

    expect(outcome.kind).toBe('ok')
    if (outcome.kind === 'ok') {
      expect(outcome.source).toBe('nvidia')
      expect(outcome.result.items).toHaveLength(2)
    }
  })

  it('handles <think>reasoning</think> followed by JSON', async () => {
    mockFetch.mockResolvedValueOnce(
      makeNvidiaResponse(
        '<think>The user has uploaded newspapers and cans.</think>' + VALID_SCAN_JSON,
      ),
    )
    const outcome = await scanScrap([photo()])

    expect(outcome.kind).toBe('ok')
    if (outcome.kind === 'ok') {
      expect(outcome.source).toBe('nvidia')
      expect(outcome.result.items).toHaveLength(2)
    }
  })

  it('falls back to the sample on invalid JSON response text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mockFetch.mockResolvedValueOnce(makeNvidiaResponse('{broken json'))
      const outcome = await scanScrap([photo()])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('falls back to the sample when the model returns undefined content', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mockFetch.mockResolvedValueOnce(makeNvidiaResponse(undefined))
      const outcome = await scanScrap([photo()])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('returns retry unclear when the model detects no scrap', async () => {
    mockFetch.mockResolvedValueOnce(makeNvidiaResponse(NO_SCRAP_JSON))
    expect(await scanScrap([photo()])).toEqual({ kind: 'retry', reason: 'unclear' })
  })

  it('returns retry unclear when every item is below the confidence threshold', async () => {
    mockFetch.mockResolvedValueOnce(makeNvidiaResponse(LOW_CONFIDENCE_JSON))
    expect(await scanScrap([photo()])).toEqual({ kind: 'retry', reason: 'unclear' })
  })

  it('retains both items when one is low-confidence and one is high-confidence', async () => {
    mockFetch.mockResolvedValueOnce(makeNvidiaResponse(MIXED_CONFIDENCE_JSON))
    const outcome = await scanScrap([photo()])

    if (outcome.kind !== 'ok') throw new Error('Expected an ok outcome')
    expect(outcome.source).toBe('nvidia')
    expect(outcome.result.items).toHaveLength(2)
  })

  it('falls back to the sample when HTTP returns 401/non-2xx', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mockFetch.mockResolvedValueOnce(makeNvidiaResponse(null, 401, 'Unauthorized'))
      const outcome = await scanScrap([photo()])

      expect(outcome).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalledWith(
        '[scrap-scan] falling back to sample data:',
        '401 Unauthorized',
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('falls back to the sample when fetch rejects/network error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
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
      mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
      const pending = scanScrap([photo()])
      await vi.advanceTimersByTimeAsync(SCAN_CONFIG.requestTimeoutMs)

      expect(await pending).toEqual({ kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' })
      expect(warn).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
      warn.mockRestore()
    }
  })

  it('preserves throttle behavior: rate-limits immediate repeats and unlocks after resetScanThrottle', async () => {
    mockFetch.mockResolvedValue(makeNvidiaResponse(VALID_SCAN_JSON))
    const first = await scanScrap([photo()])
    expect(first.kind).toBe('ok')
    expect(await scanScrap([photo()])).toEqual({ kind: 'retry', reason: 'rate-limited' })

    resetScanThrottle()
    const third = await scanScrap([photo()])
    expect(third.kind).toBe('ok')
  })

  it('returns retry unclear for zero images without calling fetch', async () => {
    const outcome = await scanScrap([])
    expect(outcome).toEqual({ kind: 'retry', reason: 'unclear' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('uses VITE_NVIDIA_MODEL override when set and SCAN_CONFIG.model by default', async () => {
    mockFetch.mockResolvedValueOnce(makeNvidiaResponse(VALID_SCAN_JSON))
    await scanScrap([photo()])
    const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(firstCallBody.model).toBe(SCAN_CONFIG.model)

    resetScanThrottle()
    vi.stubEnv('VITE_NVIDIA_MODEL', 'custom/nemotron-model')
    mockFetch.mockResolvedValueOnce(makeNvidiaResponse(VALID_SCAN_JSON))
    await scanScrap([photo()])
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(secondCallBody.model).toBe('custom/nemotron-model')
  })
})
