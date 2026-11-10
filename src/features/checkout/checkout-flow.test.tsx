// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { formatPrice } from "@/lib/format"
import ar from "../../../messages/ar.json"
import { CheckoutFlow } from "./checkout-flow"
import { initCheckout, prepareCheckout } from "./api"

vi.mock("./api", () => ({
  fetchShippingOptions: vi.fn(),
  prepareCheckout: vi.fn(),
  initCheckout: vi.fn(),
}))

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/app/components/store/cart-provider", () => ({
  useCart: () => ({
    status: "ready",
    cart: {
      id: "cart_test",
      currency_code: "aed",
      subtotal: 400,
      shipping_total: 0,
      total: 400,
      items: [
        {
          id: "item_1",
          product_title: "رافد",
          variant_title: "100 ml",
          quantity: 1,
          total: 400,
        },
      ],
    },
  }),
}))

const options = [
  {
    id: "so_standard",
    name: "توصيل 35",
    price_type: "flat",
    provider_id: null,
    amount: 35,
    currency_code: "aed",
  },
  {
    id: "so_remote",
    name: "توصيل 50",
    price_type: "flat",
    provider_id: null,
    amount: 50,
    currency_code: "aed",
  },
]

const messages = { Checkout: ar.Checkout }

/* Intl inserts bidi marks and non-breaking spaces; compare the visible text. */
function cleanText(value: string | null) {
  return (value ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function expectFee(element: HTMLElement, amount: number) {
  expect(cleanText(element.textContent)).toContain(
    cleanText(formatPrice(amount, "aed", "ar"))
  )
}

function renderCheckout() {
  return render(
    <NextIntlClientProvider locale="ar" messages={messages}>
      <CheckoutFlow />
    </NextIntlClientProvider>
  )
}

/** Fill the address step without leaving it, so its fee line can be checked. */
function fillDetails(emirate: string, area: string) {
  fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
    target: { value: "test@3weeq.ae" },
  })
  fireEvent.change(screen.getByLabelText("الاسم الكامل"), {
    target: { value: "محمد أحمد" },
  })
  fireEvent.change(screen.getByLabelText("رقم الجوال"), {
    target: { value: "0501234567" },
  })
  fireEvent.change(screen.getByLabelText("العنوان"), {
    target: { value: "شارع 1، فيلا 2" },
  })
  fireEvent.change(screen.getByLabelText("الإمارة"), {
    target: { value: emirate },
  })
  fireEvent.change(screen.getByLabelText("المنطقة"), {
    target: { value: area },
  })
}

async function submitDetails() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }))
  })
}

async function submitPayment() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "متابعة للدفع" }))
  })
}

describe("CheckoutFlow delivery zones", () => {
  beforeEach(() => {
    vi.mocked(prepareCheckout).mockResolvedValue({
      cart_id: "cart_test",
      locale: "ar",
      shipping_options: options,
      cart: {},
    })
    vi.mocked(initCheckout).mockResolvedValue({
      cart_id: "cart_test",
      payment_collection_id: "paycol_test",
      payment_session_id: "payses_test",
      provider_id: "pp_stripe_stripe",
      redirect_url: null,
      client_secret: null,
      amount: 400,
      currency_code: "aed",
      authorized: false,
      cart: {},
    })
  })

  test("shows every Abu Dhabi area in its courier group, with the fee", () => {
    renderCheckout()

    fireEvent.change(screen.getByLabelText("الإمارة"), {
      target: { value: "أبوظبي" },
    })

    const areaSelect = screen.getByLabelText("المنطقة")
    const groups = areaSelect.querySelectorAll("optgroup")

    expect(groups).toHaveLength(3)
    expect(groups[0].label).toContain("المنطقة الغربية")
    expect(groups[0].label).toContain("50")
    expect(groups[0].querySelectorAll("option")).toHaveLength(8)
    expect(groups[1].label).toContain("المناطق البعيدة")
    expect(groups[1].querySelectorAll("option")).toHaveLength(13)
    expect(groups[2].label).toContain("باقي المناطق")
    expect(groups[2].label).toContain("35")
    expect(groups[2].querySelectorAll("option")).toHaveLength(2)
  })

  test("prices a Western Region area at 50 and sends the 50 option", async () => {
    renderCheckout()
    fillDetails("أبوظبي", "ليوا")

    expectFee(screen.getByText(/رسوم التوصيل لهذه المنطقة/), 50)

    await submitDetails()

    expect(prepareCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        shipping_address: expect.objectContaining({
          city: "ليوا",
          province: "أبوظبي",
        }),
      })
    )

    expectFee((await screen.findByText(/التوصيل إلى ليوا/)).parentElement!, 50)

    await submitPayment()

    expect(initCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ shipping_option_id: "so_remote" })
    )
  })

  test("prices a remote Al Ain area at 50", async () => {
    renderCheckout()
    fillDetails("أبوظبي", "سويحان")

    expectFee(screen.getByText(/رسوم التوصيل لهذه المنطقة/), 50)
    expect(initCheckout).not.toHaveBeenCalled()
  })

  test("prices Al Ain city at 35", async () => {
    renderCheckout()
    fillDetails("أبوظبي", "العين")

    expectFee(screen.getByText(/رسوم التوصيل لهذه المنطقة/), 35)
  })

  test("prices an area typed under «other» by its own name", async () => {
    renderCheckout()

    fireEvent.change(screen.getByLabelText("الإمارة"), {
      target: { value: "أبوظبي" },
    })
    fireEvent.change(screen.getByLabelText("المنطقة"), {
      target: { value: "__other__" },
    })

    const custom = screen.getByLabelText("اسم المنطقة")

    fireEvent.change(custom, { target: { value: "الظفرة" } })
    expectFee(screen.getByText(/رسوم التوصيل لهذه المنطقة/), 50)

    fireEvent.change(custom, { target: { value: "مدينة خليفة" } })
    expectFee(screen.getByText(/رسوم التوصيل لهذه المنطقة/), 35)
  })

  test("prices Hatta, in Dubai, at 35 and sends the 35 option", async () => {
    renderCheckout()
    fillDetails("دبي", "حتا")

    expectFee(screen.getByText(/رسوم التوصيل لهذه المنطقة/), 35)

    await submitDetails()

    expectFee((await screen.findByText(/التوصيل إلى حتا/)).parentElement!, 35)

    await submitPayment()

    expect(initCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ shipping_option_id: "so_standard" })
    )
  })
})
