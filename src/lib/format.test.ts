import { describe, expect, it } from 'vitest'
import { formatINR, formatKg } from './format'

describe('formatINR', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(formatINR(0)).toBe('₹0')
    expect(formatINR(30)).toBe('₹30')
    expect(formatINR(1234)).toBe('₹1,234')
    expect(formatINR(123456)).toBe('₹1,23,456')
    expect(formatINR(1234567)).toBe('₹12,34,567')
  })

  it('rounds to the nearest rupee', () => {
    expect(formatINR(11.88)).toBe('₹12')
    expect(formatINR(87.4)).toBe('₹87')
  })

  it('keeps the minus sign for negative values', () => {
    expect(formatINR(-123456)).toBe('₹-1,23,456')
  })
})

describe('formatKg', () => {
  it('formats one decimal place plus " kg"', () => {
    expect(formatKg(0)).toBe('0.0 kg')
    expect(formatKg(2)).toBe('2.0 kg')
    expect(formatKg(12.34)).toBe('12.3 kg')
  })
})
