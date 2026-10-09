import { SCAN_CONFIG } from '@/config/scan'

export type ImageValidation = { ok: true } | { ok: false; reason: string }

/** Browser-only check of type and size, with user-facing reason strings. */
export function validateImageFile(file: File): ImageValidation {
  const accepted: readonly string[] = SCAN_CONFIG.acceptedTypes
  if (!accepted.includes(file.type)) {
    return { ok: false, reason: 'Not a supported image type (JPEG, PNG or WebP).' }
  }
  if (file.size > SCAN_CONFIG.maxFileBytes) {
    const maxMb = Math.round(SCAN_CONFIG.maxFileBytes / (1024 * 1024))
    return { ok: false, reason: `Image is larger than ${maxMb} MB.` }
  }
  return { ok: true }
}

/** Pure: scale to fit maxDim on the longest edge, never upscale. */
export function fitWithin(w: number, h: number, maxDim: number): { w: number; h: number } {
  if (w <= maxDim && h <= maxDim) return { w, h }
  const scale = Math.min(maxDim / w, maxDim / h)
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be decoded.'))
    image.src = src
  })
}

function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error('Image compression failed.')) : resolve(blob)),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Decode an image file and re-encode it as a JPEG blob within maxDim on the
 * longest edge. Object URL is revoked on every path.
 *
 * Needs a real canvas — verified in-browser, not in jsdom.
 */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<Blob> {
  const maxDim = opts.maxDim ?? SCAN_CONFIG.imageMaxDim
  const quality = opts.quality ?? SCAN_CONFIG.imageQuality

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const { w, h } = fitWithin(image.naturalWidth, image.naturalHeight, maxDim)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('Canvas 2D context is unavailable.')
    context.drawImage(image, 0, 0, w, h)
    return await toJpegBlob(canvas, quality)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Blob → bare base64 (no data: prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
      if (!dataUrl.startsWith('data:') || base64.length === 0) {
        reject(new Error('Unexpected FileReader result.'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Image could not be read.'))
    reader.readAsDataURL(blob)
  })
}
