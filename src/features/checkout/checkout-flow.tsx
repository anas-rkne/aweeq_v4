"use client"

import { useCallback, useState, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Elements } from "@stripe/react-stripe-js"
import { getStripe } from "@/shared/lib/stripe"
import { formatPrice } from "@/lib/format"
import { forgetCartId } from "@/lib/cart"
import { useCart } from "@/app/components/store/cart-provider"
import {
  completeCheckout,
  fetchShippingOptions,
  initCheckout,
  prepareCheckout,
  type CheckoutInitResponse,
  type ShippingOption,
} from "./api"
import { StripePaymentForm } from "./stripe-payment-form"

const PENDING_CHECKOUT_KEY = "threeweeq_pending_checkout"
const CHECKOUT_EMAIL_KEY = "threeweeq_checkout_email"

type PendingCheckout = {
  cart_id: string
  payment_session_id: string
  provider_id: string
  idempotency_key: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function CheckoutFlow() {
  const t = useTranslations("Checkout")
  const locale = useLocale()
  const router = useRouter()
  const { cart, status } = useCart()

  const [step, setStep] = useState<"details" | "shipping" | "payment">(
    "details"
  )
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState("")
  const [checkout, setCheckout] = useState<CheckoutInitResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const cartId = cart?.id ?? null
  const storeLocale = locale === "en" ? "en" : "ar"
  const currencyCode = cart?.currency_code ?? "aed"
  const total = cart?.total ?? 0

  const loadOptions = useCallback(async () => {
    if (!cartId || optionsLoading || options.length > 0) return
    setOptionsLoading(true)
    setError(null)
    try {
      setOptions(await fetchShippingOptions(cartId, locale))
    } catch {
      setError(t("genericError"))
    } finally {
      setOptionsLoading(false)
    }
  }, [cartId, locale, options.length, optionsLoading, t])

  function shippingAddress() {
    return {
      first_name: name.trim(),
      last_name: "",
      address_1: address.trim(),
      city: city.trim(),
      country_code: "AE",
      phone: phone.trim(),
    }
  }

  async function handleDetailsSubmit(event: FormEvent) {
    event.preventDefault()

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t("invalidEmail"))
      return
    }

    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      setError(t("requiredFields"))
      return
    }

    if (!cartId) {
      setError(t("genericError"))
      return
    }

    localStorage.setItem(CHECKOUT_EMAIL_KEY, email.trim())
    setError(null)
    setLoading(true)
    setOptionsLoading(true)

    try {
      // Address must be on the cart before Medusa can price shipping.
      const prepared = await prepareCheckout({
        cart_id: cartId,
        email: email.trim(),
        shipping_address: shippingAddress(),
        locale,
      })

      setOptions(prepared.shipping_options ?? [])
      setSelectedOption((current) => current || prepared.shipping_options?.[0]?.id || "")
      setStep("shipping")

      if (!prepared.shipping_options?.length) {
        setError(t("noShippingOptions"))
      }
    } catch (prepareError) {
      setError(
        prepareError instanceof Error ? prepareError.message : t("genericError")
      )
    } finally {
      setLoading(false)
      setOptionsLoading(false)
    }
  }

  async function handleShippingSubmit(event: FormEvent) {
    event.preventDefault()

    if (!cartId || !selectedOption) {
      setError(t("requiredFields"))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await initCheckout({
        cart_id: cartId,
        email: email.trim(),
        shipping_address: shippingAddress(),
        shipping_option_id: selectedOption,
        locale,
      })

      const pending: PendingCheckout = {
        cart_id: cartId,
        payment_session_id: response.payment_session_id,
        provider_id: response.provider_id ?? "pp_stripe_stripe",
        idempotency_key:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${cartId}-${Date.now()}`,
      }

      sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending))
      setCheckout(response)
      setStep("payment")
    } catch (initError) {
      setError(
        initError instanceof Error ? initError.message : t("genericError")
      )
    } finally {
      setLoading(false)
    }
  }

  async function finalizeOrder(pending: PendingCheckout) {
    try {
      const response = await completeCheckout({
        cart_id: pending.cart_id,
        payment_session_id: pending.payment_session_id,
        provider_id: pending.provider_id,
        locale,
        idempotency_key: pending.idempotency_key,
      })

      sessionStorage.removeItem(PENDING_CHECKOUT_KEY)
      forgetCartId()

      router.replace(`/order/${response.order_id}`)
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : t("genericError")
      )
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-royal-navy px-5 py-24 md:px-10">
        <div className="mx-auto max-w-xl animate-pulse space-y-4">
          <div className="h-8 w-1/2 bg-sand/10" />
          <div className="h-24 w-full bg-sand/5" />
          <div className="h-12 w-full bg-sand/10" />
        </div>
      </main>
    )
  }

  if (status === "ready" && (!cart || cart.items.length === 0)) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center bg-royal-navy px-6 text-center">
        <h1 className="font-primary text-2xl text-sand">{t("emptyTitle")}</h1>
        <p className="mt-3 font-primary text-sm text-sand/50">
          {t("emptyMessage")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="mt-6 border border-gold bg-gold px-6 py-3 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand"
        >
          {t("browseStore")}
        </button>
      </main>
    )
  }

  const stripe = getStripe()

  return (
    <main className="min-h-screen bg-royal-navy px-5 py-10 md:px-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-primary text-3xl text-gold md:text-4xl">
          {t("title")}
        </h1>

        <div className="mt-8 border border-sand/10 bg-sand/[0.02] p-5 md:p-8">
          {step === "details" && (
            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              <h2 className="font-primary text-xl text-sand">{t("contact")}</h2>

              <Field label={t("email")}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                  className={inputClass}
                />
              </Field>

              <Field label={t("name")}>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />
              </Field>

              <Field label={t("phone")}>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  className={inputClass}
                />
              </Field>

              <h2 className="pt-2 font-primary text-xl text-sand">
                {t("address")}
              </h2>

              <Field label={t("addressLine")}>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  autoComplete="street-address"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t("city")}>
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    autoComplete="address-level2"
                    className={inputClass}
                  />
                </Field>
                <Field label={t("country")}>
                  <input
                    value={t("countryUae")}
                    disabled
                    className={inputClass}
                  />
                </Field>
              </div>

              {error && (
                <p className="font-primary text-sm text-gold">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full border border-gold bg-gold px-6 py-4 font-primary text-base font-bold text-royal-navy transition-colors hover:bg-sand disabled:opacity-60"
              >
                {t("continue")}
              </button>
            </form>
          )}

          {step === "shipping" && (
            <form onSubmit={handleShippingSubmit} className="space-y-5">
              <h2 className="font-primary text-xl text-sand">
                {t("shippingTitle")}
              </h2>
              <p className="font-primary text-sm text-sand/50">
                {t("shippingNote")}
              </p>

              {optionsLoading && (
                <div className="space-y-3">
                  <div className="h-14 w-full animate-pulse bg-sand/5" />
                  <div className="h-14 w-full animate-pulse bg-sand/5" />
                </div>
              )}

              {!optionsLoading && options.length === 0 && (
                <div className="space-y-3">
                  <p className="font-primary text-sm text-sand/60">
                    {t("noShippingOptions")}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadOptions()}
                    className="border border-sand/20 px-5 py-2.5 font-primary text-sm text-sand/70 transition-colors hover:border-gold/50 hover:text-gold"
                  >
                    {t("retryShipping")}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center justify-between gap-4 border px-4 py-4 transition-colors ${
                      selectedOption === option.id
                        ? "border-gold bg-gold/10"
                        : "border-sand/15 hover:border-gold/40"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping-option"
                        value={option.id}
                        checked={selectedOption === option.id}
                        onChange={() => setSelectedOption(option.id)}
                        className="accent-[#cd9e61]"
                      />
                      <span className="font-primary text-sm text-sand">
                        {option.name}
                      </span>
                    </span>
                    <span className="font-secondary text-sm text-gold">
                      {formatPrice(
                        option.amount ?? 0,
                        option.currency_code ?? currencyCode,
                        storeLocale
                      )}
                    </span>
                  </label>
                ))}
              </div>

              {error && (
                <p className="font-primary text-sm text-gold">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="border border-sand/20 px-6 py-3 font-primary text-sm text-sand/70 transition-colors hover:border-gold/50 hover:text-gold"
                >
                  {t("back")}
                </button>
                <button
                  type="submit"
                  disabled={loading || optionsLoading}
                  className="flex-1 border border-gold bg-gold px-6 py-4 font-primary text-base font-bold text-royal-navy transition-colors hover:bg-sand disabled:opacity-60"
                >
                  {t("continueToPayment")}
                </button>
              </div>
            </form>
          )}

          {step === "payment" && checkout && (
            <div className="space-y-5">
              <h2 className="font-primary text-xl text-sand">
                {t("paymentTitle")}
              </h2>

              <div className="flex items-baseline justify-between border-b border-sand/10 pb-4">
                <span className="font-primary text-sm text-sand/60">
                  {t("total")}
                </span>
                <span className="font-secondary text-xl text-gold">
                  {formatPrice(total, currencyCode, storeLocale)}
                </span>
              </div>

              {!checkout.client_secret || !stripe ? (
                <p className="font-primary text-sm text-gold">
                  {t("paymentNotConfigured")}
                </p>
              ) : (
                <Elements
                  stripe={stripe}
                  options={{ clientSecret: checkout.client_secret }}
                >
                  <StripePaymentForm
                    amount={total}
                    currencyCode={currencyCode}
                    storeLocale={storeLocale}
                    error={error}
                    loading={loading}
                    payLabel={t("pay")}
                    processingLabel={t("processing")}
                    backLabel={t("back")}
                    onBack={() => setStep("shipping")}
                    onError={setError}
                    onLoading={setLoading}
                    onFinalize={finalizeOrder}
                  />
                </Elements>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

const inputClass =
  "w-full border border-sand/20 bg-royal-navy/60 px-4 py-3 font-primary text-sm text-sand placeholder:text-sand/35 focus:border-gold focus:outline-none"

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-primary text-sm text-sand/60">
        {label}
      </span>
      {children}
    </label>
  )
}
