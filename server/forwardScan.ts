const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

export async function forwardScan(
  body: unknown,
  apiKey: string,
): Promise<{ status: number; json: unknown }> {
  const response = await fetch(NVIDIA_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let json: unknown
  try {
    json = await response.json()
  } catch {
    json = { error: response.statusText }
  }

  return {
    status: response.status,
    json,
  }
}
