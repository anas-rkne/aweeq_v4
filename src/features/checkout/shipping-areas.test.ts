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
  it("charges 35 AED in every emirate, including Hatta", () => {
    expect(shippingFeeFor("دبي", "البرشاء")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("دبي", "حتا")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("الشارقة", "المجاز")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("عجمان", "الراشدية")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("أم القيوين", "السلامة")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("رأس الخيمة", "النخيل")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor("الفجيرة", "دبا")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor(ABU_DHABI, "مدينة خليفة")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor(ABU_DHABI, "العين")).toBe(SHIPPING_STANDARD)
    expect(shippingFeeFor(ABU_DHABI, "أبوظبي")).toBe(SHIPPING_STANDARD)
  })

  it("charges exactly the fee printed on each group of the courier sheet", () => {
    for (const group of ABU_DHABI_AREA_GROUPS) {
      expect(group.areas.length, group.ar).toBeGreaterThan(0)

      for (const area of group.areas) {
        expect(shippingFeeFor(ABU_DHABI, area.ar), area.ar).toBe(group.fee)
        expect(shippingFeeFor(ABU_DHABI, area.en), area.en).toBe(group.fee)
      }
    }
  })

  it("holds the full Western Region and remote Al Ain list", () => {
    const remote = ABU_DHABI_AREA_GROUPS.filter(
      (group) => group.fee === SHIPPING_WESTERN
    ).flatMap((group) => group.areas.map((area) => area.ar))

    expect(remote).toEqual([
      "بدع زايد",
      "ليوا",
      "المرفأ",
      "الرويس",
      "غياثي",
      "السلع",
      "بدع المطاوعة",
      "أم الأشطان",
      "الوقن",
      "القوع",
      "بوكرية",
      "ناهل",
      "سويحان",
      "الساد",
      "أبو سمرة",
      "الختم",
      "الخزنة",
      "رماح",
      "الظاهرة",
      "سيح اللحمة",
      "الفاية",
    ])
  })

  it("matches an area typed without hamza, taa marbuta or diacritics", () => {
    expect(shippingFeeFor(ABU_DHABI, "ام الاشطان")).toBe(SHIPPING_WESTERN)
    expect(shippingFeeFor(ABU_DHABI, "أم الاشطان")).toBe(SHIPPING_WESTERN)
    expect(shippingFeeFor(ABU_DHABI, "بدع المطاوعه")).toBe(SHIPPING_WESTERN)
    expect(shippingFeeFor(ABU_DHABI, "سيح اللحمه")).toBe(SHIPPING_WESTERN)
    expect(shippingFeeFor(ABU_DHABI, "الفايه")).toBe(SHIPPING_WESTERN)
    expect(shippingFeeFor(ABU_DHABI, "ابو سمره")).toBe(SHIPPING_WESTERN)
  })

  it("still catches the regional words used before the dropdown", () => {
    expect(isWesternRegion(ABU_DHABI, "الظفرة")).toBe(true)
    expect(isWesternRegion(ABU_DHABI, "المنطقة الغربية")).toBe(true)
    expect(isWesternRegion(ABU_DHABI, "أطراف العين")).toBe(true)
    expect(isWesternRegion(ABU_DHABI, "Al Dhafra")).toBe(true)
  })

  it("never applies the remote fee outside Abu Dhabi", () => {
    expect(isWesternRegion("دبي", "ليوا")).toBe(false)
    expect(isWesternRegion("الشارقة", "المنطقة الغربية")).toBe(false)
    expect(shippingFeeFor("دبي", "الظفرة")).toBe(SHIPPING_STANDARD)
  })
})
