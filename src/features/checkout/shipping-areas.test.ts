import { describe, expect, it } from "vitest"
import {
  ABU_DHABI,
  ABU_DHABI_AREA_GROUPS,
  SHIPPING_STANDARD,
  SHIPPING_WESTERN,
  isWesternRegion,
  shippingFeeFor,
} from "./shipping-areas"

describe("shipping zones", () => {
  it("charges 35 AED to the standard emirates", () => {
    expect(shippingFeeFor("دبي", "البرشاء")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("الشارقة", "المجاز")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("عجمان", "الراشدية")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("أم القيوين", "السلامة")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("رأس الخيمة", "النخيل")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("الفجيرة", "دبا")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("أبوظبي", "مدينة خليفة")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("أبوظبي", "العين")).toBe(SHIPPING_STANDARD)
  })

  it("charges 50 AED to every listed Western Region and outer Al Ain area", () => {
    const listed = ABU_DHABI_AREA_GROUPS.flatMap((group) => group.areas)

    for (const area of listed) {
      expect(shippingFeeFor(ABU_DHABI, area.ar), area.ar).toBe(
        SHIPPING_WESTERN
      )
      expect(shippingFeeFor(ABU_DHABI, area.en), area.en).toBe(
        SHIPPING_WESTERN
      )
    }
  })

  it("matches an area typed without hamza, taa marbuta or diacritics", () => {
    expect(shippingFeeFor(ABU_DHABI, "ام الاشطان")).toBe(SHIPPING_WESTERN)
    expect(shippingFeeFor(ABU_DHABI, "بدع المطاوعه")).toBe(SHIPPING_WESTERN)
    expect(shippingFeeFor(ABU_DHABI, "ليوا")).toBe(SHIPPING_WESTERN)
    expect(shippingFeeFor(ABU_DHABI, "سويحان")).toBe(SHIPPING_WESTERN)
  })

  it("still catches the regional words used before the dropdown", () => {
    expect(isWesternRegion(ABU_DHABI, "الظفرة")).toBe(true)
    expect(isWesternRegion(ABU_DHABI, "أطراف العين")).toBe(true)
    expect(isWesternRegion("دبي", "البرشاء")).toBe(false)
  })
})
