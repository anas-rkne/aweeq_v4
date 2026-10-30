"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { forgetCartId } from "@/lib/cart"
import { completeCheckout } from "./api"

const PENDING_CHECKOUT_KEY = "threeweeq_pending_checkout"

type PendingCheckout = {
  cart_id: string
  payment_session_id: string
  provider_id: string
  idempotency_key: string
}

export function CheckoutCallback() {
  const t = useTranslations("Checkout")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<"verifying" | "error">("verifying")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function run() {
      const sessionId = searchParams.get("session_id")
      const pending = readPendingCheckout()

      if (!sessionId || !pending) {
        setMessage(t("orderNotFound"))
        setState("error")
        return
      }

      // The server re-checks the Stripe Checkout Session is actually paid
      // before completing the order, so no client-side verification here.
      try {
        const response = await completeCheckout({
          cart_id: pending.cart_id,
          payment_session_id: pending.payment_session_id,
          provider_id: pending.provider_id,
          locale,
          idempotency_key: pending.idempotency_key,
        })

        if (active) {
          sessionStorage.removeItem(PENDING_CHECKOUT_KEY)
          forgetCartId()
          router.replace(`/order/${response.order_id}`)
        }
      } catch (completeError) {
        setMessage(
          completeError instanceof Error
            ? completeError.message
            : t("genericError")
        )
        setState("error")
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [locale, router, searchParams, t])

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      {state === "verifying" ? (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
          <p className="mt-5 font-primary text-base text-sand">
            {t("verifying")}
          </p>
        </>
      ) : (
        <>
          <h1 className="font-primary text-h2 text-gold">
            {t("paymentError")}
          </h1>
          {message && (
            <p className="mt-3 max-w-md font-primary text-sm text-sand/55">
              {message}
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push("/checkout")}
            className="mt-6 border border-gold bg-gold px-6 py-3 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand"
          >
            {t("backToCheckout")}
          </button>
        </>
      )}
    </main>
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
