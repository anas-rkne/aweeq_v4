import Medusa from "@medusajs/js-sdk"
import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from "./config"

export { MedusaApiError, medusaFetch } from "./medusa-fetch"

export const medusaClient = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
})
