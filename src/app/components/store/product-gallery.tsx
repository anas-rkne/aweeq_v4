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
      <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-2">
        <div className="flex aspect-square w-full items-center justify-center rounded-[calc(var(--store-radius)-0.25rem)] bg-[var(--store-well)]">
          <span className="font-primary text-3xl text-royal-navy/30">3WEEQ</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* the plate: a light photo well inside a thin surface frame, the same
          card the catalogue uses so the shop reads as one piece */}
      <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-2">
        <div className="relative aspect-square overflow-hidden rounded-[calc(var(--store-radius)-0.25rem)] bg-[var(--store-well)]">
          <Image
            key={active.url}
            src={active.url}
            alt={active.alt}
            fill
            priority
            className="object-cover"
            sizes="(min-width: 64rem) 50vw, 100vw"
          />
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={t("galleryImage", { index: index + 1 })}
              aria-pressed={index === activeIndex}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--store-radius-sm)] border bg-[var(--store-well)] transition-colors duration-200 ${
                index === activeIndex
                  ? "border-gold"
                  : "border-sand/15 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
