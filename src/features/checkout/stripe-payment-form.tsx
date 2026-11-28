"use client"

import { useState } from "react"
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout"
import type {
  Stripe,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js"

/**
 * The payment form rendered inside 3WEEQ instead of redirecting to Stripe's
 * hosted page.
 *
 * Why: Stripe's hosted Checkout is a cross-site page whose payment form calls
 * `api.stripe.com/v1/payment_pages/.../init`. Instagram/Facebook in-app
 * webviews block or lose that initialisation, leaving the customer with the
 * order total and no card fields — the exact screenshot this fixes. Stripe's
 * Payment Element is explicitly supported in in-app webviews, and Apple Pay is
 * supported in iOS webviews, so the customer pays without leaving the store.
 */

const APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorText: "#f6e6d6",
    colorDanger: "#e4a11b",
    colorPrimary: "#c9994a",
    fontSizeBase: "16px",
    borderRadius: "2px",
  },
}

type Props = {
  stripe: Promise<Stripe | null>
  clientSecret: string
  payLabel: string
  processingLabel: string
  backLabel: string
  onBack: () => void
  onError: (message: string | null) => void
  /** Called with the Checkout Session id after a successful confirmation. */
  onSuccess: (sessionId: string) => void
}

export function StripePaymentForm(props: Props) {
  return (
    <CheckoutElementsProvider
      stripe={props.stripe}
      options={{
        clientSecret: props.clientSecret,
        elementsOptions: { appearance: APPEARANCE },
      }}
    >
      <CheckoutPaymentForm {...props} />
    </CheckoutElementsProvider>
  )
}

function CheckoutPaymentForm({
  payLabel,
  processingLabel,
  backLabel,
  onBack,
  onError,
  onSuccess,
}: Props) {
  const checkoutState = useCheckoutElements()
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fail(message: string) {
    setLoading(false)
    setError(message)
    onError(message)
  }

  async function confirmPayment(extra?: {
    expressCheckoutConfirmEvent?: StripeExpressCheckoutElementConfirmEvent
  }) {
    if (checkoutState.type !== "success" || loading) return

    setLoading(true)
    setError(null)
    onError(null)

    try {
      /* `if_required` keeps card payments on this page; a 3DS challenge
         redirects to the session's return_url and the callback finalises. */
      const result = await checkoutState.checkout.confirm({
        redirect: "if_required",
        ...extra,
      })

      if (result.type === "error") {
        fail(result.error.message)
        return
      }

      onSuccess(result.session.id)
    } catch (confirmError) {
      fail(
        confirmError instanceof Error ? confirmError.message : "payment_failed"
      )
    }
  }

  if (checkoutState.type === "loading") {
    return (
      <div className="space-y-3 border border-sand/20 bg-royal-navy/60 px-4 py-8">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
        <p className="text-center font-primary text-sm text-sand/55">
          جارٍ تجهيز الدفع...
        </p>
      </div>
    )
  }

  if (checkoutState.type === "error") {
    return (
      <div className="space-y-4">
        <p role="alert" className="font-primary text-sm text-gold">
          تعذّر تجهيز الدفع: {checkoutState.error.message}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="h-12 rounded-[var(--store-radius-sm)] border border-sand/20 px-6 font-primary text-sm text-sand/70 transition-colors hover:border-gold/50 hover:text-gold"
        >
          {backLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ExpressCheckoutElement
        onConfirm={(event) =>
          void confirmPayment({ expressCheckoutConfirmEvent: event })
        }
      />

      <div className="space-y-4 border border-sand/20 bg-royal-navy/60 px-4 py-4">
        <PaymentElement
          onChange={(event) => setPaymentComplete(event.complete)}
          onLoadError={() =>
            fail(
              "تعذّر تحميل خانات الدفع. تأكد من اتصالك بالإنترنت وحاول مرة أخرى."
            )
          }
        />
      </div>

      <p className="font-primary text-xs text-sand/45">
        الدفع آمن ومشفّر عبر Stripe
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
          className="h-12 rounded-[var(--store-radius-sm)] border border-sand/20 px-6 font-primary text-sm text-sand/70 transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-60"
        >
          {backLabel}
        </button>
        <button
          type="button"
          onClick={() => void confirmPayment()}
          disabled={!paymentComplete || loading}
          className="h-12 flex-1 rounded-[var(--store-radius-sm)] border border-gold bg-gold px-6 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand disabled:opacity-60"
        >
          {loading ? processingLabel : payLabel}
        </button>
      </div>

      <p className="text-center font-primary text-[11px] leading-5 text-sand/40">
        بيانات بطاقتك تُرسل مباشرةً إلى Stripe ولا تمر عبر خوادمنا.
      </p>
    </div>
  )
}
