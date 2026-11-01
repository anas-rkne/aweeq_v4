// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { ProductPackagingGallery } from "./product-packaging-gallery"

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt?: string }) =>
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} />,
}))

const messages = {
  Product: {
    galleryImage: "عرض الصورة {index}",
    packagingTitle: "التغليف",
    closeGallery: "إغلاق المعرض",
    prevImage: "الصورة السابقة",
    nextImage: "الصورة التالية",
  },
}

const images = [
  { id: "a", url: "/images/1.webp", alt: "العلبة" },
  { id: "b", url: "/images/2.webp", alt: "الغلاف" },
  { id: "c", url: "/images/3.webp", alt: "التفاصيل" },
]

function renderGallery() {
  return render(
    <NextIntlClientProvider locale="ar" messages={messages}>
      <ProductPackagingGallery images={images} title="رافد" />
    </NextIntlClientProvider>
  )
}

describe("ProductPackagingGallery", () => {
  test("renders one button per image", () => {
    renderGallery()
    expect(screen.getAllByRole("button", { name: /عرض الصورة/ })).toHaveLength(3)
  })

  test("opens the lightbox and navigates with arrows", () => {
    renderGallery()
    fireEvent.click(screen.getByRole("button", { name: "عرض الصورة 2" }))

    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeTruthy()
    expect(screen.getByText(/رافد — 2 \/ 3/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "الصورة التالية" }))
    expect(screen.getByText(/رافد — 3 \/ 3/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "الصورة السابقة" }))
    expect(screen.getByText(/رافد — 2 \/ 3/)).toBeTruthy()
  })

  test("closes the lightbox on Escape", () => {
    renderGallery()
    fireEvent.click(screen.getByRole("button", { name: "عرض الصورة 1" }))
    expect(screen.getByRole("dialog")).toBeTruthy()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  test("closes the lightbox with the close button", () => {
    renderGallery()
    fireEvent.click(screen.getByRole("button", { name: "عرض الصورة 3" }))
    fireEvent.click(screen.getByRole("button", { name: "إغلاق المعرض" }))
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
