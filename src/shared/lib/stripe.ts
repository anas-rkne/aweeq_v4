import { loadStripe, type Stripe } from "@stripe/stripe-js"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

let promise: Promise<Stripe | null> | null = null

export function getStripe() {
  if (!publishableKey || !publishableKey.startsWith("pk_")) {
    return null
  }

  if (!promise) {
    promise = loadStripe(publishableKey)
  }

  return promise
}
