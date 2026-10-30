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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
      </div>
    )
  }

  if (state === "error" || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="font-primary text-h2 text-gold">{t("orderNotFound")}</h1>
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="mt-8 flex h-12 items-center justify-center rounded-\[var\(--store-radius-sm\)\] bg-gold px-8 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand"
        >
          {t("backToStore")}
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 py-16 md:px-10">
      <div className="mx-auto max-w-[40rem]">
        <h1 className="text-center font-primary text-h2 leading-[1.2] text-gold">
          {t("orderConfirmed")}
        </h1>

        {/* the receipt, stamped */}
        <div className="mt-8 rounded-\[var\(--store-radius\)\] bg-sand px-6 py-10 text-center md:px-10 md:py-12">
          {/* the house's seal */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold">
            <div>
              <p className="font-primary text-[13px] leading-none text-royal-navy/60">
                {t("orderNumber")}
              </p>
              <p className="mt-1.5 font-secondary text-base leading-none text-royal-navy">
                {order.display_id ?? order.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <p className="mt-6 font-primary text-body leading-[1.7] text-royal-navy/80">
            {t("orderNote")}
          </p>

          <ul className="mt-8 text-start">
            {order.items.map((item) => {
              const image = normalizeImageUrl(item.thumbnail)
              return (
                <li
                  key={item.id}
                  className="flex gap-4 border-b border-royal-navy/15 py-4 first:border-t"
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-\[var\(--store-radius-sm\)\] bg-royal-navy/10">
                    {image ? (
                      <Image
                        src={image}
                        alt={item.title ?? ""}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center font-secondary text-xs text-royal-navy/40">
                        3W
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-primary text-body text-royal-navy">
                      {item.title}
                    </p>
                    {item.variant_title && (
                      <p className="mt-1 font-primary text-small text-royal-navy/60">
                        {item.variant_title}
                      </p>
                    )}
                    <p className="mt-1 font-primary text-small text-royal-navy/60">
                      {t("quantityLabel")}: {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 font-secondary text-base text-royal-navy">
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

          <dl className="mt-8 space-y-3 text-start font-primary text-body">
            <div className="flex justify-between gap-4">
              <dt className="text-royal-navy/60">{t("subtotalLabel")}</dt>
              <dd className="text-royal-navy">
                {formatPrice(
                  order.subtotal,
                  order.currency_code ?? "aed",
                  storeLocale
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-royal-navy/60">{t("shippingLabel")}</dt>
              <dd className="text-royal-navy">
                {formatPrice(
                  order.shipping_total,
                  order.currency_code ?? "aed",
                  storeLocale
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-royal-navy/20 pt-3">
              <dt className="text-royal-navy">{t("totalLabel")}</dt>
              <dd className="font-secondary text-h3 leading-none text-royal-navy">
                {formatPrice(
                  order.total,
                  order.currency_code ?? "aed",
                  storeLocale
                )}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => router.push("/products")}
            className="mt-8 flex h-12 w-full items-center justify-center rounded-\[var\(--store-radius-sm\)\] bg-royal-navy px-8 font-primary text-sm font-bold text-sand transition-colors duration-300 hover:bg-navy-800"
          >
            {t("backToStore")}
          </button>
        </div>
      </div>
    </div>
  )
}
