export type StoreLocale = "ar" | "en"

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

    if (parsed.pathname.startsWith("/images/")) {
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    return trimmed
  }

  return trimmed
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

  return locale === "ar" ? "متاح" : "Available"
}
