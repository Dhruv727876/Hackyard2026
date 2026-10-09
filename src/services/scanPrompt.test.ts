import { describe, expect, it } from 'vitest'
import { RATE_BY_MATERIAL } from '@/config/rates'
import { SCAN_SYSTEM_PROMPT } from './scanPrompt'

describe('scan prompt', () => {
  it('system prompt is non-empty and mentions every material id', () => {
    expect(SCAN_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    for (const material of Object.keys(RATE_BY_MATERIAL)) {
      expect(SCAN_SYSTEM_PROMPT).toContain(material)
    }
  })
})
