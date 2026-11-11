export type StoreLocale = "ar" | "en"

/* Mirrors the `remotePatterns` in next.config.ts: next/image only optimises
   these hosts, anything else answers 400. */
const ALLOWED_IMAGE_HOSTS = new Set<string>(
  [process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL, process.env.NEXT_PUBLIC_SITE_URL]
    .map((value) => {
      if (!value) return null
      try {
        return new URL(value).hostname
      } catch {
        return null
      }
    })
    .filter((host): host is string => Boolean(host))
)

/* The API origin that serves uploaded files under /static. */
const BACKEND_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "").hostname
  } catch {
    return null
  }
})()

export function formatPrice(
  amount: number | null | undefined,
  currencyCode: string = "aed",
  locale: StoreLocale = "ar"
) {
  if (amount == null || !Number.isFinite(amount)) {
    return ""
  }

  const value = amount
  const hasFraction = Math.round(value * 100) % 100 !== 0
  const numberLocale = locale === "en" ? "en-AE" : "ar-AE"

  try {
    return new Intl.NumberFormat(numberLocale, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(value)
  } catch {
    return `${value} ${currencyCode.toUpperCase()}`
  }
}

export function formatPriceRange(
  range: { min: number; max: number } | null,
  currencyCode: string = "aed",
  locale: StoreLocale = "ar"
) {
  if (!range) {
    return ""
  }

  if (range.min === range.max) {
    return formatPrice(range.min, currencyCode, locale)
  }

  return `${formatPrice(range.min, currencyCode, locale)} – ${formatPrice(
    range.max,
    currencyCode,
    locale
  )}`
}

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }

  if (typeof value === "object") {
    return value as T
  }

  return fallback
}

export function normalizeImageUrl(url: string | null | undefined) {
  if (!url) {
    return null
  }

  const trimmed = url.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith("/")) {
    return trimmed
  }

  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)

    /* the shop's own files are served from this origin */
    if (parsed.pathname.startsWith("/images/")) {
      return `${parsed.pathname}${parsed.search}`
    }

    /* next/image only accepts the hosts declared in next.config. A stale
       "http://localhost:9000/static/..." left over from a dev upload would
       otherwise answer 400 on every render, so it is dropped here instead. */
    if (ALLOWED_IMAGE_HOSTS.size && !ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
      return null
    }

    return trimmed
  } catch {
    return trimmed
  }
}

/**
 * The same URL, but fetched through our own origin.
 *
 * `<img>` tags are happy with a cross-origin file, but a `<canvas>` is not:
 * drawing a picture from a host that sends no CORS header taints the canvas
 * and the WebGL texture comes out blank. The store invitation must use this,
 * everything else can keep `normalizeImageUrl`.
 */
export function mediaProxyUrl(url: string | null | undefined) {
  const normalized = normalizeImageUrl(url)

  if (!normalized || normalized.startsWith("/")) {
    return normalized
  }

  try {
    const parsed = new URL(normalized)

    if (
      parsed.pathname.startsWith("/static/") &&
      (!BACKEND_HOST || parsed.hostname === BACKEND_HOST)
    ) {
      return `/api/media/${parsed.pathname.slice("/static/".length)}${
        parsed.search
      }`
    }
  } catch {
    /* fall through to the plain URL */
  }

  return normalized
}

export function stripHtml(value: string | null | undefined) {
  if (!value) {
    return ""
  }

  return value.replace(/<[^>]*>/g, "")
}

export function concentrationLabel(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const labels: Record<string, string> = {
    extrait: "Extrait de Parfum",
    edp: "Eau de Parfum",
    edt: "Eau de Toilette",
    parfum: "Parfum",
  }

  return labels[value.toLowerCase()] ?? value
}

export function stockLabel(
  variant: {
    in_stock: boolean
    available_serial_units?: number | null
    is_serialized?: boolean
    stock_quantity?: number | null
  },
  locale: StoreLocale = "ar"
) {
  if (!variant.in_stock) {
    return locale === "ar" ? "نفدت الكمية" : "Sold out"
  }

  if (
    variant.is_serialized &&
    typeof variant.available_serial_units === "number"
  ) {
    return locale === "ar"
      ? `متاح ${variant.available_serial_units} قطعة مرقّمة`
      : `${variant.available_serial_units} numbered pieces available`
  }

  // The owner asked to nudge the shopper only when a piece is nearly gone.
  if (!variant.is_serialized && typeof variant.stock_quantity === "number") {
    if (variant.stock_quantity === 1) {
      return locale === "ar" ? "آخر قطعة" : "Last piece"
    }

    if (variant.stock_quantity === 2) {
      return locale === "ar" ? "آخر قطعتين" : "Last 2 pieces"
    }
  }

  return locale === "ar" ? "متاح" : "Available"
}
