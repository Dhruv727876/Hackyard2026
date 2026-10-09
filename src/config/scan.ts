/**
 * Client-side scan configuration — single source of truth for the scan UI
 * (step 4c) and the Gemini service layer (step 4b).
 */
export const SCAN_CONFIG = {
  /** env-overridable as VITE_GEMINI_MODEL in 4b */
  model: 'gemini-2.5-flash',
  /** items below this get flagged in the UI as "please review"; ALL items below it = retry */
  confidenceThreshold: 0.35,
  maxImages: 3,
  /** longest edge after compression */
  imageMaxDim: 1024,
  /** JPEG quality used by canvas compression */
  imageQuality: 0.8,
  maxFileBytes: 15 * 1024 * 1024,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  /** hard cap so scans always resolve within the MVP's ≤8s criterion */
  requestTimeoutMs: 8000,
  /** crude client-side rate limit (4b enforces it) */
  minScanIntervalMs: 3000,
} as const
