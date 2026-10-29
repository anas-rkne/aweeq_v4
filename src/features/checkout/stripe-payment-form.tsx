"use client"

import { useState } from "react"
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { formatPrice } from "@/lib/format"
import type { StoreLocale } from "@/lib/format"

type PendingCheckout = {
  cart_id: string
  payment_session_id: string
  provider_id: string
  idempotency_key: string
}

const PENDING_CHECKOUT_KEY = "threeweeq_pending_checkout"

export function StripePaymentForm({
  amount,
  currencyCode,
  storeLocale,
  error,
  loading,
  payLabel,
  processingLabel,
  backLabel,
  onBack,
  onError,
  onLoading,
  onFinalize,
}: {
  amount: number
  currencyCode: string
  storeLocale: StoreLocale
  error: string | null
  loading: boolean
  payLabel: string
  processingLabel: string
  backLabel: string
  onBack: () => void
  onError: (message: string | null) => void
  onLoading: (loading: boolean) => void
  onFinalize: (pending: PendingCheckout) => Promise<void>
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardComplete, setCardComplete] = useState(false)

  async function handlePay() {
    if (!stripe || !elements) return

    const pending = readPendingCheckout()
    if (!pending) {
      onError("pending_checkout_missing")
      return
    }

    onLoading(true)
    onError(null)

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/${storeLocale === "en" ? "en" : "ar"}/checkout/callback`,
      },
    })

    if (confirmError) {
      onLoading(false)
      onError(confirmError.message ?? "payment_failed")
      return
    }

    if (paymentIntent) {
      if (
        paymentIntent.status === "succeeded" ||
        paymentIntent.status === "requires_capture"
      ) {
        await onFinalize(pending)
      } else {
        onLoading(false)
        onError("payment_not_completed")
      }
    }
    // When Stripe redirects (3DS), the callback page finalizes the order.
  }

  return (
    <div className="space-y-5">
      <div className="border border-sand/20 bg-royal-navy/60 px-4 py-4">
        <PaymentElement onChange={(event) => setCardComplete(event.complete)} />
      </div>

      <p className="font-primary text-xs text-sand/45">
        {formatPrice(amount, currencyCode, storeLocale)}
      </p>

      {error && (
        <p role="alert" className="font-primary text-sm text-gold">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="border border-sand/20 px-6 py-3 font-primary text-sm text-sand/70 transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-60"
        >
          {backLabel}
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={!stripe || loading || !cardComplete}
          className="flex-1 border border-gold bg-gold px-6 py-4 font-primary text-base font-bold text-royal-navy transition-colors hover:bg-sand disabled:opacity-60"
        >
          {loading ? processingLabel : payLabel}
        </button>
      </div>
    </div>
  )
}

function readPendingCheckout(): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingCheckout
    if (!parsed.cart_id || !parsed.payment_session_id) return null
    return parsed
  } catch {
    return null
  }
}
