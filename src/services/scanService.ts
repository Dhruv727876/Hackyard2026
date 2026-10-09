import { GoogleGenAI } from '@google/genai'
import { SCAN_CONFIG } from '@/config/scan'
import { blobToBase64, compressImage } from '@/lib/image'
import { parseScanResponse } from './scanContract'
import type { ScanOutcome } from './scanContract'
import type { Part } from '@google/genai'
import { SCAN_RESPONSE_SCHEMA, SCAN_SYSTEM_PROMPT } from './scanPrompt'
import { SAMPLE_SCAN_RESULT } from './sampleScan'

// Client-side API key is a demo/shortlisting shortcut; production routes
// through a Cloud Function proxy (noted in README).
let cachedClient: GoogleGenAI | null = null
let lastScanAt = 0

export function resetScanThrottle(): void {
  lastScanAt = 0
}

function sampleOutcome(): ScanOutcome {
  return { kind: 'ok', result: SAMPLE_SCAN_RESULT, source: 'sample' }
}

function unclearOutcome(): ScanOutcome {
  return { kind: 'retry', reason: 'unclear' }
}

function getClient(apiKey: string): GoogleGenAI {
  if (cachedClient === null) {
    cachedClient = new GoogleGenAI({ apiKey })
  }
  return cachedClient
}

/**
 * One scan request: compress → base64 → Gemini Vision → parse → guardrails.
 * Never throws and never white-screens: user-actionable problems come back as
 * `{ kind: 'retry', reason: 'unclear' | 'rate-limited' }`, system failures
 * (no key, network, timeout, malformed output) as the labelled sample scan.
 */
export async function scanScrap(images: File[]): Promise<ScanOutcome> {
  const now = Date.now()
  if (now - lastScanAt < SCAN_CONFIG.minScanIntervalMs) {
    return { kind: 'retry', reason: 'rate-limited' }
  }
  lastScanAt = now

  if (images.length === 0) return unclearOutcome()

  // Read env lazily so tests can stub it after module load.
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  const model = import.meta.env.VITE_GEMINI_MODEL?.trim() || SCAN_CONFIG.model
  if (!apiKey) return sampleOutcome()

  const selected = images.slice(0, SCAN_CONFIG.maxImages)
  const parts: Part[] = await Promise.all(
    selected.map(async (image) => {
      // compressImage emits JPEG, so inlineData is always image/jpeg.
      const blob = await compressImage(image)
      return { inlineData: { mimeType: 'image/jpeg', data: await blobToBase64(blob) } }
    }),
  )
  parts.push({ text: `Analyze these ${selected.length} photo(s) of household scrap.` })

  let text: string | undefined
  try {
    text = await generateWithTimeout(apiKey, model, parts)
  } catch (error) {
    console.warn('[scrap-scan] falling back to sample data:', error)
    return sampleOutcome()
  }

  // response.text is the model's JSON string; parseScanResponse wants the object.
  // Empty or undefined text (safety blocks, empty candidates) routes to sample fallback.
  if (text === undefined || text.trim() === '') {
    console.warn('[scrap-scan] falling back to sample data: malformed model response')
    return sampleOutcome()
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    console.warn('[scrap-scan] falling back to sample data: malformed model response')
    return sampleOutcome()
  }

  const result = parseScanResponse(raw)
  if (result === null) {
    console.warn('[scrap-scan] falling back to sample data: malformed model response')
    return sampleOutcome()
  }
  if (!result.scrapDetected) return unclearOutcome()
  if (result.items.length === 0) return unclearOutcome()
  if (result.items.every((item) => item.confidence < SCAN_CONFIG.confidenceThreshold)) {
    return unclearOutcome()
  }
  return { kind: 'ok', result, source: 'gemini' }
}

async function generateWithTimeout(
  apiKey: string,
  model: string,
  parts: Part[],
): Promise<string | undefined> {
  const client = getClient(apiKey)
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout: Promise<never> = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort() // actually cancels the in-flight request
      reject(new Error(`Scan timed out after ${SCAN_CONFIG.requestTimeoutMs} ms.`))
    }, SCAN_CONFIG.requestTimeoutMs)
  })

  try {
    const response = await Promise.race([
      client.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: SCAN_RESPONSE_SCHEMA,
          systemInstruction: SCAN_SYSTEM_PROMPT,
          temperature: 0.2,
          abortSignal: controller.signal,
        },
      }),
      timeout,
    ])
    return response.text
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}
