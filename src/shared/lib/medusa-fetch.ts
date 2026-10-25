import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from "./config"

export class MedusaApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "MedusaApiError"
    this.status = status
    this.details = details
  }
}

export async function medusaFetch<T>(
  endpoint: string,
  options: RequestInit & {
    next?: { tags?: string[]; revalidate?: number }
  } = {}
): Promise<T> {
  const { next, ...rest } = options
  const url = `${MEDUSA_BACKEND_URL}${endpoint}`
  const headers = {
    "Content-Type": "application/json",
    "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
    ...(rest.headers || {}),
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: "include",
    ...(next ? { next } : { cache: "no-store" as const }),
  })

  if (!res.ok) {
    const raw = await res.text()
    let message = raw

    try {
      const parsed = JSON.parse(raw) as { message?: string }
      message = parsed.message || raw
    } catch {}

    throw new MedusaApiError(
      `Medusa API error (${res.status}): ${message}`,
      res.status,
      raw
    )
  }

  return res.json() as Promise<T>
}
