import { SCAN_CONFIG } from '@/config/scan'
import { blobToBase64, compressImage } from '@/lib/image'
import { SAMPLE_SCAN_RESULT } from './sampleScan'
import { parseScanResponse } from './scanContract'
import type { ScanOutcome } from './scanContract'
import { SCAN_SYSTEM_PROMPT } from './scanPrompt'

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

/**
 * Pure helper to extract a single JSON object from model response text.
 * Handles <think>...</think> tags, markdown fences, and prose wrapping.
 */
export function extractJsonObject(text: string): string | null {
  // 1. Remove every <think>...</think> block using a non-greedy multiline-safe regex.
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '')

  // 2. Trim whitespace.
  cleaned = cleaned.trim()

  // 3. Remove outer markdown code fences (```json ... ``` or plain ``` ... ```).
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1')

  // 4. Trim again.
  cleaned = cleaned.trim()

  // 5. If the remaining string starts with { and ends with }, return it.
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    return cleaned
  }

  // 6. Otherwise, find the first { and the last } and return the inclusive slice.
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1)
  }

  // 7. If no valid brace range exists, return null.
  return null
}

function extractContentFromResponse(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj['choices']) || obj['choices'].length === 0) return null
  const firstChoice = obj['choices'][0]
  if (typeof firstChoice !== 'object' || firstChoice === null) return null
  const choiceObj = firstChoice as Record<string, unknown>
  if (typeof choiceObj['message'] !== 'object' || choiceObj['message'] === null) return null
  const messageObj = choiceObj['message'] as Record<string, unknown>
  if (typeof messageObj['content'] !== 'string') return null
  return messageObj['content']
}

/**
 * One scan request: compress → base64 → NVIDIA Nemotron Vision API → parse → guardrails.
 * Never throws: user-actionable problems come back as { kind: 'retry', reason: 'unclear' | 'rate-limited' },
 * system failures (missing server key, network, timeout, malformed output) as the sample fallback.
 */
export async function scanScrap(images: File[]): Promise<ScanOutcome> {
  const now = Date.now()
  if (now - lastScanAt < SCAN_CONFIG.minScanIntervalMs) {
    return { kind: 'retry', reason: 'rate-limited' }
  }
  lastScanAt = now

  if (images.length === 0) return unclearOutcome()

  // Read model override lazily inside scanScrap, never at module scope
  const model = import.meta.env.VITE_NVIDIA_MODEL?.trim() || SCAN_CONFIG.model

  const selected = images.slice(0, SCAN_CONFIG.maxImages)
  const imageParts = await Promise.all(
    selected.map(async (image) => {
      // compressImage emits JPEG, so MIME type is always image/jpeg.
      const blob = await compressImage(image)
      const base64 = await blobToBase64(blob)
      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:image/jpeg;base64,${base64}`,
        },
      }
    }),
  )

  const requestBody = {
    messages: [
      {
        role: 'system',
        content: SCAN_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze these ${selected.length} photo(s) of household scrap.`,
          },
          ...imageParts,
        ],
      },
    ],
    model,
    max_tokens: SCAN_CONFIG.maxTokens,
    stream: false,
    temperature: SCAN_CONFIG.temperature,
    top_p: SCAN_CONFIG.topP,
  }

  // The API key lives server-side; CORS is solved by the same-origin /api/scan proxy.
  // Sample fallback still safely covers proxy failures, missing keys (503), or NVIDIA upstream errors.
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      reject(new Error(`Scan timed out after ${SCAN_CONFIG.requestTimeoutMs} ms.`))
    }, SCAN_CONFIG.requestTimeoutMs)
  })

  let rawJson: unknown
  try {
    const fetchPromise = fetch(SCAN_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    const response = await Promise.race([fetchPromise, timeoutPromise])
    if (!response.ok) {
      console.warn(
        '[scrap-scan] falling back to sample data:',
        `${response.status} ${response.statusText}`,
      )
      return sampleOutcome()
    }

    rawJson = await response.json()
  } catch (error) {
    console.warn('[scrap-scan] falling back to sample data:', error)
    return sampleOutcome()
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }

  const content = extractContentFromResponse(rawJson)
  if (!content || content.trim() === '') {
    console.warn('[scrap-scan] falling back to sample data: malformed model response')
    return sampleOutcome()
  }

  const jsonString = extractJsonObject(content)
  if (!jsonString) {
    console.warn('[scrap-scan] falling back to sample data: malformed model response')
    return sampleOutcome()
  }

  let parsedRaw: unknown
  try {
    parsedRaw = JSON.parse(jsonString)
  } catch {
    console.warn('[scrap-scan] falling back to sample data: malformed model response')
    return sampleOutcome()
  }

  const result = parseScanResponse(parsedRaw)
  if (result === null) {
    console.warn('[scrap-scan] falling back to sample data: malformed model response')
    return sampleOutcome()
  }

  if (!result.scrapDetected) return unclearOutcome()
  if (result.items.length === 0) return unclearOutcome()
  if (result.items.every((item) => item.confidence < SCAN_CONFIG.confidenceThreshold)) {
    return unclearOutcome()
  }

  return { kind: 'ok', result, source: 'nvidia' }
}
