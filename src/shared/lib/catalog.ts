export const STORE_PRODUCT_TYPES = [
  { code: "fragrance", labelAr: "عطور", labelEn: "Fragrances" },
  { code: "incense", labelAr: "بخور", labelEn: "Incense" },
  { code: "smokers", labelAr: "مخمرية", labelEn: "Smokers" },
  { code: "textile", labelAr: "أقمشة", labelEn: "Textiles" },
] as const

export const STORE_PAGE_SIZE = 12

export function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

export function asPositiveInt(value: string | string[] | undefined) {
  const parsed = Number(asString(value))
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0
}
