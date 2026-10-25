"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"

const SUGGESTIONS = [
  { key: "fragrances", href: "/products?product_type=fragrance" },
  { key: "incense", href: "/products?product_type=incense" },
  { key: "all", href: "/products" },
  { key: "collections", href: "/collections" },
] as const

export function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const t = useTranslations("Search")
  const router = useRouter()
  const [term, setTerm] = useState("")
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 40)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab" || !panelRef.current) return

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
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

    document.addEventListener("keydown", onKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", onKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  function goToProducts(query: string) {
    const trimmed = query.trim()
    router.push(
      trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products"
    )
    setTerm("")
    onClose()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    goToProducts(term)
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-royal-navy/80 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        className="absolute inset-x-0 top-0 mx-auto w-full max-w-2xl border-b border-sand/15 bg-navy-950 px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:px-8"
      >
        <div className="flex items-center justify-between">
          <h2
            id="search-modal-title"
            className="font-primary text-lg text-sand"
          >
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="p-1 text-sand/55 transition-colors hover:text-gold"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="square"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex items-stretch border border-sand/20 bg-navy-900"
        >
          <label htmlFor="search-modal-input" className="sr-only">
            {t("label")}
          </label>
          <input
            ref={inputRef}
            id="search-modal-input"
            name="q"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 font-primary text-sm text-sand placeholder:text-sand/35 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 bg-gold px-5 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand"
          >
            {t("submit")}
          </button>
        </form>

        <div className="mt-5">
          <p className="font-secondary text-[11px] tracking-[0.2em] text-sand/40">
            {t("suggested")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTerm("")
                  onClose()
                  router.push(item.href)
                }}
                className="border border-sand/15 px-3 py-1.5 font-primary text-xs text-sand/70 transition-colors hover:border-gold/50 hover:text-gold"
              >
                {t(`suggestions.${item.key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
