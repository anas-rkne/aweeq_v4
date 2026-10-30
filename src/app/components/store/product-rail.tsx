"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Product } from "@/types"
import { ProductCard } from "./product-card"

/* A rail is the reference's product carousel: a snapped track and two round
   buttons. No library, no autoplay, works with a keyboard and a thumb. */
export function ProductRail({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const isRtl = useLocale() === "ar"
  const t = useTranslations("Store")
  const NextIcon = isRtl ? ChevronLeft : ChevronRight
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const amount = Math.max(track.clientWidth * 0.75, 280)
    track.scrollBy({
      left: direction * amount * (isRtl ? -1 : 1),
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <li
            key={product.id}
            className="w-[68%] shrink-0 snap-start sm:w-[44%] lg:w-[calc((100%-4rem)/5)]"
          >
            <ProductCard product={product} />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={t("prev")}
        className="absolute start-0 top-[38%] hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-sand/15 bg-royal-navy/85 text-sand/80 backdrop-blur-sm transition-colors duration-200 hover:border-gold/50 hover:text-gold sm:grid"
      >
        <PrevIcon className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={t("next")}
        className="absolute end-0 top-[38%] hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-sand/15 bg-royal-navy/85 text-sand/80 backdrop-blur-sm transition-colors duration-200 hover:border-gold/50 hover:text-gold sm:grid"
      >
        <NextIcon className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
      </button>
    </div>
  )
}
