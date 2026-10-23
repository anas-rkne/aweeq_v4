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

export function verifyStripeSignature(
  rawBody: string,
  headers: Record<string, unknown>,
  secret: string | undefined
) {
  if (!secret) {
    return true
  }

  const signatureHeader = headerValue(headers, "stripe-signature")
  if (!signatureHeader) {
    return false
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>(
    (result, part) => {
      const [key, value] = part.split("=", 2)
      if (key && value) {
        result[key.trim()] = value.trim()
      }
      return result
    },
    {}
  )

  const timestamp = parts.t
  const signature = parts.v1

  if (!timestamp || !signature) {
    return false
  }

  return safeEqual(hmacHex(`${timestamp}.${rawBody}`, secret), signature)
}

export function verifyTapSignature(
  rawBody: string,
  headers: Record<string, unknown>,
  secret: string | undefined,
  body?: Record<string, unknown>
) {
  if (!secret) {
    return true
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
