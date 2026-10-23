export const MEDUSA_BACKEND_URL = 
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

export const MEDUSA_PUBLISHABLE_KEY = 
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "3WEEQ"

export const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "sar"
export const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "ar"
export const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "GCC"

export const getMedusaHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
  }
  return headers
}
