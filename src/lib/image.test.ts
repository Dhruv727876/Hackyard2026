import { describe, expect, it } from 'vitest'
import { SCAN_CONFIG } from '@/config/scan'
import { blobToBase64, fitWithin, validateImageFile } from './image'

function fileOf(type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], 'a.jpg', { type })
}

describe('validateImageFile', () => {
  it('accepts jpeg, png and webp', () => {
    for (const type of SCAN_CONFIG.acceptedTypes) {
      expect(validateImageFile(fileOf(type, 1024))).toEqual({ ok: true })
    }
  })

  it('rejects unsupported types with a user-facing reason', () => {
    expect(validateImageFile(fileOf('image/gif', 1024))).toEqual({
      ok: false,
      reason: 'Not a supported image type (JPEG, PNG or WebP).',
    })
  })

  it('rejects files above the size limit', () => {
    const result = validateImageFile(fileOf('image/jpeg', SCAN_CONFIG.maxFileBytes + 1))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('Image is larger than 15 MB.')
  })
})

describe('fitWithin', () => {
  it('scales to the longest edge preserving aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ w: 1000, h: 750 })
    expect(fitWithin(3000, 4000, 1000)).toEqual({ w: 750, h: 1000 })
  })

  it('never upscales', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ w: 800, h: 600 })
  })

  it('leaves exact fits unchanged and rounds correctly', () => {
    expect(fitWithin(1000, 750, 1000)).toEqual({ w: 1000, h: 750 })
    expect(fitWithin(3333, 2500, 1000)).toEqual({ w: 1000, h: 750 })
  })
})

describe('blobToBase64', () => {
  it('encodes a blob as bare base64 without the data: prefix', async () => {
    await expect(blobToBase64(new Blob(['hello']))).resolves.toBe('aGVsbG8=')
  })
})
