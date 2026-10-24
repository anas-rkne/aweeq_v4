export const STORE_PRODUCT_TYPES = [
  { code: "fragrance", label: "عطور" },
  { code: "incense", label: "بخور" },
  { code: "jewelry", label: "مجوهرات" },
  { code: "textile", label: "أقمشة" },
  { code: "leather", label: "منتجات جلدية" },
  { code: "artifact", label: "تحف" },
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
