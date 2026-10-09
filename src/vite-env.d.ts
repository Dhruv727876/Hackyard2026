/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional NVIDIA model override (defaults to SCAN_CONFIG.model). */
  readonly VITE_NVIDIA_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
