import { describe, expect, it } from 'vitest'
import { RATE_BY_MATERIAL } from '@/config/rates'
import { SCAN_RESPONSE_SCHEMA, SCAN_SYSTEM_PROMPT } from './scanPrompt'

describe('scan prompt + schema', () => {
  it('restricts material to exactly the rate-table whitelist', () => {
    const itemsSchema = SCAN_RESPONSE_SCHEMA.properties?.['items']
    if (itemsSchema === undefined) throw new Error('items schema missing')
    const materialSchema = itemsSchema.items?.properties?.['material']
    if (materialSchema === undefined) throw new Error('material schema missing')

    expect(materialSchema.enum).toHaveLength(Object.keys(RATE_BY_MATERIAL).length)
    expect([...(materialSchema.enum ?? [])].sort()).toEqual(
      Object.keys(RATE_BY_MATERIAL).sort(),
    )
  })

  it('requires every field on items and at the top level', () => {
    expect(SCAN_RESPONSE_SCHEMA.required).toEqual([
      'scrapDetected',
      'overallConfidence',
      'items',
    ])
    const itemsSchema = SCAN_RESPONSE_SCHEMA.properties?.['items']
    if (itemsSchema === undefined) throw new Error('items schema missing')
    expect(itemsSchema.items?.required).toEqual(['material', 'label', 'estKg', 'confidence'])
  })

  it('system prompt is non-empty and mentions every material id', () => {
    expect(SCAN_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    for (const material of Object.keys(RATE_BY_MATERIAL)) {
      expect(SCAN_SYSTEM_PROMPT).toContain(material)
    }
  })
})
