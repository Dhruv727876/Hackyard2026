import { Type } from '@google/genai'
import { RATE_BY_MATERIAL } from '@/config/rates'
import type { Schema } from '@google/genai'

// Single source of truth for the material whitelist — never hardcode a second list.
const MATERIAL_IDS: string[] = Object.keys(RATE_BY_MATERIAL)

export const SCAN_SYSTEM_PROMPT: string = `You are ScrapLoop's scrap classifier. Analyze photos of household scrap and identify each distinct material group you can see.

Classify every visible item into EXACTLY one of these material ids: ${MATERIAL_IDS.join(', ')}.

For each material group, estimate:
- estKg: a VISUAL ESTIMATE of the total weight of that group in kilograms, anchored to familiar references — a standard newspaper sheet is about 35 g, an empty 2 L PET bottle about 30 g, an aluminium can about 15 g, a glass bottle about 300 g. Use at most 2 decimal places.
- confidence: a number from 0 to 1 for how certain you are about that group's material and weight.
- label: short and specific, for example "newspaper stack" or "PET bottles (6)".

If no scrap is visible, or the photo is too blurry or dark to assess, set scrapDetected to false with an empty items array.
Never invent items that are not visible in the photos. Weights are indicative only; the household will review and edit them.

Return JSON only. No prose, no fields outside the schema.`

export const SCAN_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    scrapDetected: { type: Type.BOOLEAN },
    overallConfidence: { type: Type.NUMBER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          material: { type: Type.STRING, enum: MATERIAL_IDS },
          label: { type: Type.STRING },
          estKg: { type: Type.NUMBER },
          confidence: { type: Type.NUMBER },
        },
        required: ['material', 'label', 'estKg', 'confidence'],
      },
    },
  },
  required: ['scrapDetected', 'overallConfidence', 'items'],
}
