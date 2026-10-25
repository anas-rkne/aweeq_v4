"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import type { Product } from "@/types"
import { normalizeImageUrl } from "@/lib/format"

interface ProductGalleryProps {
  product: Product
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const t = useTranslations("Product")
  const images = useMemo(() => {
    const seen = new Set<string>()
    const list: Array<{ id: string; url: string; alt: string }> = []

    const add = (id: string, rawUrl: string | null, alt: string) => {
      const url = normalizeImageUrl(rawUrl)
      if (!url || seen.has(url)) {
        return
      }
      seen.add(url)
      list.push({ id, url, alt })
    }

    add("thumbnail", product.thumbnail, product.title)

    for (const media of product.media ?? []) {
      add(media.id, media.url, media.alt || product.title)
    }

    for (const image of product.images ?? []) {
      add(image.id, image.url, product.title)
    }

    return list
  }, [product])

  const [activeIndex, setActiveIndex] = useState(0)
  const active = images[activeIndex] ?? null

  if (!active) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-navy-800">
        <span className="font-primary text-3xl text-gold/30">3WEEQ</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden bg-navy-800">
        <Image
          key={active.url}
          src={active.url}
          alt={active.alt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={t("galleryImage", { index: index + 1 })}
              aria-pressed={index === activeIndex}
              className={`relative aspect-square overflow-hidden bg-navy-800 transition-all duration-300 ${
                index === activeIndex
                  ? "ring-1 ring-gold"
                  : "opacity-55 hover:opacity-100"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                className="object-cover"
                sizes="20vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
