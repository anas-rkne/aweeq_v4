import Medusa from "@medusajs/js-sdk"
import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from "./config"

export const medusaClient = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
})

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
  options: RequestInit = {}
): Promise<T> {
  const url = `${MEDUSA_BACKEND_URL}${endpoint}`
  const headers = {
    "Content-Type": "application/json",
    "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
    ...(options.headers || {}),
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  })

  if (!res.ok) {
    const raw = await res.text()
    let message = raw

    try {
      const parsed = JSON.parse(raw) as { message?: string }
      message = parsed.message || raw
    } catch {
      // Keep the raw response when it is not JSON.
    }

    throw new MedusaApiError(
      `Medusa API error (${res.status}): ${message}`,
      res.status,
      raw
    )
  }

  return res.json() as Promise<T>
}
