import { Link } from "@/i18n/navigation"

export function SectionHeader({
  title,
  note,
  href,
  cta,
  id,
}: {
  title: string
  note?: string
  href?: string
  cta?: string
  id?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2
          id={id}
          className="font-primary text-h3 font-bold leading-tight text-sand"
        >
          {title}
        </h2>
        {note && (
          <p className="mt-2 font-primary text-small text-sand/60">{note}</p>
        )}
      </div>

      {href && cta && (
        <Link
          href={href}
          className="group inline-flex min-h-11 items-center gap-2 font-primary text-small text-gold transition-colors duration-200 hover:text-sand"
        >
          {cta}
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:-translate-x-1"
          >
            ←
          </span>
        </Link>
      )}
    </div>
  )
}
