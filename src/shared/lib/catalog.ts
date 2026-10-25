export const STORE_PRODUCT_TYPES = [
  { code: "fragrance", labelAr: "عطور", labelEn: "Fragrances" },
  { code: "incense", labelAr: "بخور", labelEn: "Incense" },
  { code: "jewelry", labelAr: "مجوهرات", labelEn: "Jewelry" },
  { code: "textile", labelAr: "أقمشة", labelEn: "Textiles" },
  { code: "leather", labelAr: "منتجات جلدية", labelEn: "Leather" },
  { code: "artifact", labelAr: "تحف", labelEn: "Artifacts" },
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
