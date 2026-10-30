import { getTranslations } from "next-intl/server"
import { Hash, Lock, RotateCcw, Truck } from "lucide-react"
import { Link } from "@/i18n/navigation"

/* Four plain promises under the catalogue — the row that closes the page in the
   reference. Two of them are real doors into the policy pages. */
export async function TrustRow() {
  const t = await getTranslations("Store")

  const items = [
    {
      key: "shipping",
      icon: Truck,
      href: "/policies/shipping",
    },
    {
      key: "returns",
      icon: RotateCcw,
      href: "/policies/returns",
    },
    { key: "payment", icon: Lock, href: undefined },
    { key: "numbering", icon: Hash, href: undefined },
  ] as const

  return (
    <section className="px-5 pt-12 md:px-10 lg:px-16">
      <div className="mx-auto grid max-w-[84rem] grid-cols-2 gap-4 rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-5 sm:grid-cols-4 sm:p-6">
        {items.map((item) => {
          const Icon = item.icon
          const body = (
            <>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-gold">
                <Icon className="h-5 w-5" strokeWidth={1.2} aria-hidden="true" />
              </span>
              <span className="mt-3 block font-primary text-[13px] font-bold leading-5 text-sand">
                {t(`trust.${item.key}.title`)}
              </span>
              <span className="mt-1 block font-primary text-[11px] leading-5 text-sand/60">
                {t(`trust.${item.key}.body`)}
              </span>
            </>
          )

          return item.href ? (
            <Link
              key={item.key}
              href={item.href}
              className="group block rounded-[var(--store-radius-sm)] transition-colors duration-200"
            >
              <span className="block transition-colors duration-200 group-hover:text-gold">
                {body}
              </span>
            </Link>
          ) : (
            <div key={item.key}>{body}</div>
          )
        })}
      </div>
    </section>
  )
}
