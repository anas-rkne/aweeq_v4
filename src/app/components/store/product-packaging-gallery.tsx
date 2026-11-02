"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

export interface PackagingImage {
  id: string
  url: string
  alt: string
}

/* The piece's packaging, as its own little exhibition: a wall of light wells,
   and a tap opens the single image large with prev/next. Every piece shows
   this section — if no packaging shot exists, the piece's other photos stand
   in, so the wall is never empty. */
export function ProductPackagingGallery({
  images,
  title,
}: {
  images: PackagingImage[]
  title: string
}) {
  const t = useTranslations("Product")
  const [active, setActive] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const isOpen = active !== null

  useEffect(() => {
    if (active === null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActive(null)
      } else if (event.key === "ArrowRight") {
        setActive((value) => (value === null ? value : (value + 1) % images.length))
      } else if (event.key === "ArrowLeft") {
        setActive((value) =>
          value === null ? value : (value - 1 + images.length) % images.length
        )
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [active, images.length])

  /* focus management: move focus into the lightbox on open, trap Tab inside,
     and return it to the thumbnail on close. keyed on `isOpen` so navigating
     prev/next never steals focus back to the close button. */
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const focusTimer = window.setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("button")
        ?.focus()
    }, 40)

    function onTab(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null)

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onTab)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener("keydown", onTab)
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  const current = active === null ? null : images[active]

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {images.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-label={t("galleryImage", { index: index + 1 })}
              className="group relative aspect-square w-full overflow-hidden rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-well)] transition-colors duration-300 hover:border-gold/50 focus-visible:border-gold"
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 33vw, 50vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
              <span
                aria-hidden="true"
                className="absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-royal-navy/70 text-sand/80 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M15 3h6v6" />
                  <path d="M21 3l-7 7" />
                  <path d="M9 21H3v-6" />
                  <path d="m3 21 7-7" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("packagingTitle")}
          className="fixed inset-0 z-[110] flex flex-col bg-royal-navy/[0.97]"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-primary text-[12px] text-sand/60">
              {title} — {active! + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label={t("closeGallery")}
              className="grid h-11 w-11 place-items-center text-sand/75 transition-colors duration-200 hover:text-gold"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
            <div className="relative h-full max-h-full w-full max-w-4xl overflow-hidden rounded-[var(--store-radius-sm)] bg-[var(--store-well)]">
              <Image
                key={current.url}
                src={current.url}
                alt={current.alt}
                fill
                className="object-contain"
                sizes="(min-width: 64rem) 56rem, 100vw"
              />
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActive(
                      (value) =>
                        (value! - 1 + images.length) % images.length
                    )
                  }
                  aria-label={t("prevImage")}
                  className="absolute start-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-sand/20 bg-royal-navy/70 text-sand/80 backdrop-blur-sm transition-colors duration-200 hover:border-gold/60 hover:text-gold sm:start-5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-5 w-5 rtl:rotate-180"
                  >
                    <path d="m15 6-6 6 6 6" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActive((value) => (value! + 1) % images.length)
                  }
                  aria-label={t("nextImage")}
                  className="absolute end-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-sand/20 bg-royal-navy/70 text-sand/80 backdrop-blur-sm transition-colors duration-200 hover:border-gold/60 hover:text-gold sm:end-5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-5 w-5 rtl:rotate-180"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
