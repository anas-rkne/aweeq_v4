"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { formatPrice, normalizeImageUrl } from "@/lib/format"
import type { StoreLocale } from "@/lib/format"
import { fetchGuestOrder, type GuestOrder } from "./api"

const CHECKOUT_EMAIL_KEY = "threeweeq_checkout_email"

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const t = useTranslations("Checkout")
  const locale = useLocale()
  const router = useRouter()
  const storeLocale: StoreLocale = locale === "en" ? "en" : "ar"
  const [order, setOrder] = useState<GuestOrder | null>(null)
  const [state, setState] = useState<"loading" | "error" | "ready">("loading")

  useEffect(() => {
    let active = true

    async function run() {
      try {
        const email = localStorage.getItem(CHECKOUT_EMAIL_KEY) ?? ""
        if (!email) {
          throw new Error("email_missing")
        }

        const response = await fetchGuestOrder(orderId, email)
        if (!active) return
        setOrder(response.order)
        setState("ready")
      } catch {
        if (active) {
          setState("error")
        }
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [orderId])

  if (state === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-royal-navy">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
      </main>
    )
  }

  if (state === "error" || !order) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center bg-royal-navy px-6 text-center">
        <h1 className="font-primary text-2xl text-sand">
          {t("orderNotFound")}
        </h1>
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="mt-6 border border-gold bg-gold px-6 py-3 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand"
        >
          {t("backToStore")}
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-royal-navy px-5 py-10 md:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="border border-gold/30 bg-gold/5 p-6 text-center md:p-10">
          <h1 className="font-primary text-2xl text-gold md:text-3xl">
            {t("orderConfirmed")}
          </h1>
          <p className="mt-3 font-secondary text-sm tracking-[0.15em] text-sand/70">
            {t("orderNumber")}: {order.display_id ?? order.id.slice(0, 8)}
          </p>
          <p className="mt-3 font-primary text-sm text-sand/55">
            {t("orderNote")}
          </p>
        </div>

        <div className="mt-8 border border-sand/10 p-5 md:p-6">
          <ul className="divide-y divide-sand/10">
            {order.items.map((item) => {
              const image = normalizeImageUrl(item.thumbnail)
              return (
                <li key={item.id} className="flex gap-4 py-4 first:pt-0">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden border border-sand/10 bg-sand/[0.03]">
                    {image ? (
                      <Image
                        src={image}
                        alt={item.title ?? ""}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center font-secondary text-xs text-gold/40">
                        3W
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-primary text-sm text-sand">
                      {item.title}
                    </p>
                    {item.variant_title && (
                      <p className="mt-1 font-primary text-xs text-sand/45">
                        {item.variant_title}
                      </p>
                    )}
                    <p className="mt-1 font-primary text-xs text-sand/40">
                      {t("quantityLabel")}: {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 font-secondary text-sm text-gold">
                    {formatPrice(
                      item.total ?? (item.unit_price ?? 0) * item.quantity,
                      order.currency_code ?? "aed",
                      storeLocale
                    )}
                  </p>
                </li>
              )
            })}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-sand/10 pt-4 font-primary text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-sand/50">{t("subtotalLabel")}</dt>
              <dd className="text-sand/85">
                {formatPrice(
                  order.subtotal,
                  order.currency_code ?? "aed",
                  storeLocale
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-sand/50">{t("shippingLabel")}</dt>
              <dd className="text-sand/85">
                {formatPrice(
                  order.shipping_total,
                  order.currency_code ?? "aed",
                  storeLocale
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-sand/10 pt-3">
              <dt className="text-sand">{t("totalLabel")}</dt>
              <dd className="font-secondary text-lg text-gold">
                {formatPrice(
                  order.total,
                  order.currency_code ?? "aed",
                  storeLocale
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="border border-gold bg-gold px-6 py-3 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand"
          >
            {t("backToStore")}
          </button>
        </div>
      </div>
    </main>
  )
}
