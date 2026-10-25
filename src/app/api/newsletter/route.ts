import { promises as fs } from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isProduction = process.env.NODE_ENV === "production"
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5

type Subscriber = { email: string; at: string }
type RateEntry = { count: number; resetAt: number }

const rateLimit = new Map<string, RateEntry>()

function isRateLimited(key: string) {
  const now = Date.now()
  const entry = rateLimit.get(key)

  if (!entry || entry.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

function resolveLocale(value: unknown): "ar" | "en" {
  return typeof value === "string" && value.toLowerCase().startsWith("en")
    ? "en"
    : "ar"
}

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const clientKey = forwardedFor?.split(",")[0]?.trim() || "unknown"

  if (isRateLimited(clientKey)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const record =
    typeof payload === "object" && payload !== null
      ? (payload as { email?: unknown; locale?: unknown })
      : {}

  const email = typeof record.email === "string" ? record.email.trim() : ""
  const locale = resolveLocale(record.locale)

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 })
  }

  const backend =
    process.env.MEDUSA_BACKEND_URL ?? process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const publishableKey =
    process.env.MEDUSA_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  const civilizationId = process.env.MEDUSA_WAITLIST_CIVILIZATION_ID

  if (backend && publishableKey && civilizationId) {
    try {
      const response = await fetch(`${backend}/store/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": publishableKey,
        },
        body: JSON.stringify({
          email,
          civilization_id: civilizationId,
          locale,
          source: "newsletter",
        }),
        cache: "no-store",
      })

      if (response.ok) {
        return NextResponse.json(
          { ok: true, source: "waitlist" },
          { status: 201 }
        )
      }

      if (isProduction) {
        return NextResponse.json(
          { error: "newsletter_unavailable" },
          { status: 502 }
        )
      }
    } catch {
      if (isProduction) {
        return NextResponse.json(
          { error: "newsletter_unavailable" },
          { status: 502 }
        )
      }
    }
  }

  if (isProduction) {
    return NextResponse.json(
      { error: "newsletter_not_configured" },
      { status: 503 }
    )
  }

  try {
    const directory = path.join(process.cwd(), ".data")
    const file = path.join(directory, "newsletter-subscribers.json")
    await fs.mkdir(directory, { recursive: true })

    let subscribers: Subscriber[] = []
    try {
      const raw = await fs.readFile(file, "utf8")
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        subscribers = parsed as Subscriber[]
      }
    } catch {
      subscribers = []
    }

    if (!subscribers.some((entry) => entry.email === email)) {
      subscribers.push({ email, at: new Date().toISOString() })
      await fs.writeFile(file, JSON.stringify(subscribers, null, 2), "utf8")
    }

    return NextResponse.json({ ok: true, queued: true })
  } catch {
    console.warn("newsletter: could not persist subscriber locally")
    return NextResponse.json(
      { error: "newsletter_unavailable" },
      { status: 503 }
    )
  }
}
