/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gemini API key for the AI scrap scan. Set the real value in .env.local (gitignored). */
  readonly VITE_GEMINI_API_KEY?: string
  /** Optional Gemini model override (defaults to SCAN_CONFIG.model). */
  readonly VITE_GEMINI_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
