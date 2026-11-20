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

/** The numeric pixel id, or null when tracking is not configured. */
export function metaPixelId(): string | null {
  const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!raw) return null
  const id = raw.replace(/[^\d]/g, "")
  return id.length >= 10 ? id : null
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

export function flushMetaQueue(): void {
  if (!isMetaPixelReady()) return

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
