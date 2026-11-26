/**
 * Meta Pixel helper. Every call is a safe no-op when the pixel is not
 * configured (`NEXT_PUBLIC_META_PIXEL_ID` missing) or when `fbq` has not
 * loaded yet, so the storefront never breaks because of tracking.
 *
 * The Content ID sent to Meta is the variant SKU (`RAFID-100`, ...) so it
 * matches the product catalog in Commerce Manager exactly.
 */

type MetaContent = {
  id: string
  quantity: number
  item_price: number
}

export type MetaEventParams = {
  content_ids?: string[]
  content_type?: "product"
  content_name?: string
  contents?: MetaContent[]
  value?: number
  currency?: string
  num_items?: number
  quantity?: number
  order_id?: string
}

type FbqFunction = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: FbqFunction
  }
}

/**
 * What the browser knows about the buyer. Meta hashes these values inside the
 * pixel before they leave the page; we only normalise them so the same person
 * matches whether the event came from the browser or the Conversions API.
 */
export type MetaUserIdentity = {
  email?: string | null
  phone?: string | null
}

const FBC_MAX_AGE_SECONDS = 90 * 24 * 60 * 60

/** The numeric pixel id, or null when tracking is not configured. */
export function metaPixelId(): string | null {
  const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!raw) return null
  const id = raw.replace(/[^\d]/g, "")
  return id.length >= 10 ? id : null
}

export function normalizeMetaEmail(email?: string | null): string | null {
  const value = email?.trim().toLowerCase()
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return null
  }
  return value
}

/**
 * Meta expects a phone number with its country code and no leading zero.
 * The store sells in the UAE, so a local `05XXXXXXXX` becomes `9715XXXXXXXX`
 * and an already-international number is kept.
 */
export function normalizeMetaPhone(phone?: string | null): string | null {
  if (!phone) return null

  let digits = phone.replace(/\D/g, "")
  if (!digits) return null

  if (digits.startsWith("00")) {
    digits = digits.slice(2)
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    digits = `971${digits.slice(1)}`
  } else if (digits.length === 9 && digits.startsWith("5")) {
    digits = `971${digits}`
  } else if (digits.length === 9 && digits.startsWith("0")) {
    digits = `971${digits.slice(1)}`
  }

  return digits.length >= 8 ? digits : null
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null

  const prefix = `${name}=`
  for (const part of document.cookie.split(";")) {
    const entry = part.trim()
    if (entry.startsWith(prefix)) {
      try {
        return decodeURIComponent(entry.slice(prefix.length))
      } catch {
        return entry.slice(prefix.length)
      }
    }
  }

  return null
}

/**
 * The browser ids Meta uses to join a click to a person. They are read here and
 * forwarded in the checkout request body because the API lives on a different
 * host than the storefront, where the cookies would not be sent.
 */
export function readMetaCookies(): { fbp?: string; fbc?: string } {
  const fbp = readCookie("_fbp")
  const fbc = readCookie("_fbc")

  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  }
}

/**
 * The pixel normally writes `_fbc` from the `fbclid` on the landing URL, but
 * it does nothing when the script is blocked. Writing the same value here keeps
 * the click id available for the server-side Purchase even then.
 */
export function captureFbclid(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return
  }

  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid")
    if (!fbclid || readCookie("_fbc")) return

    const value = `fb.1.${Date.now()}.${fbclid}`
    document.cookie = `_fbc=${value}; path=/; max-age=${FBC_MAX_AGE_SECONDS}; SameSite=Lax`
  } catch {
    /* a locked-down browser can refuse cookies; tracking must not break */
  }
}

export function isMetaPixelReady(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function"
}

type QueuedEvent = {
  event: string
  params?: MetaEventParams
  eventId?: string
}

/**
 * Events can fire before the base snippet has executed (`afterInteractive`
 * loads it just after hydration). They are queued here and flushed by the
 * pixel component as soon as `fbq` exists, so no event is ever lost.
 */
const queue: QueuedEvent[] = []
const MAX_QUEUE = 50

/**
 * Advanced matching is remembered until the base snippet exists. Calling
 * `window.fbq` ourselves before the snippet would make it return early and
 * never load `fbevents.js`, so the identity waits for `flushMetaQueue`.
 */
let pendingIdentity: MetaUserIdentity | null = null
let appliedIdentityKey: string | null = null

function identityPayload(identity: MetaUserIdentity) {
  const email = normalizeMetaEmail(identity.email)
  const phone = normalizeMetaPhone(identity.phone)

  if (!email && !phone) return null

  return {
    key: `${email ?? ""}|${phone ?? ""}`,
    payload: {
      ...(email ? { em: email } : {}),
      ...(phone ? { ph: phone } : {}),
      country: "ae",
    },
  }
}

function applyIdentity(): void {
  if (!pendingIdentity) return

  const pixelId = metaPixelId()
  if (!pixelId || !isMetaPixelReady()) return

  const prepared = identityPayload(pendingIdentity)
  pendingIdentity = null

  if (!prepared || prepared.key === appliedIdentityKey) return

  appliedIdentityKey = prepared.key
  window.fbq?.("init", pixelId, prepared.payload)
}

/**
 * Tell the pixel who the buyer is. Called as soon as the checkout form has a
 * valid email/phone, so every later event (AddPaymentInfo, Purchase) carries
 * the match keys. Safe to call repeatedly; only a changed identity is sent.
 */
export function identifyMetaUser(identity: MetaUserIdentity): void {
  if (typeof window === "undefined" || !metaPixelId()) return

  const prepared = identityPayload(identity)
  if (!prepared) return

  if (!pendingIdentity && prepared.key === appliedIdentityKey) return

  pendingIdentity = identity
  applyIdentity()
}

export function flushMetaQueue(): void {
  if (!isMetaPixelReady()) return

  applyIdentity()

  const pending = queue.splice(0, queue.length)
  for (const item of pending) {
    trackMeta(item.event, item.params, item.eventId)
  }
}

export function trackMeta(
  event: string,
  params?: MetaEventParams,
  eventId?: string
): void {
  if (typeof window === "undefined") return

  /* tracking disabled: never queue and never call fbq */
  if (!metaPixelId()) return

  if (typeof window.fbq !== "function") {
    if (queue.length < MAX_QUEUE) {
      queue.push({ event, params, eventId })
    }
    return
  }

  const hasParams = Boolean(params && Object.keys(params).length > 0)

  if (hasParams && eventId) {
    window.fbq?.("track", event, params, { eventID: eventId })
    return
  }

  if (hasParams) {
    window.fbq?.("track", event, params)
    return
  }

  window.fbq?.("track", event)
}

export function trackPageView(): void {
  trackMeta("PageView")
}

export function trackViewContent(params: MetaEventParams): void {
  trackMeta("ViewContent", params)
}

export function trackAddToCart(params: MetaEventParams): void {
  trackMeta("AddToCart", params)
}

export function trackInitiateCheckout(params: MetaEventParams): void {
  trackMeta("InitiateCheckout", params)
}

export function trackAddPaymentInfo(params: MetaEventParams): void {
  trackMeta("AddPaymentInfo", params)
}

export function trackPurchase(params: MetaEventParams, eventId?: string): void {
  trackMeta("Purchase", params, eventId)
}

export function trackLead(params?: MetaEventParams): void {
  trackMeta("Lead", params)
}

export function trackContact(): void {
  trackMeta("Contact")
}
