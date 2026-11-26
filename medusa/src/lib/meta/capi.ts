import { createHash } from "crypto"

/**
 * Meta Conversions API (server-side) sender.
 *
 * The browser pixel is the primary tracker; this is the reliable half for
 * `Purchase`, because ad-blockers and closed tabs cannot lose a server event.
 * Both halves send the same `event_id` (the order id), so Meta deduplicates
 * them into a single purchase.
 *
 * Everything is a no-op when `META_PIXEL_ID` / `META_CAPI_ACCESS_TOKEN` are
 * not configured — the checkout must never fail because of tracking.
 */

const DEFAULT_API_VERSION = "v23.0"

type MetaUserData = {
  email?: string | null
  phone?: string | null
  externalId?: string | null
  fbp?: string | null
  fbc?: string | null
  clientIp?: string | null
  userAgent?: string | null
}

export type MetaCapiEvent = {
  eventName: string
  eventId?: string | null
  eventTime?: number
  eventSourceUrl?: string | null
  userData: MetaUserData
  customData: Record<string, unknown>
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function hashedEmail(email?: string | null) {
  if (!email) return undefined
  const value = email.trim().toLowerCase()
  return value ? sha256(value) : undefined
}

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "")

  if (digits.startsWith("00")) {
    digits = digits.slice(2)
  }

  /* UAE numbers are written 05XXXXXXXX locally; Meta's matching expects the
     country code, so drop the trunk zero and prefix 971. Landlines (0X XXXXXXX)
     are handled the same way. */
  if (digits.length === 10 && digits.startsWith("0")) {
    return `971${digits.slice(1)}`
  }

  if (digits.length === 9 && digits.startsWith("5")) {
    return `971${digits}`
  }

  if (digits.length === 9 && digits.startsWith("0")) {
    return `971${digits.slice(1)}`
  }

  return digits
}

function hashedPhone(phone?: string | null) {
  if (!phone) return undefined
  const digits = normalizePhone(phone)
  return digits ? sha256(digits) : undefined
}

export async function sendMetaEvent(event: MetaCapiEvent) {
  const pixelId = process.env.META_PIXEL_ID
  const token = process.env.META_CAPI_ACCESS_TOKEN
  const version = process.env.META_API_VERSION ?? DEFAULT_API_VERSION
  const testEventCode = process.env.META_TEST_EVENT_CODE

  if (!pixelId || !token) {
    return { sent: false, reason: "not_configured" as const }
  }

  const userData: Record<string, unknown> = {}
  const email = hashedEmail(event.userData.email)
  const phone = hashedPhone(event.userData.phone)
  if (email) userData.em = [email]
  if (phone) userData.ph = [phone]

  /* A stable, hashed id for the same buyer across orders. The email is the only
     identifier a guest checkout reliably has. */
  const externalId = event.userData.externalId
  if (externalId) {
    const normalized = externalId.trim().toLowerCase()
    if (normalized) userData.external_id = [sha256(normalized)]
  }

  /* The store sells in the UAE only; `country` is hashed like the other
     customer-information fields. */
  userData.country = [sha256("ae")]

  /* `fbp` / `fbc` are browser ids, not PII: Meta expects them unhashed. */
  if (event.userData.fbp) userData.fbp = event.userData.fbp
  if (event.userData.fbc) userData.fbc = event.userData.fbc

  if (event.userData.clientIp) userData.client_ip_address = event.userData.clientIp
  if (event.userData.userAgent) userData.client_user_agent = event.userData.userAgent

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        ...(event.eventId ? { event_id: event.eventId } : {}),
        ...(event.eventSourceUrl
          ? { event_source_url: event.eventSourceUrl }
          : {}),
        action_source: "website",
        user_data: userData,
        custom_data: event.customData,
      },
    ],
  }

  if (testEventCode) {
    body.test_event_code = testEventCode
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${pixelId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return {
        sent: false as const,
        reason: "http_error" as const,
        status: response.status,
        body: text.slice(0, 500),
      }
    }

    return { sent: true as const }
  } catch (error) {
    return {
      sent: false as const,
      reason: "request_failed" as const,
      error: error instanceof Error ? error.message : "unknown error",
    }
  }
}

export type MetaPurchaseItem = {
  sku: string
  quantity: number
  itemPrice: number
}

export async function sendPurchaseEvent(input: {
  orderId: string
  value: number
  currency: string
  items: MetaPurchaseItem[]
  email?: string | null
  phone?: string | null
  fbp?: string | null
  fbc?: string | null
  clientIp?: string | null
  userAgent?: string | null
  eventSourceUrl?: string | null
}) {
  const contents = input.items.map((item) => ({
    id: item.sku,
    quantity: item.quantity,
    item_price: item.itemPrice,
  }))

  return sendMetaEvent({
    eventName: "Purchase",
    eventId: input.orderId,
    eventSourceUrl: input.eventSourceUrl,
    userData: {
      email: input.email,
      phone: input.phone,
      externalId: input.email ?? input.phone ?? null,
      fbp: input.fbp,
      fbc: input.fbc,
      clientIp: input.clientIp,
      userAgent: input.userAgent,
    },
    customData: {
      currency: input.currency.toUpperCase(),
      value: input.value,
      content_ids: input.items.map((item) => item.sku),
      content_type: "product",
      contents,
      num_items: input.items.reduce((sum, item) => sum + item.quantity, 0),
      order_id: input.orderId,
    },
  })
}
