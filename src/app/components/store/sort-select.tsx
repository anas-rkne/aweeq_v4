"use client"

import { useSearchParams } from "next/navigation"
import { usePathname, useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

/* A native select, because the reference's sort control is one too: it keeps
   the platform picker on a phone and needs no custom listbox. */
export function SortSelect({ value }: { value: string }) {
  const t = useTranslations("Store")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("offset")
    params.set("sort", next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="store-sort"
        className="font-primary text-[11px] uppercase tracking-[0.12em] text-sand/50"
      >
        {t("sort")}
      </label>
      <select
        id="store-sort"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-[var(--store-radius-sm)] border border-sand/15 bg-royal-navy px-3 font-primary text-[13px] text-sand/80 transition-colors duration-200 hover:border-sand/30 focus:border-gold focus:outline-none"
      >
        <option value="newest" className="bg-royal-navy text-sand">
          {t("sortNewest")}
        </option>
        <option value="price_asc" className="bg-royal-navy text-sand">
          {t("sortPriceAsc")}
        </option>
        <option value="price_desc" className="bg-royal-navy text-sand">
          {t("sortPriceDesc")}
        </option>
      </select>
    </div>
  )
}
