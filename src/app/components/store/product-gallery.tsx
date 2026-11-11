"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import type { Product } from "@/types"
import { normalizeImageUrl } from "@/lib/format"

interface ProductGalleryProps {
  product: Product
}

/* The file provider stores an upload as `{timestamp}-{original name}.{ext}`,
   so the same photograph re-encoded (png ↔ webp) or re-uploaded keeps the same
   name under a new timestamp. This returns that stable name, so the gallery can
   tell "the cover again" from "a different shot". */
function mediaIdentity(rawUrl: string | null | undefined) {
  const url = normalizeImageUrl(rawUrl)
  if (!url) {
    return null
  }

  const segment = (url.split("?")[0].split("/").pop() ?? url)
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .replace(/^\d+-/, "")

  return segment || null
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const t = useTranslations("Product")
  const images = useMemo(() => {
    const coverUrl = normalizeImageUrl(product.thumbnail)
    const coverIdentity = mediaIdentity(coverUrl)
    const seen = new Set<string>()
    const list: Array<{ id: string; url: string; alt: string }> = []

    /* the cover is the plate, not a gallery thumbnail */
    if (coverUrl) {
      seen.add(coverUrl)
      list.push({ id: "thumbnail", url: coverUrl, alt: product.title })
    }

    const add = (id: string, rawUrl: string | null, alt: string) => {
      const url = normalizeImageUrl(rawUrl)
      if (!url || seen.has(url)) {
        return
      }
      /* a re-encoded copy of the cover (png ↔ webp) is still the cover */
      if (coverIdentity && mediaIdentity(rawUrl) === coverIdentity) {
        return
      }
      seen.add(url)
      list.push({ id, url, alt })
    }

    for (const media of product.media ?? []) {
      // packaging shots live in their own wall (see product-packaging-gallery),
      // the hero-2 transparent cut-out belongs to the store invitation, and the
      // `hero` row is the cover itself — none belongs in the main gallery
      if (
        media.role === "packaging" ||
        media.role === "video" ||
        media.role === "float" ||
        media.role === "hero"
      ) {
        continue
      }
      add(media.id, media.url, media.alt || product.title)
    }

    for (const image of product.images ?? []) {
      add(image.id, image.url, product.title)
    }

    /* the house keeps the plate to three photographs */
    return list.slice(0, 3)
  }, [product])

  const [activeIndex, setActiveIndex] = useState(0)
  const active = images[activeIndex] ?? null

  if (!active) {
    return (
      <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-2">
        <div className="flex aspect-square w-full items-center justify-center rounded-[calc(var(--store-radius)-0.25rem)] bg-[var(--store-well)]">
          <span className="font-primary text-3xl text-royal-navy/30">
            3WEEQ
          </span>
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
            preload
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
