import { RATE_BY_MATERIAL } from '@/config/rates'
import type { MaterialId, ScrapItemInput } from '@/domain/types'

export interface ScanResult {
  /** parsed, whitelisted, clamped — ready for valuateItems */
  items: ScrapItemInput[]
  scrapDetected: boolean
  /** 0..1 */
  overallConfidence: number
}

export type ScanSource = 'nvidia' | 'sample'

export type ScanRetryReason = 'unclear' | 'rate-limited'

export type ScanOutcome =
  | { kind: 'ok'; result: ScanResult; source: ScanSource }
  | { kind: 'retry'; reason: ScanRetryReason }

// Sanity cap, a single household item can't weigh more.
const MAX_ITEM_KG = 200

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Whitelist check against the rate table — never a second hardcoded material list. */
function isMaterialId(value: unknown): value is MaterialId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(RATE_BY_MATERIAL, value)
  )
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Number()-coerce, treat null/undefined/''/non-finite as absent, clamp to 0..1. */
function coerceClamped01(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? clamp01(parsed) : fallback
}

/** Parse one item; drop (return null) on any violation — never throw. */
function parseItem(raw: unknown): ScrapItemInput | null {
  if (!isRecord(raw)) return null
  if (!isMaterialId(raw.material)) return null
  const material: MaterialId = raw.material

  const estKg = Number(raw.estKg)
  if (!Number.isFinite(estKg) || estKg <= 0) return null
  const clampedKg = Math.min(estKg, MAX_ITEM_KG)

  if (typeof raw.label !== 'string' || raw.label.trim() === '') return null
  const label = raw.label.trim()

  return {
    material,
    label,
    estKg: clampedKg,
    confidence: coerceClamped01(raw.confidence, 0.5),
  }
  // userKg is deliberately never set here — that is the household's override,
  // added later by the UI.
}

/**
 * The guardrail between an AI response and the rest of the app.
 * Validates and sanitizes an untrusted model response: whitelists materials,
 * coerces and clamps numbers, drops (never throws on) bad items. Returns null
 * when the top-level shape is unusable — the caller treats that as failure.
 * An empty items array is a valid result (the service decides retry).
 */
export function parseScanResponse(raw: unknown): ScanResult | null {
  if (!isRecord(raw)) return null
  if (typeof raw.scrapDetected !== 'boolean') return null
  if (!Array.isArray(raw.items)) return null

  const items: ScrapItemInput[] = []
  for (const candidate of raw.items) {
    const item = parseItem(candidate)
    if (item !== null) items.push(item)
  }

  return {
    items,
    scrapDetected: raw.scrapDetected,
    overallConfidence: coerceClamped01(raw.overallConfidence, 0),
  }
}
