import { describe, expect, it } from 'vitest'
import { parseScanResponse } from './scanContract'

describe('parseScanResponse', () => {
  it('parses a valid full response, preserving item order and coercing numbers', () => {
    const result = parseScanResponse({
      scrapDetected: true,
      overallConfidence: 0.78,
      modelNotes: 'junk field the parser must ignore',
      items: [
        { material: 'paper', label: 'Stack of newspapers', estKg: 3.5, confidence: 0.9 },
        { material: 'pet', label: 'PET bottles', estKg: '0.2', confidence: '0.85' },
      ],
    })

    if (result === null) throw new Error('Expected a valid parse result')
    expect(result).toEqual({
      items: [
        { material: 'paper', label: 'Stack of newspapers', estKg: 3.5, confidence: 0.9 },
        { material: 'pet', label: 'PET bottles', estKg: 0.2, confidence: 0.85 },
      ],
      scrapDetected: true,
      overallConfidence: 0.78,
    })
  })

  it('drops items with unknown materials and keeps the rest', () => {
    const result = parseScanResponse({
      scrapDetected: true,
      overallConfidence: 0.5,
      items: [
        { material: 'compost', label: 'Vegetable peels', estKg: 2, confidence: 0.9 },
        { material: 'glass', label: 'Glass jars', estKg: 1, confidence: 0.8 },
      ],
    })

    if (result === null) throw new Error('Expected a valid parse result')
    expect(result.items).toEqual([
      { material: 'glass', label: 'Glass jars', estKg: 1, confidence: 0.8 },
    ])
  })

  it('accepts numeric-string estKg and drops zero, negative, non-numeric and missing weights', () => {
    const base = { scrapDetected: true, overallConfidence: 0.5 }

    const accepted = parseScanResponse({
      ...base,
      items: [{ material: 'paper', label: 'Bundle', estKg: '1.5', confidence: 0.9 }],
    })
    expect(accepted?.items[0]?.estKg).toBe(1.5)

    for (const estKg of [0, -2, 'abc', undefined]) {
      const result = parseScanResponse({
        ...base,
        items: [{ material: 'paper', label: 'Bundle', estKg, confidence: 0.9 }],
      })
      expect(result?.items).toEqual([])
    }
  })

  it('clamps estKg to 200', () => {
    const result = parseScanResponse({
      scrapDetected: true,
      overallConfidence: 0.9,
      items: [{ material: 'metal', label: 'Iron frame', estKg: 500, confidence: 0.9 }],
    })
    expect(result?.items[0]?.estKg).toBe(200)
  })

  it('defaults missing or garbage confidence to 0.5 and clamps out-of-range values', () => {
    const parseWith = (confidence: unknown) =>
      parseScanResponse({
        scrapDetected: true,
        overallConfidence: 0.5,
        items: [{ material: 'paper', label: 'Bundle', estKg: 1, confidence }],
      })

    expect(parseWith(undefined)?.items[0]?.confidence).toBe(0.5)
    expect(parseWith('not a number')?.items[0]?.confidence).toBe(0.5)
    expect(parseWith(1.8)?.items[0]?.confidence).toBe(1)
    expect(parseWith(-0.2)?.items[0]?.confidence).toBe(0)
  })

  it('drops items with empty or whitespace-only labels', () => {
    const result = parseScanResponse({
      scrapDetected: true,
      overallConfidence: 0.5,
      items: [
        { material: 'paper', label: '', estKg: 1, confidence: 0.9 },
        { material: 'paper', label: '   ', estKg: 1, confidence: 0.9 },
      ],
    })
    expect(result?.items).toEqual([])
  })

  it('returns null for unusable top-level shapes', () => {
    expect(parseScanResponse(null)).toBeNull()
    expect(parseScanResponse('a string')).toBeNull()
    expect(parseScanResponse(42)).toBeNull()
    expect(parseScanResponse({ overallConfidence: 0.5, items: [] })).toBeNull() // scrapDetected missing
    expect(parseScanResponse({ scrapDetected: true, overallConfidence: 0.5, items: 'nope' })).toBeNull()
  })

  it('treats an empty items array as a valid result', () => {
    expect(
      parseScanResponse({ scrapDetected: true, overallConfidence: 0.4, items: [] }),
    ).toEqual({ items: [], scrapDetected: true, overallConfidence: 0.4 })
  })

  it('clamps overallConfidence and never sets userKg on parsed items', () => {
    const clamped = parseScanResponse({
      scrapDetected: false,
      overallConfidence: 4.2,
      items: [],
    })
    expect(clamped?.overallConfidence).toBe(1)

    const result = parseScanResponse({
      scrapDetected: true,
      overallConfidence: 0.5,
      items: [
        { material: 'paper', label: 'Bundle', estKg: 1, confidence: 0.9, userKg: 5 },
      ],
    })
    if (result === null) throw new Error('Expected a valid parse result')
    expect('userKg' in result.items[0]).toBe(false)
    expect(result.items[0]).toEqual({
      material: 'paper',
      label: 'Bundle',
      estKg: 1,
      confidence: 0.9,
    })
  })
})
