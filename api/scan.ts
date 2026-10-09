import { forwardScan } from '../server/forwardScan.ts'

type VercelRequestLike = {
  method?: string
  body?: unknown
}

type VercelResponseLike = {
  status: (n: number) => {
    json: (v: unknown) => void
  }
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.NVIDIA_API_KEY?.trim()
  if (!apiKey) {
    res.status(503).json({ error: 'NVIDIA_API_KEY not configured' })
    return
  }

  const body = req.body
  if (!body || (typeof body !== 'object' && typeof body !== 'string')) {
    res.status(400).json({ error: 'invalid json' })
    return
  }

  let parsedBody: unknown = body
  if (typeof body === 'string') {
    try {
      parsedBody = JSON.parse(body)
    } catch {
      res.status(400).json({ error: 'invalid json' })
      return
    }
  }

  try {
    const { status, json } = await forwardScan(parsedBody, apiKey)
    res.status(status).json(json)
  } catch (error) {
    console.error(
      '[api/scan] upstream failed:',
      error instanceof Error ? error.message : String(error),
    )
    res.status(502).json({ error: 'upstream failed' })
  }
}
