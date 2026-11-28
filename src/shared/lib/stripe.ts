import { loadStripe, type Stripe } from "@stripe/stripe-js"

/**
 * Stripe.js is loaded once for the whole tab. The publishable key is public by
 * design; it is read from the build-time env so the key is never committed.
 */
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

let promise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> | null {
  if (!publishableKey || !publishableKey.startsWith("pk_")) {
    return null
  }

  if (!promise) {
    promise = loadStripe(publishableKey)
  }

  return promise
}
