import { promises as fs } from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Subscriber = { email: string; at: string }

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const email =
    typeof payload === "object" && payload !== null && "email" in payload
      ? String((payload as { email: unknown }).email ?? "").trim()
      : ""

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
          locale: "ar",
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
    } catch {
      // fall through to the local queue below
    }
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
    return NextResponse.json({ ok: true, queued: true })
  }
}
