import { createHmac, timingSafeEqual } from "crypto"

export function headerValue(
  headers: Record<string, unknown>,
  name: string
): string | undefined {
  const direct = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(direct)) {
    return direct[0] ? String(direct[0]) : undefined
  }

  return direct === undefined ? undefined : String(direct)
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function hmacHex(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

function tapAmount(amount: unknown, currency: unknown) {
  const numeric = Number(amount ?? 0)
  const code = String(currency ?? "").toUpperCase()
  const decimals = ["BHD", "KWD", "OMR", "JOD"].includes(code) ? 3 : 2

  return numeric.toFixed(decimals)
}

function objectValue(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

/* Stripe's own libraries default to five minutes: a captured request replayed
   later must not authorise a second order. The unique webhook-event row is the
   second line of defence, this is the first. */
const STRIPE_TOLERANCE_SECONDS = 300

export function verifyStripeSignature(
  rawBody: string,
  headers: Record<string, unknown>,
  secret: string | undefined,
  options: { toleranceSeconds?: number; now?: number } = {}
) {
  /* Fail closed. A missing secret used to accept every payload, so a
     half-configured deploy silently became an open webhook endpoint. */
  if (!secret) {
    return false
  }

  const signatureHeader = headerValue(headers, "stripe-signature")
  if (!signatureHeader) {
    return false
  }

  const timestamp = signatureHeader
    .split(",")
    .map((part) => part.split("=", 2))
    .find(([key]) => key?.trim() === "t")?.[1]
    ?.trim()

  /* A rotating endpoint secret makes Stripe sign with the old and the new
     secret at once, so every v1 entry has to be tried — not just the last. */
  const signatures = signatureHeader
    .split(",")
    .map((part) => part.split("=", 2))
    .filter(([key]) => key?.trim() === "v1")
    .map(([, value]) => value?.trim())
    .filter((value): value is string => Boolean(value))

  if (!timestamp || !signatures.length) {
    return false
  }

  const stamp = Number(timestamp)
  if (!Number.isFinite(stamp)) {
    return false
  }

  const tolerance = options.toleranceSeconds ?? STRIPE_TOLERANCE_SECONDS
  const now = options.now ?? Math.floor(Date.now() / 1000)

  if (tolerance > 0 && Math.abs(now - stamp) > tolerance) {
    return false
  }

  const expected = hmacHex(`${timestamp}.${rawBody}`, secret)

  return signatures.some((signature) => safeEqual(expected, signature))
}

export function verifyTapSignature(
  rawBody: string,
  headers: Record<string, unknown>,
  secret: string | undefined,
  body?: Record<string, unknown>
) {
  /* Fail closed: without a secret there is nothing to verify against. */
  if (!secret) {
    return false
  }

  const signature =
    headerValue(headers, "hashstring") ??
    (typeof body?.hashstring === "string" ? body.hashstring : undefined)

  if (!signature) {
    return false
  }

  const reference = objectValue(body?.reference)
  const transaction = objectValue(body?.transaction)
  const payload = [
    "x_id",
    String(body?.id ?? ""),
    "x_amount",
    tapAmount(body?.amount, body?.currency),
    "x_currency",
    String(body?.currency ?? ""),
    "x_gateway_reference",
    String(reference.gateway ?? ""),
    "x_payment_reference",
    String(reference.payment ?? ""),
    "x_status",
    String(body?.status ?? ""),
    "x_created",
    String(transaction.created ?? body?.created ?? ""),
  ].join("")

  if (safeEqual(hmacHex(payload, secret), signature)) {
    return true
  }

  return safeEqual(
    hmacHex(rawBody, secret),
    signature.replace(/^sha256=/i, "")
  )
}
