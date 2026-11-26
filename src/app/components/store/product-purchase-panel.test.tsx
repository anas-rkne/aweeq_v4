// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { Product } from "@/types"
import { ProductPurchasePanel } from "./product-purchase-panel"

vi.mock("./cart-provider", () => ({
  useCart: () => ({ addItem: vi.fn(), isAdding: false }),
}))

vi.mock("@/lib/meta-pixel", () => ({
  identifyMetaUser: vi.fn(),
  trackAddToCart: vi.fn(),
  trackLead: vi.fn(),
  trackViewContent: vi.fn(),
}))

const messages = {
  Product: {
    addToCart: "أضف إلى السلة",
    adding: "جارٍ الإضافة...",
    unavailable: "غير متوفر",
    outOfStock: "نفدت الكمية",
    comingSoon: "سيتوفّر قريباً",
    soldOutNote: "نُفدت الدفعة الحالية. اترك بريدك.",
    notifyMe: "أعلمني عند التوفّر",
    notifySending: "جارٍ الحفظ...",
    notifyPlaceholder: "بريدك الإلكتروني",
    notifySuccess: "حفظنا بريدك.",
    notifyError: "تعذّر حفظ بريدك.",
    notifyInvalid: "أدخل بريداً إلكترونياً صحيحاً.",
    decrease: "تقليل الكمية",
    increase: "زيادة الكمية",
    size: "الحجم",
    concentration: "التركيز",
    sku: "الرمز",
    edition: "الإصدار",
    handNumbered: "مرقّم يدوياً",
    numberedPieces: "{count} قطعة مرقّمة",
    maxPurchase: "يمكن شراء {count} قطع كحد أقصى.",
    shippingTaxesNote: "الأسعار شاملة الضريبة.",
    variant: "الحجم / الخيار",
  },
}

function makeProduct(inStock: boolean): Product {
  const variant = {
    id: "var_1",
    title: "100 ml",
    sku: "RAFID-100",
    in_stock: inStock,
    stock_quantity: inStock ? 5 : 0,
    manage_inventory: true,
    allow_backorder: false,
    is_serialized: false,
    available_serial_units: null,
    concentration: null,
    packaging: null,
    edition_size: null,
    size_ml: 100,
    metadata: {},
    price: { amount: 400, currency_code: "aed" },
  }

  return {
    id: "prod_rafid",
    handle: "rafid",
    title: "رافد",
    subtitle: null,
    short_description: null,
    description: null,
    story: null,
    ingredients: null,
    ritual: null,
    seo_title: null,
    seo_description: null,
    status: "published",
    thumbnail: null,
    media: [],
    images: [],
    variants: [variant],
    default_variant: variant,
    price_range: { min: 400, max: 400 },
    max_per_customer: null,
    is_serialized: false,
    is_limited: false,
    edition_size: null,
    civilization: null,
    collection: null,
    product_type: null,
    olfactory_pyramid: null,
  } as unknown as Product
}

function renderPanel(inStock: boolean) {
  return render(
    <NextIntlClientProvider locale="ar" messages={messages}>
      <ProductPurchasePanel product={makeProduct(inStock)} />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe("ProductPurchasePanel sold-out state", () => {
  test("replaces the buy row with the waiting-list form", () => {
    renderPanel(false)

    expect(screen.getByText("نفدت الكمية")).toBeTruthy()
    expect(screen.getByText("سيتوفّر قريباً")).toBeTruthy()
    expect(screen.queryByText("أضف إلى السلة")).toBeNull()
    expect(
      screen.getByRole("button", { name: "أعلمني عند التوفّر" })
    ).toBeTruthy()
  })

  test("keeps the normal buy row while the piece is in stock", () => {
    renderPanel(true)

    expect(screen.getByText("أضف إلى السلة")).toBeTruthy()
    expect(screen.queryByText("سيتوفّر قريباً")).toBeNull()
    expect(
      screen.queryByRole("button", { name: "أعلمني عند التوفّر" })
    ).toBeNull()
  })

  test("posts a restock signup tagged with the product handle", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal("fetch", fetchMock)

    renderPanel(false)

    fireEvent.change(screen.getByPlaceholderText("بريدك الإلكتروني"), {
      target: { value: "buyer@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "أعلمني عند التوفّر" }))

    await waitFor(() => {
      expect(screen.getByText("حفظنا بريدك.")).toBeTruthy()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/newsletter")
    expect(JSON.parse(String(init.body))).toEqual({
      email: "buyer@example.com",
      locale: "ar",
      source: "restock:rafid",
    })
  })

  test("refuses an invalid address without calling the API", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    renderPanel(false)

    fireEvent.change(screen.getByPlaceholderText("بريدك الإلكتروني"), {
      target: { value: "not-an-email" },
    })
    fireEvent.click(screen.getByRole("button", { name: "أعلمني عند التوفّر" }))

    expect(screen.getByText("أدخل بريداً إلكترونياً صحيحاً.")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("clears the complaint as soon as the shopper types", () => {
    renderPanel(false)

    fireEvent.click(screen.getByRole("button", { name: "أعلمني عند التوفّر" }))
    expect(screen.getByText("أدخل بريداً إلكترونياً صحيحاً.")).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText("بريدك الإلكتروني"), {
      target: { value: "a" },
    })

    expect(screen.queryByText("أدخل بريداً إلكترونياً صحيحاً.")).toBeNull()
  })
})
