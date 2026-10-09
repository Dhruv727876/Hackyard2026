import { parseScanResponse } from './scanContract'
import type { ScanResult } from './scanContract'

/**
 * Cached demo fallback, used when the AI scan call fails or no API key
 * is set — so a demo never white-screens. The UI must label results from this
 * source as sample data (ScanSource 'sample').
 *
 * Shaped like a raw model response on purpose, including one junk field
 * ("modelNotes") to prove the parser ignores unknown top-level fields.
 */
export const SAMPLE_SCAN_RAW: unknown = {
  scrapDetected: true,
  overallConfidence: 0.78,
  modelNotes: 'Internal scratchpad — must be ignored by the parser.',
  items: [
    { material: 'paper', label: 'Stack of newspapers', estKg: 3.5, confidence: 0.9 },
    { material: 'cardboard', label: 'Cardboard boxes (3)', estKg: 1.2, confidence: 0.8 },
    { material: 'pet', label: 'PET bottles (6)', estKg: 0.18, confidence: 0.85 },
    { material: 'metal', label: 'Aluminium cans (4)', estKg: 0.06, confidence: 0.7 },
    { material: 'glass', label: 'Broken glass bottle', estKg: 0.4, confidence: 0.55 },
    { material: 'non_recyclable', label: 'Laminate chip packets', estKg: 0.05, confidence: 0.6 },
  ],
}

/** Parsed once at module load; throws immediately if the sample ever goes invalid. */
export const SAMPLE_SCAN_RESULT: ScanResult = (() => {
  const parsed = parseScanResponse(SAMPLE_SCAN_RAW)
  if (parsed === null) {
    throw new Error('Sample scan failed to parse — the sample must always be valid.')
  }
  return parsed
})()
