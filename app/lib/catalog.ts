export const STORE_PRODUCT_TYPES = [
  { code: "fragrance", label: "العطور" },
  { code: "incense", label: "الدخون" },
  { code: "jewelry", label: "المجوهرات" },
  { code: "textile", label: "الأقمشة" },
  { code: "leather", label: "الجلديات" },
  { code: "artifact", label: "المختارات" },
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
