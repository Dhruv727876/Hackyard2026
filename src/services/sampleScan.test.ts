import { describe, expect, it } from 'vitest'
import { RATES } from '@/config/rates'
import { parseScanResponse } from './scanContract'
import { SAMPLE_SCAN_RAW, SAMPLE_SCAN_RESULT } from './sampleScan'

describe('SAMPLE_SCAN', () => {
  it('parses to 6 valid, non-negative items including a non_recyclable one', () => {
    expect(SAMPLE_SCAN_RESULT.scrapDetected).toBe(true)
    expect(SAMPLE_SCAN_RESULT.items).toHaveLength(6)

    for (const item of SAMPLE_SCAN_RESULT.items) {
      expect(RATES.some((rate) => rate.material === item.material)).toBe(true)
      expect(item.confidence).toBeGreaterThanOrEqual(0)
    }
    expect(
      SAMPLE_SCAN_RESULT.items.some((item) => item.material === 'non_recyclable'),
    ).toBe(true)
  })

  it('re-parsing SAMPLE_SCAN_RAW is deterministic', () => {
    expect(parseScanResponse(SAMPLE_SCAN_RAW)).toEqual(SAMPLE_SCAN_RESULT)
    expect(parseScanResponse(SAMPLE_SCAN_RAW)).toEqual(parseScanResponse(SAMPLE_SCAN_RAW))
  })
})
