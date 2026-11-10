/**
 * Delivery zones and their fees.
 *
 * Topex collects 35 AED across the UAE and 50 AED for two zones: the Western
 * Region of Abu Dhabi and the outer areas of Al Ain. The customer never picks
 * a fee — the checkout reads the emirate and the area and picks the matching
 * shipping option by itself, so the only way to land on 50 is to actually live
 * in one of those zones.
 *
 * Medusa prices shipping per option, not per address, so "automatic" here
 * means selecting the right existing option from the address. The keyword
 * match is kept as a safety net for the free-text «other» field and for any
 * order whose address arrives without a dropdown value.
 */

export const SHIPPING_STANDARD = 35
export const SHIPPING_WESTERN = 50

/** The emirate value used in the checkout and stored on the order. */
export const ABU_DHABI = "أبوظبي"

/** Sentinel for «my area is not in the list» in the Abu Dhabi dropdown. */
export const OTHER_AREA = "__other__"

export type AreaEntry = { ar: string; en: string }

export type AreaGroup = {
  ar: string
  en: string
  fee: number
  areas: AreaEntry[]
}

/** The zones Topex prices at 50 AED, plus the two 35 AED city zones, grouped
 *  the way their sheet lists them. */
export const ABU_DHABI_AREA_GROUPS: AreaGroup[] = [
  {
    ar: "أبوظبي — المنطقة الغربية",
    en: "Abu Dhabi — Western Region",
    fee: SHIPPING_WESTERN,
    areas: [
      { ar: "بدع زايد", en: "Bida Zayed" },
      { ar: "ليوا", en: "Liwa" },
      { ar: "المرفأ", en: "Al Mirfa" },
      { ar: "الرويس", en: "Al Ruwais" },
      { ar: "غياثي", en: "Ghayathi" },
      { ar: "السلع", en: "Al Sila" },
      { ar: "بدع المطاوعة", en: "Bida Al Mutawa" },
      { ar: "أم الأشطان", en: "Umm Al Ashtan" },
    ],
  },
  {
    ar: "العين — المناطق البعيدة",
    en: "Al Ain — Remote Areas",
    fee: SHIPPING_WESTERN,
    areas: [
      { ar: "الوقن", en: "Al Wagan" },
      { ar: "القوع", en: "Al Qua'a" },
      { ar: "بوكرية", en: "Bu Kariya" },
      { ar: "ناهل", en: "Nahil" },
      { ar: "سويحان", en: "Sweihan" },
      { ar: "الساد", en: "Al Saad" },
      { ar: "أبو سمرة", en: "Abu Samra" },
      { ar: "الختم", en: "Al Khatm" },
      { ar: "الخزنة", en: "Al Khazna" },
      { ar: "رماح", en: "Rimah" },
      { ar: "الظاهرة", en: "Al Dhahra" },
      { ar: "سيح اللحمة", en: "Seeh Al Lahma" },
      { ar: "الفاية", en: "Al Fayah" },
    ],
  },
  {
    ar: "أبوظبي والعين — باقي المناطق",
    en: "Abu Dhabi & Al Ain — Other Areas",
    fee: SHIPPING_STANDARD,
    areas: [
      { ar: "أبوظبي", en: "Abu Dhabi" },
      { ar: "العين", en: "Al Ain" },
    ],
  },
]

/** Every 50 AED name, Arabic and Latin, used for free-text matching. */
const WESTERN_KEYWORDS = [
  ...ABU_DHABI_AREA_GROUPS.filter(
    (group) => group.fee === SHIPPING_WESTERN
  ).flatMap((group) => group.areas.flatMap((area) => [area.ar, area.en])),
  /* regional words that stand for the same zones */
  "الظفرة",
  "الغربية",
  "أطراف العين",
  "اطراف العين",
  "Al Dhafra",
  "Western Region",
  "Remote Areas",
]

/** Strip Arabic diacritics and unify alef/ta/ya so "أطراف العين" matches "اطراف العين". */
export function normalizeArea(value: string) {
  return value
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function isWesternRegion(emirate: string, area: string) {
  /* Both 50 AED zones sit inside the emirate of Abu Dhabi. Checking the
     emirate first keeps an area name that exists elsewhere — or a stray
     «ليوا» typed against Dubai — from picking the remote fee. */
  const emirateKey = normalizeArea(emirate)
  if (emirateKey !== normalizeArea(ABU_DHABI) && emirateKey !== "abu dhabi") {
    return false
  }

  const haystack = normalizeArea(`${area} ${emirate}`)
  return WESTERN_KEYWORDS.some((keyword) =>
    haystack.includes(normalizeArea(keyword))
  )
}

/** The delivery fee for an address, in AED. */
export function shippingFeeFor(emirate: string, area: string) {
  return isWesternRegion(emirate, area) ? SHIPPING_WESTERN : SHIPPING_STANDARD
}
