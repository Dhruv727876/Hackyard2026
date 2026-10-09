/**
 * Client-side scan configuration — single source of truth for the scan UI
 * and the NVIDIA service layer.
 */
export const SCAN_CONFIG = {
  /** env-overridable via VITE_NVIDIA_MODEL */
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  /** Vite middleware in dev; Vercel function in prod. Never call NVIDIA from the browser. */
  apiUrl: '/api/scan',
  /** structured scrap JSON is short; keep low to protect the 8-second MVP latency budget. */
  maxTokens: 1024,
  temperature: 0.2,
  topP: 0.95,
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
  /** crude client-side rate limit */
  minScanIntervalMs: 3000,
} as const
