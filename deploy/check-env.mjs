#!/usr/bin/env node
/**
 * Pre-flight env check for a 3WEEQ production deploy.
 *
 *   node deploy/check-env.mjs                    # checks ./.env.production + ./medusa/.env
 *   APP_DIR=/var/www/threeweeq node deploy/check-env.mjs
 *
 * Fails (exit 1) on a missing required key, on the well-known placeholder
 * values, and on cross-file drift (backend URL / publishable key present in one
 * file but not the other). Warnings never fail the build.
 */
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const APP_DIR = resolve(process.env.APP_DIR ?? process.cwd())
const WEB_ENV = process.env.WEB_ENV ?? join(APP_DIR, ".env.production")
const API_ENV = process.env.API_ENV ?? join(APP_DIR, "medusa", ".env")
const PRODUCTION =
  process.env.NODE_ENV === "production" || process.argv.includes("--production")

const problems = []
const warnings = []

function parseEnvFile(path) {
  if (!existsSync(path)) {
    problems.push(`missing env file: ${path}`)
    return {}
  }

  const result = {}
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const eq = line.indexOf("=")
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

const web = parseEnvFile(WEB_ENV)
const api = parseEnvFile(API_ENV)

const REQUIRED_WEB = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "MEDUSA_BACKEND_URL",
  "MEDUSA_PUBLISHABLE_KEY",
  "REVALIDATE_SECRET",
]

const REQUIRED_API = [
  "DATABASE_URL",
  "JWT_SECRET",
  "COOKIE_SECRET",
  "STORE_CORS",
  "ADMIN_CORS",
  "AUTH_CORS",
  "MEDUSA_BACKEND_URL",
  "MEDUSA_STOREFRONT_URL",
  "STOREFRONT_URL",
  "REVALIDATE_SECRET",
]

const OPTIONAL_IN_PRODUCTION = {
  web: {
    NEXT_PUBLIC_META_PIXEL_ID: "Meta Pixel browser events",
  },
  api: {
    STRIPE_SECRET_KEY:
      "online card payments (checkout cannot complete without it)",
    STRIPE_WEBHOOK_SECRET:
      "Stripe webhooks (orders stay unauthorised without it)",
    RESEND_API_KEY: "order confirmation emails (outbox events stay pending)",
    EMAIL_FROM: "verified sender address for Resend",
    EMAIL_REPLY_TO: "reply-to address on customer emails",
    ORDER_NOTIFICATION_EMAIL:
      "merchant new-order alerts (comma-separated list is allowed)",
    META_PIXEL_ID: "Meta Conversions API (server-side Purchase)",
    META_CAPI_ACCESS_TOKEN: "Meta Conversions API (server-side Purchase)",
  },
}

const PLACEHOLDERS = [
  "ضع_المفتاح_هنا",
  "ضع-سر-طويل-عشوائي",
  "ضع_السر",
  "pk_test_placeholder",
  "sk_test_ضع_المفتاح",
  "YOUR_DOMAIN",
  "API_DOMAIN",
  "example.com",
  "localhost",
]

function checkRequired(source, keys, label) {
  for (const key of keys) {
    const value = source[key]

    if (!value) {
      problems.push(`${label}: ${key} is missing`)
      continue
    }

    const placeholder = PLACEHOLDERS.find((token) => value.includes(token))
    if (placeholder) {
      problems.push(
        `${label}: ${key} still contains the placeholder "${placeholder}"`
      )
    }
  }
}

checkRequired(web, REQUIRED_WEB, ".env.production")
checkRequired(api, REQUIRED_API, "medusa/.env")

/* The merchant alert is opt-in. A typo would either silently queue nothing or
   bounce every order, so reject malformed addresses before deploy. */
if (api.ORDER_NOTIFICATION_EMAIL) {
  const invalid = api.ORDER_NOTIFICATION_EMAIL.split(/[,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))

  if (invalid.length) {
    problems.push(
      `medusa/.env: ORDER_NOTIFICATION_EMAIL has invalid address(es): ${invalid.join(", ")}`
    )
  }
}

if (api.ABANDONED_CART_EMAILS_ENABLED === "true") {
  warnings.push(
    "medusa/.env: ABANDONED_CART_EMAILS_ENABLED is on, but no abandoned-cart email template exists yet — those events will never send."
  )
}

for (const [label, source, config] of [
  [".env.production", web, OPTIONAL_IN_PRODUCTION.web],
  ["medusa/.env", api, OPTIONAL_IN_PRODUCTION.api],
]) {
  for (const [key, why] of Object.entries(config)) {
    if (!source[key]) {
      const message = `${label}: ${key} is not set — ${why}`
      if (PRODUCTION) warnings.push(message)
      else warnings.push(`${message} (optional outside production)`)
    }
  }
}

/* A leftover test code silently reroutes every Conversions API event to
   Test Events, where it is visible but never counted against ads. Treat it as
   a hard failure in production instead of a silent measurement outage. */
if (api.META_TEST_EVENT_CODE) {
  const message =
    "medusa/.env: META_TEST_EVENT_CODE is set — every Conversions API event is treated as a test event and excluded from reporting. Remove it."
  if (PRODUCTION) problems.push(message)
  else warnings.push(message)
}

// --- cross-file consistency -------------------------------------------------
const webBackend = web.MEDUSA_BACKEND_URL?.replace(/\/+$/, "")
const apiBackend = api.MEDUSA_BACKEND_URL?.replace(/\/+$/, "")
if (webBackend && apiBackend && webBackend !== apiBackend) {
  problems.push(
    `MEDUSA_BACKEND_URL differs: .env.production=${webBackend} vs medusa/.env=${apiBackend}`
  )
}

if (
  web.MEDUSA_PUBLISHABLE_KEY &&
  web.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY &&
  web.MEDUSA_PUBLISHABLE_KEY !== web.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
) {
  problems.push(
    "MEDUSA_PUBLISHABLE_KEY and NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY differ in .env.production"
  )
}

if (
  web.REVALIDATE_SECRET &&
  api.REVALIDATE_SECRET &&
  web.REVALIDATE_SECRET !== api.REVALIDATE_SECRET
) {
  problems.push(
    "REVALIDATE_SECRET differs between .env.production and medusa/.env — revalidation will 401"
  )
}

if (
  web.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY &&
  !web.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.startsWith("pk_")
) {
  problems.push(
    "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY does not look like a pk_ key"
  )
}

for (const key of ["JWT_SECRET", "COOKIE_SECRET", "REVALIDATE_SECRET"]) {
  const value = api[key] ?? web[key]
  if (value && value.length < 32) {
    warnings.push(`${key} is shorter than 32 characters`)
  }
}

// --- report -----------------------------------------------------------------
console.log(`web env: ${WEB_ENV}`)
console.log(`api env: ${API_ENV}\n`)

for (const warning of warnings) console.log(`  warn  ${warning}`)
for (const problem of problems) console.log(`  FAIL  ${problem}`)

if (problems.length) {
  console.log(`\n${problems.length} problem(s) found.`)
  process.exit(1)
}

console.log(
  `\nEnvironment looks consistent${warnings.length ? ` (${warnings.length} warning(s))` : ""}.`
)
