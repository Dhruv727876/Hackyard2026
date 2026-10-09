import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { forwardScan } from './server/forwardScan.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.NVIDIA_API_KEY?.trim() || ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'scan-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url ? req.url.split('?')[0] : ''
            if (url !== '/api/scan') {
              return next()
            }

            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            let rawBody = ''
            try {
              req.setEncoding('utf-8')
              for await (const chunk of req) {
                rawBody += chunk
              }
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'invalid json' }))
              return
            }

            let parsedBody: unknown
            try {
              parsedBody = JSON.parse(rawBody)
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'invalid json' }))
              return
            }

            if (!apiKey) {
              res.statusCode = 503
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'NVIDIA_API_KEY not configured' }))
              return
            }

            try {
              const { status, json } = await forwardScan(parsedBody, apiKey)
              res.statusCode = status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(json))
            } catch (error) {
              console.error(
                '[scan-proxy] upstream error:',
                error instanceof Error ? error.message : String(error),
              )
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'upstream failed' }))
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test/setup.ts'],
    },
  }
})
